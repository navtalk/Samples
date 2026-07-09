"""
NavTalk transparent-mode MQTT operator sample.

Customer integration points:
1. MQTT data in: parse_incoming_user_message(...)
2. Custom LLM/business logic: generate_reply_text(...) and stream_reply_text(...)
3. MQTT data out: publish_mqtt_json(...)

Normal users only need:
    python transparent_mqtt_agent.py --api-key YOUR_NAVTALK_PROJECT_API_KEY
"""

import argparse
import base64
import json
import os
import queue
import time
from dataclasses import dataclass
from threading import Event, Thread
from typing import Any, Dict, Iterator, List, Optional, Tuple
from urllib.parse import urlparse

try:
    import requests
except Exception:  # pragma: no cover - keeps --help and local inspection usable
    requests = None


DEFAULT_PLATFORM_URL = "https://api.navtalk.ai"
DEFAULT_TOPIC_PREFIX = "navtalk/transparent"
TOKEN_ENDPOINT_PATH = "/api/open/v1/mqtt/operator-token"
TOKEN_REQUEST_TIMEOUT_SECONDS = 10.0
CONNECT_TIMEOUT_SECONDS = 10.0
PRESENCE_INTERVAL_SECONDS = 5.0
QOS = 0
HISTORY_TURNS = 6
FALLBACK_REPLY = "Sorry, the reply service is not available yet. Please try again later."

DEFAULT_LLM_MODEL = "qwen3:8b"
DEFAULT_LLM_SYSTEM_PROMPT = (
    "You are NavTalk's transparent-mode operator assistant. "
    "Reply directly, briefly, and naturally. Do not output JSON or Markdown."
)
LLM_REQUEST_TIMEOUT_SECONDS = 30.0
LLM_MAX_TOKENS = 256
LLM_TEMPERATURE = 0.7
MAIN_STARTUP_ENV_DEFAULTS = {
    "NAVTALK_API_KEY": "Your API Key",
    "TRANSPARENT_LLM_BASE_URL": "https://api.openai.com/v1",
    "TRANSPARENT_LLM_API_KEY": "Your OpenAI key",
    "TRANSPARENT_LLM_MODEL": "gpt-5.4-mini",
    "TRANSPARENT_LLM_STREAM": "true",
    "TRANSPARENT_LLM_SYSTEM_PROMPT": "You are a helpful voice assistant. Reply clearly and briefly in Chinese.",
    "TRANSPARENT_LLM_TOKEN_LIMIT_PARAM": "",
}


@dataclass
class UserMqttMessage:
    """Normalized MQTT user message from {prefix}/{projectId}/{sessionId}/user."""

    session_id: str
    topic: str
    payload: Dict[str, Any]
    text: str
    trace_id: str
    input_type: str


@dataclass
class ReplyContext:
    """Runtime context passed to replaceable reply hooks."""

    history: List[Dict[str, str]]
    reply_topic: str
    qos: int


@dataclass
class MqttOperatorConfig:
    """Resolved MQTT connection details returned by the NavTalk platform."""

    broker_url: str
    host: str
    port: int
    scheme: str
    websocket_path: str
    project_id: str
    prefix: str
    username: str
    password: str
    qos: int = QOS

    @property
    def use_tls(self) -> bool:
        return self.scheme in {"mqtts", "ssl", "tls", "wss"}

    @property
    def transport(self) -> str:
        return "websockets" if self.scheme in {"ws", "wss"} else "tcp"


def _parse_args(argv: Optional[List[str]] = None):
    parser = argparse.ArgumentParser(
        description=(
            "NavTalk transparent-mode MQTT operator agent. "
            "Only --api-key is required; MQTT broker, topics, and token are resolved automatically."
        )
    )
    parser.add_argument(
        "--api-key",
        nargs="?",
        default=os.getenv("NAVTALK_API_KEY") or "",
        help="NavTalk project API key.",
    )
    return parser.parse_args(argv)


def _platform_url() -> str:
    return (os.getenv("NAVTALK_PLATFORM_URL") or DEFAULT_PLATFORM_URL).rstrip("/")


