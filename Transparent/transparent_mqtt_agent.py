"""
NavTalk transparent-mode MQTT operator sample.

Customer integration points:
1. MQTT data in: parse_incoming_user_message(...)
2. MQTT data out: publish_mqtt_json(...)
3. Custom LLM/business logic: generate_reply_text(...) and stream_reply_text(...)

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
except Exception:  # pragma: no cover - keeps manual mode usable without requests
    requests = None


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

    args: Any
    history: List[Dict[str, str]]
    reply_topic: str
    qos: int


def _add_hidden_mqtt_args(parser):
    hidden = argparse.SUPPRESS
    parser.add_argument("--platform-url", default=os.getenv("NAVTALK_PLATFORM_URL") or "https://api.navtalk.ai", help=hidden)
    parser.add_argument("--broker-url", default=os.getenv("TRANSPARENT_MQTT_BROKER_URL") or os.getenv("MQTT_BROKER_URL") or "", help=hidden)
    parser.add_argument("--host", default=os.getenv("TRANSPARENT_MQTT_HOST") or os.getenv("MQTT_BROKER_HOST") or "127.0.0.1", help=hidden)
    parser.add_argument("--port", type=int, default=int(os.getenv("TRANSPARENT_MQTT_PORT") or os.getenv("MQTT_BROKER_PORT") or 1883), help=hidden)
    parser.add_argument("--project-id", default=os.getenv("TRANSPARENT_MQTT_PROJECT_ID") or os.getenv("MQTT_PROJECT_ID") or "", help=hidden)
    parser.add_argument("--username", default=os.getenv("TRANSPARENT_MQTT_USERNAME") or os.getenv("MQTT_USERNAME") or "", help=hidden)
    parser.add_argument("--token", default=os.getenv("TRANSPARENT_MQTT_TOKEN") or os.getenv("NAVTALK_MQTT_TOKEN") or "", help=hidden)
    parser.add_argument("--password", default=os.getenv("TRANSPARENT_MQTT_PASSWORD") or os.getenv("MQTT_PASSWORD") or "", help=hidden)
    parser.add_argument("--token-url", default=os.getenv("TRANSPARENT_MQTT_TOKEN_URL") or os.getenv("NAVTALK_MQTT_TOKEN_URL") or "", help=hidden)
    parser.add_argument("--token-request-timeout", type=float, default=float(os.getenv("TRANSPARENT_MQTT_TOKEN_TIMEOUT") or 10), help=hidden)
    parser.add_argument("--prefix", default=os.getenv("TRANSPARENT_MQTT_TOPIC_PREFIX") or "navtalk/transparent", help=hidden)
    parser.add_argument("--qos", type=int, default=int(os.getenv("TRANSPARENT_MQTT_QOS") or 0), help=hidden)
    parser.add_argument("--listen-topic", default=os.getenv("TRANSPARENT_MQTT_LISTEN_TOPIC") or "", help=hidden)
    parser.add_argument("--tls", action="store_true", default=(os.getenv("TRANSPARENT_MQTT_TLS") or "").strip().lower() in {"1", "true", "yes", "on"}, help=hidden)
    parser.add_argument("--connect-timeout", type=float, default=float(os.getenv("TRANSPARENT_MQTT_CONNECT_TIMEOUT") or 10), help=hidden)
    parser.add_argument("--presence-interval", type=float, default=float(os.getenv("TRANSPARENT_MQTT_PRESENCE_INTERVAL") or 5), help=hidden)


def _add_hidden_reply_args(parser):
    hidden = argparse.SUPPRESS
    parser.add_argument(
        "--auto-reply",
        default=os.getenv("TRANSPARENT_LLM_FALLBACK_REPLY")
        or "\u62b1\u6b49\uff0c\u667a\u80fd\u56de\u590d\u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002",
        help=hidden,
    )
    parser.add_argument("--manual", action="store_true", help=hidden)
    parser.add_argument(
        "--disable-llm-stream",
        action="store_true",
        default=os.getenv("TRANSPARENT_LLM_STREAM", "true").strip().lower() in {"0", "false", "no", "n", "off"},
        help=hidden,
    )
    parser.add_argument("--llm-base-url", default=os.getenv("TRANSPARENT_LLM_BASE_URL") or os.getenv("LLAMA_CPP_BASE_URL") or "https://llm.navtalk.ai", help=hidden)
    parser.add_argument("--llm-model", default=os.getenv("TRANSPARENT_LLM_MODEL") or os.getenv("LLAMA_CPP_MODEL") or "qwen2.5:0.5b", help=hidden)
    parser.add_argument("--llm-endpoint", choices=("auto", "chat", "completion"), default=os.getenv("TRANSPARENT_LLM_ENDPOINT") or "completion", help=hidden)
    parser.add_argument("--llm-api-key", default=os.getenv("TRANSPARENT_LLM_API_KEY") or os.getenv("LLAMA_CPP_API_KEY") or "", help=hidden)
    parser.add_argument("--llm-timeout", type=float, default=float(os.getenv("TRANSPARENT_LLM_TIMEOUT") or 30), help=hidden)
    parser.add_argument("--llm-temperature", type=float, default=float(os.getenv("TRANSPARENT_LLM_TEMPERATURE") or 0.7), help=hidden)
    parser.add_argument("--llm-max-tokens", type=int, default=int(os.getenv("TRANSPARENT_LLM_MAX_TOKENS") or 256), help=hidden)
    parser.add_argument("--llm-history-turns", type=int, default=int(os.getenv("TRANSPARENT_LLM_HISTORY_TURNS") or 6), help=hidden)
    parser.add_argument(
        "--llm-system-prompt",
        default=os.getenv("TRANSPARENT_LLM_SYSTEM_PROMPT")
        or "You are NavTalk's transparent-mode MQTT reply assistant. Reply directly in concise Chinese suitable for voice playback. Do not output JSON, Markdown, or extra explanations; say politely when uncertain.",
        help=hidden,
    )
    parser.add_argument("--disable-llm", action="store_true", help=hidden)


def _parse_args(argv: Optional[List[str]] = None):
    parser = argparse.ArgumentParser(
        description=(
            "NavTalk transparent-mode MQTT operator agent. "
            "For the NavTalk hosted broker, normal users only need --api-key."
        )
    )
    parser.add_argument("--api-key", default=os.getenv("TRANSPARENT_MQTT_API_KEY") or os.getenv("NAVTALK_API_KEY") or "", help="NavTalk project API key. This is the only required option for the hosted broker.")
    _add_hidden_mqtt_args(parser)
    _add_hidden_reply_args(parser)
    return parser.parse_args(argv)


def _parse_broker_url(value: str) -> Tuple[str, int, str, str]:
    if not value:
        return "", 0, "", ""
    parsed = urlparse(value if "://" in value else f"mqtt://{value}")
    scheme = (parsed.scheme or "mqtt").lower()
    default_port = 8883 if scheme in {"mqtts", "ssl", "tls", "wss"} else 1883
    return parsed.hostname or "", parsed.port or default_port, scheme, parsed.path or ""


def _topic_session_id(topic: str, prefix: str, project_id: str = "") -> str:
    prefix = prefix.rstrip("/") + "/"
    if not topic.startswith(prefix):
        return ""
    rest = topic[len(prefix) :]
    parts = rest.split("/")
    if project_id:
        return parts[1] if len(parts) >= 3 and parts[0] == project_id and parts[2] == "user" else ""
    return parts[0] if len(parts) >= 2 and parts[1] == "user" else ""


def _extract_text(payload: Dict) -> str:
    for key in ("text", "content", "message"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    nested = payload.get("data")
    if isinstance(nested, dict):
        return _extract_text(nested)
    return ""


def _join_url(base_url: str, path: str) -> str:
    base = base_url.rstrip("/")
    suffix = path if path.startswith("/") else f"/{path}"
    if base.endswith("/v1") and suffix.startswith("/v1/"):
        suffix = suffix[len("/v1") :]
    return f"{base}{suffix}"


def _request_headers(api_key: str) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def _strip_bearer(value: str) -> str:
    raw = (value or "").strip()
    return raw[7:].strip() if raw.lower().startswith("bearer ") else raw


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


def _mqtt_token_url(args) -> str:
    if args.token_url:
        return args.token_url
    return _join_url(args.platform_url, "/api/open/v1/mqtt/operator-token")


def _unwrap_api_result(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise RuntimeError("MQTT token endpoint returned a non-object response")
    if "data" not in payload and "code" not in payload:
        return payload
    code = payload.get("code", 200)
    if str(code) != "200":
        raise RuntimeError(str(payload.get("message") or payload.get("msg") or "MQTT token endpoint rejected the request"))
    data = payload.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("MQTT token endpoint returned empty data")
    return data


def _fetch_mqtt_operator_token(args) -> Dict[str, Any]:
    if requests is None:
        raise RuntimeError("requests is required when --api-key is used")
    token_url = _mqtt_token_url(args)
    headers = {
        "license": args.api_key,
    }
    response = requests.post(token_url, headers=headers, timeout=args.token_request_timeout)
    if response.status_code >= 400:
        raise RuntimeError(f"MQTT token endpoint failed: HTTP {response.status_code}")
    return _unwrap_api_result(response.json())


def _apply_mqtt_operator_token(args, data: Dict[str, Any]) -> None:
    broker_url = data.get("brokerUrl") or data.get("broker_url") or ""
    project_id = data.get("projectId") or data.get("project_id") or ""
    prefix = data.get("prefix") or data.get("topicPrefix") or data.get("topic_prefix") or ""
    token = data.get("token") or data.get("mqttToken") or data.get("mqtt_token") or data.get("password") or ""
    username = data.get("username")
    if broker_url and args.broker_url is None:
        args.broker_url = broker_url
    if project_id and not args.project_id:
        args.project_id = str(project_id)
    if prefix:
        args.prefix = str(prefix)
    if token:
        args.token = str(token)
        args.password = str(token)
    if username is not None and not args.username:
        args.username = str(username or "")
    if not args.username and args.project_id:
        args.username = str(args.project_id)


def _hydrate_mqtt_args_from_token(args) -> None:
    claims = _decode_jwt_payload(args.password)
    if not claims:
        return
    project_id = claims.get("projectId") or claims.get("project_id") or claims.get("sub")
    topic_prefix = claims.get("topicPrefix") or claims.get("topic_prefix")
    if project_id:
        if not args.project_id:
            args.project_id = str(project_id)
        if not args.username:
            args.username = str(project_id)
    if topic_prefix and (not args.prefix or args.prefix == "navtalk/transparent"):
        args.prefix = str(topic_prefix)


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


def _extract_llm_text(response: Dict[str, Any]) -> str:
    choices = response.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get("message")
            if isinstance(message, dict):
                content = message.get("content")
                if isinstance(content, str):
                    return _repair_mojibake_text(content).strip()
            for key in ("text", "content"):
                value = first.get(key)
                if isinstance(value, str):
                    return _repair_mojibake_text(value).strip()

    for key in ("content", "response", "text", "message"):
        value = response.get(key)
        if isinstance(value, str):
            return _repair_mojibake_text(value).strip()
    nested = response.get("data")
    if isinstance(nested, dict):
        return _extract_llm_text(nested)
    return ""


def _extract_trace_id(payload: Dict) -> str:
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


def publish_mqtt_json(client, topic: str, payload: Dict[str, Any], qos: int = 0, retain: bool = False):
    """
    MQTT DATA OUT ENTRY POINT.

    Use this helper for replies, streaming deltas, done events, and presence.
    Replace it if your customer needs custom logging, signing, or payload wrapping.
    """
    return client.publish(
        topic,
        json.dumps(payload, ensure_ascii=False),
        qos=qos,
        retain=retain,
    )


def _message_text_for_reply(message: UserMqttMessage) -> str:
    return message.text or json.dumps(message.payload, ensure_ascii=False)


def generate_reply_text(message: UserMqttMessage, context: ReplyContext) -> str:
    """
    CUSTOM LLM HOOK.

    Replace this function to call your own LLM, CRM, ticketing system, or human
    operator service. Return a final reply string. Keep MQTT code unchanged.
    """
    user_text = _message_text_for_reply(message)
    if context.args.disable_llm:
        return _fallback_reply(context.args, message.session_id, message.input_type, user_text)
    return _generate_llm_reply(context.args, context.history, user_text).strip()


def stream_reply_text(message: UserMqttMessage, context: ReplyContext) -> Iterator[str]:
    """
    CUSTOM STREAMING LLM HOOK.

    Replace this function if your LLM supports streaming. Yield text chunks.
    Return without yielding to fall back to generate_reply_text(...).
    """
    if context.args.disable_llm or context.args.disable_llm_stream:
        return
    yield from _generate_llm_reply_stream(context.args, context.history, _message_text_for_reply(message))


def _repair_mojibake_text(text: str) -> str:
    if not text:
        return ""
    mojibake_markers = ("Ã", "Â", "ä", "å", "æ", "è", "é", "ï¼", "ã€")
    if not any(marker in text for marker in mojibake_markers):
        return text
    for encoding in ("latin-1", "cp1252"):
        try:
            repaired = text.encode(encoding).decode("utf-8")
        except UnicodeError:
            continue
        if repaired:
            return repaired
    return text


def _extract_llm_delta(response: Dict[str, Any]) -> str:
    choices = response.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            delta = first.get("delta")
            if isinstance(delta, dict):
                content = delta.get("content")
                if isinstance(content, str):
                    return _repair_mojibake_text(content)
            message = first.get("message")
            if isinstance(message, dict):
                content = message.get("content")
                if isinstance(content, str):
                    return _repair_mojibake_text(content)
            for key in ("text", "content"):
                value = first.get(key)
                if isinstance(value, str):
                    return _repair_mojibake_text(value)

    for key in ("content", "response", "text", "message"):
        value = response.get(key)
        if isinstance(value, str):
            return _repair_mojibake_text(value)
    nested = response.get("data")
    if isinstance(nested, dict):
        return _extract_llm_delta(nested)
    return ""


def _post_llm_json(url: str, body: Dict[str, Any], args) -> Dict[str, Any]:
    if requests is None:
        raise RuntimeError("requests is required for LLM replies")
    response = requests.post(
        url,
        json=body,
        headers=_request_headers(args.llm_api_key),
        timeout=args.llm_timeout,
    )
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict):
        raise ValueError("LLM response must be a JSON object")
    return data


def _iter_llm_stream_json(url: str, body: Dict[str, Any], args) -> Iterator[Dict[str, Any]]:
    if requests is None:
        raise RuntimeError("requests is required for streaming LLM replies")
    with requests.post(
        url,
        json=body,
        headers=_request_headers(args.llm_api_key),
        timeout=args.llm_timeout,
        stream=True,
    ) as response:
        response.raise_for_status()
        for raw_line in response.iter_lines(decode_unicode=False):
            if not raw_line:
                continue
            if isinstance(raw_line, bytes):
                raw_line = raw_line.decode("utf-8", errors="replace")
            line = raw_line.strip()
            if line.startswith("data:"):
                line = line[5:].strip()
            if not line or line == "[DONE]":
                if line == "[DONE]":
                    break
                continue
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(data, dict):
                yield data


def _chat_messages(args, history: List[Dict[str, str]], user_text: str) -> List[Dict[str, str]]:
    messages: List[Dict[str, str]] = []
    if args.llm_system_prompt:
        messages.append({"role": "system", "content": args.llm_system_prompt})
    messages.extend(history)
    messages.append({"role": "user", "content": user_text})
    return messages


def _completion_prompt(args, history: List[Dict[str, str]], user_text: str) -> str:
    lines = []
    if args.llm_system_prompt:
        lines.append(f"System: {args.llm_system_prompt}")
    for message in history:
        role = message.get("role") or "user"
        content = message.get("content") or ""
        if content:
            lines.append(f"{role.title()}: {content}")
    lines.append(f"User: {user_text}")
    lines.append("Assistant:")
    return "\n".join(lines)


def _call_chat_completion(args, history: List[Dict[str, str]], user_text: str) -> str:
    body = {
        "model": args.llm_model,
        "messages": _chat_messages(args, history, user_text),
        "temperature": args.llm_temperature,
        "max_tokens": args.llm_max_tokens,
        "stream": False,
    }
    return _extract_llm_text(_post_llm_json(_join_url(args.llm_base_url, "/v1/chat/completions"), body, args))


def _stream_chat_completion(args, history: List[Dict[str, str]], user_text: str) -> Iterator[str]:
    body = {
        "model": args.llm_model,
        "messages": _chat_messages(args, history, user_text),
        "temperature": args.llm_temperature,
        "max_tokens": args.llm_max_tokens,
        "stream": True,
    }
    for data in _iter_llm_stream_json(_join_url(args.llm_base_url, "/v1/chat/completions"), body, args):
        delta = _extract_llm_delta(data)
        if delta:
            yield delta


def _call_completion(args, history: List[Dict[str, str]], user_text: str) -> str:
    body = {
        "prompt": _completion_prompt(args, history, user_text),
        "temperature": args.llm_temperature,
        "n_predict": args.llm_max_tokens,
        "stream": False,
        "stop": ["</s>", "<|im_end|>", "User:", "System:"],
    }
    return _extract_llm_text(_post_llm_json(_join_url(args.llm_base_url, "/completion"), body, args))


def _stream_completion(args, history: List[Dict[str, str]], user_text: str) -> Iterator[str]:
    body = {
        "prompt": _completion_prompt(args, history, user_text),
        "temperature": args.llm_temperature,
        "n_predict": args.llm_max_tokens,
        "stream": True,
        "stop": ["</s>", "<|im_end|>", "User:", "System:"],
    }
    for data in _iter_llm_stream_json(_join_url(args.llm_base_url, "/completion"), body, args):
        delta = _extract_llm_delta(data)
        if delta:
            yield delta


def _generate_llm_reply(args, history: List[Dict[str, str]], user_text: str) -> str:
    errors = []
    endpoints = ("completion", "chat") if args.llm_endpoint == "auto" else (args.llm_endpoint,)
    for endpoint in endpoints:
        try:
            print(f"calling LLM endpoint={endpoint} base_url={args.llm_base_url} model={args.llm_model}")
            if endpoint == "chat":
                reply_text = _call_chat_completion(args, history, user_text)
            else:
                reply_text = _call_completion(args, history, user_text)
            if reply_text:
                print(f"LLM replied chars={len(reply_text)}")
                return reply_text
            errors.append(f"{endpoint}: empty response")
        except Exception as exc:
            errors.append(f"{endpoint}: {exc}")

    raise RuntimeError("; ".join(errors) or "LLM returned no usable response")


def _generate_llm_reply_stream(args, history: List[Dict[str, str]], user_text: str) -> Iterator[str]:
    errors = []
    endpoints = ("completion", "chat") if args.llm_endpoint == "auto" else (args.llm_endpoint,)
    for endpoint in endpoints:
        chunks = 0
        try:
            print(f"streaming LLM endpoint={endpoint} base_url={args.llm_base_url} model={args.llm_model}")
            iterator = _stream_chat_completion(args, history, user_text) if endpoint == "chat" else _stream_completion(args, history, user_text)
            for delta in iterator:
                chunks += 1
                yield delta
            if chunks:
                return
            errors.append(f"{endpoint}: empty stream")
        except Exception as exc:
            if chunks:
                raise
            errors.append(f"{endpoint}: {exc}")
    raise RuntimeError("; ".join(errors) or "LLM returned no usable stream")


def _remember_turn(history: List[Dict[str, str]], user_text: str, reply_text: str, max_turns: int) -> None:
    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": reply_text})
    max_messages = max(0, max_turns) * 2
    if max_messages == 0:
        history.clear()
    elif len(history) > max_messages:
        del history[:-max_messages]


def _fallback_reply(args, session_id: str, input_type: str, fallback_text: str) -> str:
    return args.auto_reply.format(
        text=fallback_text,
        session_id=session_id,
        input_type=input_type,
    ).strip()


def _new_reply_message_id() -> str:
    return f"mqtt_agent_{int(time.time() * 1000)}"


def _build_reply(session_id: str, text: str, message_id: str = "", trace_id: str = "") -> Dict:
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


def _build_reply_delta(session_id: str, message_id: str, delta: str, sequence: int, trace_id: str = "") -> Dict:
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


def _build_reply_done(session_id: str, message_id: str, text: str, trace_id: str = "") -> Dict:
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


def _build_presence(project_id: str, online: bool) -> Dict:
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


def main(argv: Optional[List[str]] = None):
    args = _parse_args(argv)
    if args.token and not args.password:
        args.password = args.token
    if args.api_key:
        token_data = _fetch_mqtt_operator_token(args)
        _apply_mqtt_operator_token(args, token_data)
        print("Fetched NavTalk MQTT operator token from platform.", flush=True)
    if args.password:
        _hydrate_mqtt_args_from_token(args)
    broker_host, broker_port, broker_scheme, broker_path = _parse_broker_url(args.broker_url)
    if broker_host:
        args.host = broker_host
    if broker_port:
        args.port = broker_port
    project_id = args.project_id.strip()
    prefix = args.prefix.rstrip("/")
    qos = max(0, min(2, args.qos))
    use_tls = args.tls or broker_scheme in {"mqtts", "ssl", "tls", "wss"}
    transport = "websockets" if broker_scheme in {"ws", "wss"} else "tcp"
    presence_topic = f"{prefix}/{project_id}/agent/presence" if project_id else ""
    inbox: "queue.Queue[UserMqttMessage]" = queue.Queue()
    connected_event = Event()
    stop_event = Event()
    mqtt_online = Event()
    connect_errors = []
    histories: Dict[str, List[Dict[str, str]]] = {}

    client_id = f"transparent-agent-{int(time.time() * 1000)}"
    client = _create_mqtt_client(client_id, transport=transport)
    if args.username or args.password:
        client.username_pw_set(args.username or "", args.password or None)
    if use_tls:
        client.tls_set()
    if transport == "websockets" and broker_path:
        client.ws_set_options(path=broker_path)
    if presence_topic:
        client.will_set(
            presence_topic,
            json.dumps(_build_presence(project_id, False), ensure_ascii=False),
            qos=1,
            retain=True,
        )
    print(
        f"Connecting MQTT broker {args.host}:{args.port} username={args.username or '-'} "
        f"project_id={project_id or '-'} prefix={prefix or '-'}",
        flush=True,
    )

    def on_connect(client, userdata, flags, reason_code, properties=None):
        code = getattr(reason_code, "value", reason_code)
        if int(code) != 0:
            message = _mqtt_connect_failure_message(code)
            connect_errors.append(message)
            print(message, flush=True)
            connected_event.set()
            return
        topic = args.listen_topic or (f"{prefix}/{project_id}/+/user" if project_id else f"{prefix}/+/user")
        client.subscribe(topic, qos=qos)
        mqtt_online.set()
        if presence_topic:
            publish_mqtt_json(client, presence_topic, _build_presence(project_id, True), qos=qos, retain=True)
        print(f"Connected. Waiting for user messages on {topic}", flush=True)
        connected_event.set()

    def on_disconnect(client, userdata, disconnect_flags_or_rc, reason_code=None, properties=None):
        code = reason_code if reason_code is not None else disconnect_flags_or_rc
        value = getattr(code, "value", code)
        try:
            numeric_code = int(value)
        except Exception:
            numeric_code = 0
        mqtt_online.clear()
        if numeric_code != 0:
            message = f"MQTT disconnected before connect completed: rc={value}"
            connect_errors.append(message)
            print(message, flush=True)
            connected_event.set()

    def on_message(client, userdata, message):
        try:
            user_message = parse_incoming_user_message(message.topic, message.payload, prefix, project_id)
        except ValueError as exc:
            print(str(exc))
            return
        if user_message is None:
            print(f"\n--- mqtt message ---")
            print(f"topic: {message.topic}")
            try:
                print(message.payload.decode("utf-8"))
            except Exception:
                print(message.payload)
            return
        inbox.put(user_message)

    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(args.host, args.port, keepalive=30)
    client.loop_start()
    if not connected_event.wait(args.connect_timeout):
        print(
            f"MQTT connect timed out after {args.connect_timeout:g}s: {args.host}:{args.port}",
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
        interval = max(0.0, float(args.presence_interval or 0))
        while presence_topic and interval > 0 and not stop_event.wait(interval):
            if not mqtt_online.is_set():
                continue
            try:
                publish_mqtt_json(client, presence_topic, _build_presence(project_id, True), qos=qos, retain=True)
            except Exception as exc:
                print(f"presence heartbeat failed: {exc}", flush=True)

    if presence_topic and args.presence_interval > 0:
        Thread(target=presence_heartbeat, name="transparent-presence-heartbeat", daemon=True).start()

    try:
        while True:
            user_message = inbox.get()
            message_text = _message_text_for_reply(user_message)
            print("\n--- user message ---")
            print(f"session_id: {user_message.session_id}")
            print(f"input_type: {user_message.input_type}")
            print(f"text: {message_text}")

            reply_topic = f"{prefix}/{project_id}/{user_message.session_id}/reply" if project_id else f"{prefix}/{user_message.session_id}/reply"
            history = histories.setdefault(user_message.session_id, [])
            context = ReplyContext(args=args, history=history, reply_topic=reply_topic, qos=qos)
            if args.manual:
                reply_text = input("reply text (empty to skip): ").strip()
                if reply_text:
                    publish_mqtt_json(
                        client,
                        reply_topic,
                        _build_reply(user_message.session_id, reply_text, trace_id=user_message.trace_id),
                        qos=qos,
                    )
                    print(f"sent reply to {reply_topic}")
                continue

            if not args.disable_llm_stream:
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
                            qos=qos,
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
                            qos=qos,
                        )
                        _remember_turn(history, message_text, reply_text, args.llm_history_turns)
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
                            qos=qos,
                        )
                        _remember_turn(history, message_text, partial_text, args.llm_history_turns)
                        print(f"LLM stream ended with partial reply: {exc}")
                        continue
                    print(f"LLM stream failed, falling back to non-stream reply: {exc}")

            try:
                reply_text = generate_reply_text(user_message, context).strip()
                if reply_text and not args.disable_llm:
                    _remember_turn(history, message_text, reply_text, args.llm_history_turns)
            except Exception as exc:
                print(f"LLM reply failed, using fallback template: {exc}")
                reply_text = _fallback_reply(args, user_message.session_id, user_message.input_type, message_text)

            if reply_text:
                publish_mqtt_json(
                    client,
                    reply_topic,
                    _build_reply(user_message.session_id, reply_text, trace_id=user_message.trace_id),
                    qos=qos,
                )
                print(f"sent reply to {reply_topic}")
            else:
                print("empty reply skipped")
    except KeyboardInterrupt:
        print("\nExiting.")
    finally:
        stop_event.set()
        if presence_topic and not connect_errors:
            try:
                info = publish_mqtt_json(
                    client,
                    presence_topic,
                    _build_presence(project_id, False),
                    qos=1,
                    retain=True,
                )
                info.wait_for_publish(timeout=2.0)
            except Exception:
                pass
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main([
        "--api-key", "Your API Key",
        "--broker-url", "mqtt://127.0.0.1:18830",
    ])