def _mqtt_token_url() -> str:
    return _join_url(_platform_url(), TOKEN_ENDPOINT_PATH)


def _parse_broker_url(value: str) -> Tuple[str, int, str, str]:
    if not value:
        return "", 0, "", ""
    parsed = urlparse(value if "://" in value else f"mqtt://{value}")
    scheme = (parsed.scheme or "mqtt").lower()
    default_port = _default_broker_port(scheme)
    return parsed.hostname or "", parsed.port or default_port, scheme, parsed.path or ""


def _default_broker_port(scheme: str) -> int:
    normalized = (scheme or "mqtt").lower()
    if normalized == "wss":
        return 443
    if normalized == "ws":
        return 80
    if normalized in {"mqtts", "ssl", "tls"}:
        return 8883
    return 1883


def _join_url(base_url: str, path: str) -> str:
    base = base_url.rstrip("/")
    suffix = path if path.startswith("/") else f"/{path}"
    if base.endswith("/v1") and suffix.startswith("/v1/"):
        suffix = suffix[len("/v1") :]
    return f"{base}{suffix}"


def _strip_bearer(value: str) -> str:
    raw = (value or "").strip()
    return raw[7:].strip() if raw.lower().startswith("bearer ") else raw


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    try:
        return int(value) if value else default
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    try:
        return float(value) if value else default
    except ValueError:
        return default


def _decode_jwt_payload(token: str) -> Dict[str, Any]:
    raw = _strip_bearer(token)
    parts = raw.split(".")
    if len(parts) < 2:
        return {}
    try:
        payload = parts[1] + "=" * (-len(parts[1]) % 4)
        data = base64.urlsafe_b64decode(payload.encode("ascii"))
        parsed = json.loads(data.decode("utf-8"))
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _unwrap_api_result(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise RuntimeError("MQTT token endpoint returned a non-object response")
    if "data" not in payload and "code" not in payload:
        return payload
    code = payload.get("code", 200)
    if str(code) != "200":
        message = payload.get("message") or payload.get("msg") or "MQTT token endpoint rejected the request"
        raise RuntimeError(str(message))
    data = payload.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("MQTT token endpoint returned empty data")
    return data


def _fetch_mqtt_operator_token(api_key: str) -> Dict[str, Any]:
    if requests is None:
        raise RuntimeError('requests is required. Install dependencies with: python -m pip install requests "paho-mqtt>=2.1.0"')
    response = requests.post(
        _mqtt_token_url(),
        headers={"license": api_key},
        timeout=TOKEN_REQUEST_TIMEOUT_SECONDS,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"MQTT token endpoint failed: HTTP {response.status_code}")
    return _unwrap_api_result(response.json())


def _required_text(data: Dict[str, Any], keys: Tuple[str, ...], label: str) -> str:
    for key in keys:
        value = data.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    raise RuntimeError(f"MQTT token endpoint response missing {label}")


def _optional_text(data: Dict[str, Any], keys: Tuple[str, ...], default: str = "") -> str:
    for key in keys:
        value = data.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return default


def _mqtt_config_from_token_response(data: Dict[str, Any]) -> MqttOperatorConfig:
    token = _required_text(data, ("token", "mqttToken", "mqtt_token", "password"), "token")
    claims = _decode_jwt_payload(token)
    broker_url = _required_text(data, ("brokerUrl", "broker_url"), "brokerUrl")
    project_id = _optional_text(data, ("projectId", "project_id"), "")
    project_id = project_id or str(claims.get("projectId") or claims.get("project_id") or claims.get("sub") or "").strip()
    if not project_id:
        raise RuntimeError("MQTT token endpoint response missing projectId")
    prefix = _optional_text(data, ("prefix", "topicPrefix", "topic_prefix"), "")
    prefix = prefix or str(claims.get("topicPrefix") or claims.get("topic_prefix") or DEFAULT_TOPIC_PREFIX).strip()
    prefix = (prefix or DEFAULT_TOPIC_PREFIX).rstrip("/")
    username = _optional_text(data, ("username", "user"), project_id)
    host, port, scheme, websocket_path = _parse_broker_url(broker_url)
    if not host or not port:
        raise RuntimeError("MQTT token endpoint response contains an invalid brokerUrl")
    return MqttOperatorConfig(
        broker_url=broker_url,
        host=host,
        port=port,
        scheme=scheme or "mqtt",
        websocket_path=websocket_path,
        project_id=project_id,
        prefix=prefix,
        username=username,
        password=token,
    )


def _topic_session_id(topic: str, prefix: str, project_id: str) -> str:
    base = f"{prefix.rstrip('/')}/{project_id}/"
    if not topic.startswith(base):
        return ""
    parts = topic[len(base) :].split("/")
    return parts[0] if len(parts) == 2 and parts[1] == "user" else ""


def _listen_topic(config: MqttOperatorConfig) -> str:
    return f"{config.prefix}/{config.project_id}/+/user"


def _reply_topic(config: MqttOperatorConfig, session_id: str) -> str:
    return f"{config.prefix}/{config.project_id}/{session_id}/reply"


def _presence_topic(config: MqttOperatorConfig) -> str:
    return f"{config.prefix}/{config.project_id}/agent/presence"


def _extract_text(payload: Dict[str, Any]) -> str:
    for key in ("text", "content", "message"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    nested = payload.get("data")
    if isinstance(nested, dict):
        return _extract_text(nested)
    return ""


def _extract_trace_id(payload: Dict[str, Any]) -> str:
    for key in ("traceId", "trace_id", "messageId", "message_id"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    nested = payload.get("data")
    if isinstance(nested, dict):
        return _extract_trace_id(nested)
    return ""


def parse_incoming_user_message(topic: str, raw_payload: bytes, prefix: str, project_id: str) -> Optional[UserMqttMessage]:
    """
    MQTT DATA IN ENTRY POINT.

    Replace or extend this function if your project sends a different JSON shape.
    Return None for topics that are not user-message topics.
    """
    session_id = _topic_session_id(topic, prefix, project_id)
    if not session_id:
        return None
    try:
        payload_text = raw_payload.decode("utf-8") if isinstance(raw_payload, (bytes, bytearray)) else str(raw_payload)
        payload = json.loads(payload_text)
        if not isinstance(payload, dict):
            raise ValueError("payload must be an object")
    except Exception as exc:
        raise ValueError(f"Invalid payload on {topic}: {exc}") from exc
    return UserMqttMessage(
        session_id=session_id,
        topic=topic,
        payload=payload,
        text=_extract_text(payload),
        trace_id=_extract_trace_id(payload),
        input_type=payload.get("inputType") or payload.get("type") or "message",
    )


def publish_mqtt_json(client, topic: str, payload: Dict[str, Any], qos: int = QOS, retain: bool = False):
    """
    MQTT DATA OUT ENTRY POINT.

    Use this helper for replies, streaming deltas, done events, and presence.
    Replace it if your customer needs custom logging or payload wrapping.
    """
    return client.publish(
        topic,
        json.dumps(payload, ensure_ascii=False),
        qos=qos,
        retain=retain,
    )


def _message_text_for_reply(message: UserMqttMessage) -> str:
    return message.text or json.dumps(message.payload, ensure_ascii=False)


def _llm_base_url() -> str:
    return (
        os.getenv("TRANSPARENT_LLM_BASE_URL")
        or os.getenv("LLM_BASE_URL")
        or os.getenv("OPENAI_BASE_URL")
        or ""
    ).strip()


def _llm_model_from_env() -> str:
    return (
        os.getenv("TRANSPARENT_LLM_MODEL")
        or os.getenv("LLM_MODEL")
        or os.getenv("OPENAI_MODEL")
        or ""
    ).strip()


def _llm_model() -> str:
    return _llm_model_from_env() or DEFAULT_LLM_MODEL


def _llm_api_key() -> str:
    return (
        os.getenv("TRANSPARENT_LLM_API_KEY")
        or os.getenv("LLM_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or ""
    ).strip()


def _llm_enabled() -> bool:
    if _env_bool("TRANSPARENT_LLM_DISABLED", False):
        return False
    base_url = _llm_base_url()
    if not base_url:
        return False
    host = (urlparse(base_url).hostname or "").lower()
    if host == "api.openai.com":
        return bool(_llm_api_key() and _llm_model_from_env())
    return bool(_llm_model())


def _llm_chat_completions_url() -> str:
    base_url = _llm_base_url().rstrip("/")
    if base_url.endswith("/chat/completions"):
        return base_url
    if base_url.endswith("/v1"):
        return f"{base_url}/chat/completions"
    return f"{base_url}/v1/chat/completions"


def _llm_headers() -> Dict[str, str]:
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    api_key = _llm_api_key()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def _llm_token_limit_param() -> str:
    override = (os.getenv("TRANSPARENT_LLM_TOKEN_LIMIT_PARAM") or "").strip().lower()
    if override in {"max_completion_tokens", "max_tokens", "none"}:
        return override
    host = (urlparse(_llm_base_url()).hostname or "").lower()
    if host == "api.openai.com":
        return "max_completion_tokens"
    return "max_tokens"


def _llm_messages(message: UserMqttMessage, context: ReplyContext) -> List[Dict[str, str]]:
    system_prompt = (
        os.getenv("TRANSPARENT_LLM_SYSTEM_PROMPT")
        or os.getenv("LLM_SYSTEM_PROMPT")
        or DEFAULT_LLM_SYSTEM_PROMPT
    ).strip()
    messages: List[Dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.extend(context.history)
    messages.append({"role": "user", "content": _message_text_for_reply(message)})
    return messages


def _llm_request_body(message: UserMqttMessage, context: ReplyContext, stream: bool) -> Dict[str, Any]:
    body = {
        "model": _llm_model(),
        "messages": _llm_messages(message, context),
        "temperature": _env_float("TRANSPARENT_LLM_TEMPERATURE", LLM_TEMPERATURE),
        "stream": stream,
    }
    token_limit_param = _llm_token_limit_param()
    if token_limit_param != "none":
        body[token_limit_param] = _env_int("TRANSPARENT_LLM_MAX_TOKENS", LLM_MAX_TOKENS)
    return body


def _extract_llm_text(data: Dict[str, Any]) -> str:
    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get("message")
            if isinstance(message, dict):
                content = message.get("content")
                if isinstance(content, str):
                    return content.strip()
            text = first.get("text")
            if isinstance(text, str):
                return text.strip()
    output_text = data.get("output_text")
    if isinstance(output_text, str):
        return output_text.strip()
    return ""


def _extract_llm_delta(data: Dict[str, Any]) -> str:
    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            delta = first.get("delta")
            if isinstance(delta, dict):
                content = delta.get("content")
                if isinstance(content, str):
                    return content
            text = first.get("text")
            if isinstance(text, str):
                return text
    return ""


def _call_llm_reply(message: UserMqttMessage, context: ReplyContext) -> str:
    if requests is None:
        raise RuntimeError("requests is required for LLM calls")
    response = requests.post(
        _llm_chat_completions_url(),
        headers=_llm_headers(),
        json=_llm_request_body(message, context, stream=False),
        timeout=_env_float("TRANSPARENT_LLM_TIMEOUT", LLM_REQUEST_TIMEOUT_SECONDS),
    )
    if response.status_code >= 400:
        raise RuntimeError(f"LLM request failed: HTTP {response.status_code} {response.text[:500]}")
    data = response.json()
    if not isinstance(data, dict):
        raise RuntimeError("LLM response must be a JSON object")
    return _extract_llm_text(data)


def _stream_llm_reply(message: UserMqttMessage, context: ReplyContext) -> Iterator[str]:
    if requests is None:
        raise RuntimeError("requests is required for LLM calls")
    with requests.post(
        _llm_chat_completions_url(),
        headers=_llm_headers(),
        json=_llm_request_body(message, context, stream=True),
        timeout=_env_float("TRANSPARENT_LLM_TIMEOUT", LLM_REQUEST_TIMEOUT_SECONDS),
        stream=True,
    ) as response:
        if response.status_code >= 400:
            raise RuntimeError(f"LLM stream failed: HTTP {response.status_code} {response.text[:500]}")
        for raw_line in response.iter_lines(decode_unicode=True):
            if not raw_line:
                continue
            line = raw_line.strip()
            if line.startswith("data:"):
                line = line[5:].strip()
            if not line:
                continue
            if line == "[DONE]":
                break
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(data, dict):
                delta = _extract_llm_delta(data)
                if delta:
                    yield delta


def generate_reply_text(message: UserMqttMessage, context: ReplyContext) -> str:
    """
    CUSTOM BUSINESS LOGIC HOOK.

    Replace this function to call your own LLM, CRM, ticketing system, or human
    operator service. Return a final reply string. Keep MQTT code unchanged.
    """
    if _llm_enabled():
        reply = _call_llm_reply(message, context).strip()
        return reply or FALLBACK_REPLY
    return FALLBACK_REPLY

# STEP 3 stream_reply_text
def stream_reply_text(message: UserMqttMessage, context: ReplyContext) -> Iterator[str]:
    """
    CUSTOM STREAMING BUSINESS LOGIC HOOK.

    Replace this function if your LLM or backend supports streaming. Yield text
    chunks. If it yields nothing, the script falls back to generate_reply_text(...).
    """
    if not _llm_enabled() or not _env_bool("TRANSPARENT_LLM_STREAM", True):
        return
    yield from _stream_llm_reply(message, context)


def _remember_turn(history: List[Dict[str, str]], user_text: str, reply_text: str, max_turns: int) -> None:
    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": reply_text})
    max_messages = max(0, max_turns) * 2
    if max_messages == 0:
        history.clear()
    elif len(history) > max_messages:
        del history[:-max_messages]


def _new_reply_message_id() -> str:
    return f"mqtt_agent_{int(time.time() * 1000)}"


def _build_reply(session_id: str, text: str, message_id: str = "", trace_id: str = "") -> Dict[str, Any]:
    message_id = message_id or _new_reply_message_id()
    payload = {
        "type": "transparent.reply.text",
        "session_id": session_id,
        "roomId": session_id,
        "source": "operator",
        "text": text,
        "messageId": message_id,
        "created_at": time.time(),
    }
    if trace_id:
        payload["traceId"] = trace_id
        payload["trace_id"] = trace_id
    return payload


def _build_reply_delta(session_id: str, message_id: str, delta: str, sequence: int, trace_id: str = "") -> Dict[str, Any]:
    payload = {
        "type": "transparent.reply.text.delta",
        "session_id": session_id,
        "roomId": session_id,
        "source": "operator",
        "delta": delta,
        "text": delta,
        "content": delta,
        "messageId": message_id,
        "sequence": sequence,
        "created_at": time.time(),
    }
    if trace_id:
        payload["traceId"] = trace_id
        payload["trace_id"] = trace_id
    return payload


def _build_reply_done(session_id: str, message_id: str, text: str, trace_id: str = "") -> Dict[str, Any]:
    payload = {
        "type": "transparent.reply.text.done",
        "session_id": session_id,
        "roomId": session_id,
        "source": "operator",
        "text": text,
        "content": text,
        "messageId": message_id,
        "created_at": time.time(),
    }
    if trace_id:
        payload["traceId"] = trace_id
        payload["trace_id"] = trace_id
    return payload


def _build_presence(project_id: str, online: bool) -> Dict[str, Any]:
    status = "online" if online else "offline"
    return {
        "type": "transparent.operator.presence",
        "source": "operator",
        "project_id": project_id,
        "status": status,
        "online": online,
        "created_at": time.time(),
    }


def _create_mqtt_client(client_id: str, transport: str = "tcp"):
    try:
        import paho.mqtt.client as mqtt
    except Exception as exc:
        raise RuntimeError("paho-mqtt is required. Install it with: pip install paho-mqtt") from exc
    callback_version = getattr(mqtt, "CallbackAPIVersion", None)
    version2 = getattr(callback_version, "VERSION2", None) if callback_version else None
    if version2 is not None:
        return mqtt.Client(version2, client_id=client_id, transport=transport)
    return mqtt.Client(client_id=client_id, transport=transport)


def _mqtt_connect_failure_message(code: Any) -> str:
    text = str(code)
    try:
        numeric_code = int(code)
    except Exception:
        numeric_code = None
    if numeric_code in {5, 134, 135}:
        return (
            f"MQTT connect failed: rc={text} (not authorized). "
            "The broker rejected the NavTalk MQTT token. Check that brokerUrl points to "
            "the NavTalk token-auth broker and that the broker auth callback is wired to "
            "/api/mqtt/auth/connect."
        )
    return f"MQTT connect failed: rc={text}"


def _apply_main_startup_env_defaults() -> None:
    for name, value in MAIN_STARTUP_ENV_DEFAULTS.items():
        if value and not os.getenv(name):
            os.environ[name] = value


def main(argv: Optional[List[str]] = None):
    args = _parse_args(argv)
    api_key = (args.api_key or "").strip()
    if not api_key:
        raise SystemExit("Missing --api-key. Example: python transparent_mqtt_agent.py --api-key YOUR_NAVTALK_PROJECT_API_KEY")

    token_data = _fetch_mqtt_operator_token(api_key)
    config = _mqtt_config_from_token_response(token_data)
    print("Fetched NavTalk MQTT operator token from platform.", flush=True)

    presence_topic = _presence_topic(config)
    inbox: "queue.Queue[UserMqttMessage]" = queue.Queue()
    connected_event = Event()
    stop_event = Event()
    mqtt_online = Event()
    connect_errors: List[str] = []
    histories: Dict[str, List[Dict[str, str]]] = {}

    client_id = f"transparent-agent-{int(time.time() * 1000)}"
    client = _create_mqtt_client(client_id, transport=config.transport)
    client.username_pw_set(config.username, config.password)
    if config.use_tls:
        client.tls_set()
    if config.transport == "websockets" and config.websocket_path:
        client.ws_set_options(path=config.websocket_path)
    client.will_set(
        presence_topic,
        json.dumps(_build_presence(config.project_id, False), ensure_ascii=False),
        qos=1,
        retain=True,
    )
    print(
        f"Connecting MQTT broker {config.host}:{config.port} "
        f"project_id={config.project_id} prefix={config.prefix}",
        flush=True,
    )

    def on_connect(client, userdata, flags, reason_code, properties=None):
        del userdata, flags, properties
        code = getattr(reason_code, "value", reason_code)
        if int(code) != 0:
            message = _mqtt_connect_failure_message(code)
            connect_errors.append(message)
            print(message, flush=True)
            connected_event.set()
            return
        topic = _listen_topic(config)
        client.subscribe(topic, qos=config.qos)
        mqtt_online.set()
        publish_mqtt_json(client, presence_topic, _build_presence(config.project_id, True), qos=config.qos, retain=True)
        print(f"Connected. Waiting for user messages on {topic}", flush=True)
        connected_event.set()

    def on_disconnect(client, userdata, disconnect_flags_or_rc, reason_code=None, properties=None):
        del client, userdata, properties
        code = reason_code if reason_code is not None else disconnect_flags_or_rc
        value = getattr(code, "value", code)
        try:
            numeric_code = int(value)
        except Exception:
            numeric_code = 0
        mqtt_online.clear()
        if numeric_code != 0:
            message = f"MQTT disconnected: rc={value}"
            connect_errors.append(message)
            print(message, flush=True)
            connected_event.set()

    def on_message(client, userdata, message):
        del client, userdata
        try:
            user_message = parse_incoming_user_message(message.topic, message.payload, config.prefix, config.project_id)
        except ValueError as exc:
            print(str(exc))
            return
        if user_message is None:
            print("\n--- mqtt message ---")
            print(f"topic: {message.topic}")
            try:
                print(message.payload.decode("utf-8"))
            except Exception:
                print(message.payload)
            return
        inbox.put(user_message)

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.connect(config.host, config.port, keepalive=30)
    client.loop_start()
    if not connected_event.wait(CONNECT_TIMEOUT_SECONDS):
        print(
            f"MQTT connect timed out after {CONNECT_TIMEOUT_SECONDS:g}s: {config.host}:{config.port}",
            flush=True,
        )
        client.loop_stop()
        client.disconnect()
        return
    if connect_errors:
        client.loop_stop()
        client.disconnect()
        return

    def presence_heartbeat():
        while not stop_event.wait(PRESENCE_INTERVAL_SECONDS):
            if not mqtt_online.is_set():
                continue
            try:
                publish_mqtt_json(client, presence_topic, _build_presence(config.project_id, True), qos=config.qos, retain=True)
            except Exception as exc:
                print(f"presence heartbeat failed: {exc}", flush=True)

    Thread(target=presence_heartbeat, name="transparent-presence-heartbeat", daemon=True).start()

    try:
        while True:
            #STEP 1 Get User full Message
            user_message = inbox.get()
            message_text = _message_text_for_reply(user_message)
            print("\n--- user message ---")
            print(f"session_id: {user_message.session_id}")
            print(f"input_type: {user_message.input_type}")
            print(f"text: {message_text}")

            # STEP 2 reply_topic
            reply_topic = _reply_topic(config, user_message.session_id)
            history = histories.setdefault(user_message.session_id, [])
            context = ReplyContext(history=history, reply_topic=reply_topic, qos=config.qos)

            message_id = _new_reply_message_id()
            reply_parts: List[str] = []
            sequence = 0
            try:
                for delta in stream_reply_text(user_message, context):
                    reply_parts.append(delta)
                    sequence += 1
                    publish_mqtt_json(
                        client,
                        reply_topic,
                        _build_reply_delta(
                            user_message.session_id,
                            message_id,
                            delta,
                            sequence,
                            trace_id=user_message.trace_id,
                        ),
                        qos=config.qos,
                    )
                reply_text = "".join(reply_parts).strip()
                if reply_text:
                    publish_mqtt_json(
                        client,
                        reply_topic,
                        _build_reply_done(
                            user_message.session_id,
                            message_id,
                            reply_text,
                            trace_id=user_message.trace_id,
                        ),
                        qos=config.qos,
                    )
                    _remember_turn(history, message_text, reply_text, HISTORY_TURNS)
                    print(f"streamed reply to {reply_topic} chars={len(reply_text)} chunks={sequence}")
                    continue
            except Exception as exc:
                partial_text = "".join(reply_parts).strip()
                if partial_text:
                    publish_mqtt_json(
                        client,
                        reply_topic,
                        _build_reply_done(
                            user_message.session_id,
                            message_id,
                            partial_text,
                            trace_id=user_message.trace_id,
                        ),
                        qos=config.qos,
                    )
                    _remember_turn(history, message_text, partial_text, HISTORY_TURNS)
                    print(f"stream ended with partial reply: {exc}")
                    continue
                print(f"stream reply failed, falling back to non-stream reply: {exc}")

            try:
                reply_text = generate_reply_text(user_message, context).strip()
                if reply_text:
                    _remember_turn(history, message_text, reply_text, HISTORY_TURNS)
            except Exception as exc:
                print(f"reply hook failed, using fallback template: {exc}")
                reply_text = FALLBACK_REPLY

            if reply_text:
                publish_mqtt_json(
                    client,
                    reply_topic,
                    _build_reply(user_message.session_id, reply_text, trace_id=user_message.trace_id),
                    qos=config.qos,
                )
                print(f"sent reply to {reply_topic}")
            else:
                print("empty reply skipped")
    except KeyboardInterrupt:
        print("\nExiting.")
    finally:
        stop_event.set()
        try:
            info = publish_mqtt_json(
                client,
                presence_topic,
                _build_presence(config.project_id, False),
                qos=1,
                retain=True,
            )
            info.wait_for_publish(timeout=2.0)
        except Exception:
            pass
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    _apply_main_startup_env_defaults()
    main()