# Transparent MQTT Agent Integration Guide

This guide explains how to connect a customer-side operator service, business backend, or LLM to NavTalk transparent mode over MQTT.

Customers only need these two files:

- `TRANSPARENT_MQTT_AGENT.md`
- `transparent_mqtt_agent.py`

The agent exchanges your NavTalk project API key for a short-lived MQTT operator token, connects to the broker returned by NavTalk, receives user text, and publishes replies.

## Quick Start

Install the required Python packages:

```bash
python -m pip install requests "paho-mqtt>=2.1.0"
```

Run the agent:

```bash
python transparent_mqtt_agent.py --api-key YOUR_NAVTALK_PROJECT_API_KEY
```

You can also provide the API key through an environment variable:

```bash
set TRANSPARENT_MQTT_API_KEY=YOUR_NAVTALK_PROJECT_API_KEY
python transparent_mqtt_agent.py
```

On PowerShell, use:

```powershell
$env:TRANSPARENT_MQTT_API_KEY="YOUR_NAVTALK_PROJECT_API_KEY"
python transparent_mqtt_agent.py
```

The normal customer flow does not require manual broker, topic, username, password, TLS, or token configuration. NavTalk returns those values from the operator token endpoint.

Use `NAVTALK_PLATFORM_URL` only if NavTalk support gives you a custom platform URL.

## Data Flow

1. NavTalk publishes user text to `{prefix}/{projectId}/{sessionId}/user`.
2. The agent receives the MQTT message and calls `parse_incoming_user_message(...)`.
3. The agent extracts text from the message payload.
4. Your business logic or LLM runs in `stream_reply_text(...)` or `generate_reply_text(...)`.
5. The agent publishes replies to `{prefix}/{projectId}/{sessionId}/reply`.
6. NavTalk receives the reply text and continues the transparent-mode session.

The default topic prefix is `navtalk/transparent`. The actual prefix and project ID are returned by NavTalk when the agent starts.

## MQTT Topics

The agent uses these topic patterns:

| Purpose | Topic |
| --- | --- |
| Receive user messages | `{prefix}/{projectId}/{sessionId}/user` |
| Send replies | `{prefix}/{projectId}/{sessionId}/reply` |
| Publish operator presence | `{prefix}/{projectId}/agent/presence` |

Do not hardcode `projectId` or `prefix` unless NavTalk support explicitly tells you to. The sample resolves both values automatically.

## User Message Payload

NavTalk sends JSON payloads. The sample extracts user text from these fields, in order:

- `text`
- `content`
- `message`
- `data.text`
- `data.content`
- `data.message`

Example user payload:

```json
{
  "type": "transparent.user.text",
  "source": "user",
  "inputType": "text",
  "text": "Hello, can you help me?",
  "messageId": "user_1700000000000",
  "traceId": "trace_1700000000000"
}
```

The full original JSON object is available as `UserMqttMessage.payload` if your integration needs extra fields.

## Reply Payloads

The sample already builds reply payloads for you. If you customize `publish_mqtt_json(...)`, keep these shapes compatible.

### Non-Streaming Reply

```json
{
  "type": "transparent.reply.text",
  "session_id": "SESSION_ID",
  "roomId": "SESSION_ID",
  "source": "operator",
  "text": "Yes, I can help.",
  "messageId": "mqtt_agent_1700000000000",
  "traceId": "trace_1700000000000",
  "trace_id": "trace_1700000000000",
  "created_at": 1700000000.0
}
```

### Streaming Delta

```json
{
  "type": "transparent.reply.text.delta",
  "session_id": "SESSION_ID",
  "roomId": "SESSION_ID",
  "source": "operator",
  "delta": "Yes, ",
  "text": "Yes, ",
  "content": "Yes, ",
  "messageId": "mqtt_agent_1700000000000",
  "sequence": 1,
  "traceId": "trace_1700000000000",
  "trace_id": "trace_1700000000000",
  "created_at": 1700000000.0
}
```

### Streaming Done

```json
{
  "type": "transparent.reply.text.done",
  "session_id": "SESSION_ID",
  "roomId": "SESSION_ID",
  "source": "operator",
  "text": "Yes, I can help.",
  "content": "Yes, I can help.",
  "messageId": "mqtt_agent_1700000000000",
  "traceId": "trace_1700000000000",
  "trace_id": "trace_1700000000000",
  "created_at": 1700000000.0
}
```

### Presence

The agent publishes presence when it connects and periodically while it is online:

```json
{
  "type": "transparent.operator.presence",
  "source": "operator",
  "project_id": "PROJECT_ID",
  "status": "online",
  "online": true,
  "created_at": 1700000000.0
}
```

On shutdown, it publishes the same payload with `status` set to `offline` and `online` set to `false`.

## Code Entry Points

Open `transparent_mqtt_agent.py` and customize only these functions for most integrations:

- `parse_incoming_user_message(...)`
  - MQTT data in.
  - Converts the raw MQTT topic and JSON payload into `UserMqttMessage`.
  - Customize this only if your user payload uses a different JSON shape.

- `generate_reply_text(...)`
  - Non-streaming business logic or LLM hook.
  - Return one final reply string.

- `stream_reply_text(...)`
  - Streaming business logic or LLM hook.
  - Yield text chunks. If it yields nothing, the agent falls back to `generate_reply_text(...)`.

- `publish_mqtt_json(...)`
  - MQTT data out.
  - Publishes replies, streaming deltas, done events, and presence.
  - Customize this only if you need extra logging, wrapping, or auditing.

The rest of the file handles token exchange, MQTT authentication, topic routing, presence, history, and fallback behavior.

## Optional LLM Integration

The sample supports OpenAI-compatible chat-completions endpoints through environment variables. No extra SDK is required; it uses `requests`.

### Local Free Option: Ollama

Install and start Ollama, then pull a model:

```bash
ollama pull qwen3:8b
```

Configure the agent:

```powershell
$env:TRANSPARENT_LLM_BASE_URL="http://localhost:11434/v1"
$env:TRANSPARENT_LLM_API_KEY="ollama"
$env:TRANSPARENT_LLM_MODEL="qwen3:8b"
$env:TRANSPARENT_LLM_STREAM="true"
python transparent_mqtt_agent.py --api-key YOUR_NAVTALK_PROJECT_API_KEY
```

### OpenAI-Compatible Cloud Provider

Use the provider base URL, API key, and model name:

```powershell
$env:TRANSPARENT_LLM_BASE_URL="https://api.example.com/v1"
$env:TRANSPARENT_LLM_API_KEY="YOUR_PROVIDER_API_KEY"
$env:TRANSPARENT_LLM_MODEL="MODEL_NAME"
$env:TRANSPARENT_LLM_STREAM="true"
python transparent_mqtt_agent.py --api-key YOUR_NAVTALK_PROJECT_API_KEY
```

### LLM Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `TRANSPARENT_LLM_BASE_URL` | empty | Enables LLM mode when set. Use an OpenAI-compatible base URL such as `http://localhost:11434/v1`. |
| `TRANSPARENT_LLM_API_KEY` | empty | Provider API key. Ollama can use `ollama`. |
| `TRANSPARENT_LLM_MODEL` | `qwen3:8b` | Model name sent to the provider. |
| `TRANSPARENT_LLM_STREAM` | `true` | Set to `false` to disable streaming replies. |
| `TRANSPARENT_LLM_TIMEOUT` | `30` | HTTP timeout in seconds. |
| `TRANSPARENT_LLM_SYSTEM_PROMPT` | English default prompt | Runtime system prompt. Use this variable if you want replies in another language. |
| `TRANSPARENT_LLM_TEMPERATURE` | `0.7` | Sampling temperature. |
| `TRANSPARENT_LLM_MAX_TOKENS` | `256` | Maximum reply tokens. |
| `TRANSPARENT_LLM_TOKEN_LIMIT_PARAM` | provider default | Token-limit field name. `api.openai.com` uses `max_completion_tokens`; other endpoints use `max_tokens`. Set to `none` if the provider rejects token-limit fields. |
| `TRANSPARENT_LLM_DISABLED` | `false` | Set to `true` to force fallback replies. |

If `TRANSPARENT_LLM_BASE_URL` is not set, the agent does not call an LLM and returns the fallback reply.

## Troubleshooting

### `MQTT connect failed: rc=134 (not authorized)`

The broker rejected the MQTT operator token. Check these items:

- The broker URL returned by NavTalk is the token-auth broker URL.
- If the broker URL is WebSocket-based, the path is correct, for example `/mqtt`.
- The NavTalk project API key is valid and belongs to the expected project.
- The token has not expired. Restart the agent to fetch a new token.
- If you use a private deployment, confirm the broker auth callback is connected to the NavTalk MQTT auth endpoint.

### Broker URL or WebSocket Path Issues

For URLs such as `wss://mqtt.navtalk.ai/mqtt`, the host is `mqtt.navtalk.ai`, the port is `443`, and the WebSocket path is `/mqtt`. The sample parses this automatically from the NavTalk token response.

If the connection times out, check firewall, DNS, TLS termination, and reverse proxy routing.

### Topic Mismatch

The operator token only allows the agent to subscribe and publish under the project topic prefix returned by NavTalk. Do not change `prefix`, `projectId`, or topic names manually unless NavTalk support asks you to.

### Operator Offline

Start the agent before starting a transparent-mode session. The agent publishes presence to `{prefix}/{projectId}/agent/presence`. If presence is missing, NavTalk may treat the operator as offline.

### Invalid JSON Payload

The agent expects MQTT user payloads to be JSON objects. Invalid JSON is logged and skipped.

### Empty User Text

If none of `text`, `content`, `message`, or nested `data.*` fields contain text, the agent falls back to the full JSON payload as the user input.

### Empty Reply

If your custom logic returns an empty string, the agent skips publishing the reply. Return a fallback message instead if the user should hear a response.

### LLM Timeout or HTTP Error

The agent logs the LLM error and falls back from streaming to non-streaming. If non-streaming also fails, it returns the fallback reply.

Common fixes:

- Confirm `TRANSPARENT_LLM_BASE_URL` includes the correct `/v1` base path.
- Confirm `TRANSPARENT_LLM_API_KEY` is valid for cloud providers.
- Confirm the model name exists on the provider.
- If OpenAI returns `Unsupported parameter: 'max_tokens'`, use `TRANSPARENT_LLM_TOKEN_LIMIT_PARAM=max_completion_tokens` or leave the variable unset when `TRANSPARENT_LLM_BASE_URL` is `https://api.openai.com/v1`.
- If a local OpenAI-compatible provider rejects token-limit fields, set `TRANSPARENT_LLM_TOKEN_LIMIT_PARAM=none`.
- Increase `TRANSPARENT_LLM_TIMEOUT` if the model is slow.

### Rate Limits

Cloud LLM providers may return rate-limit errors. Use provider dashboards to check request limits, token limits, and billing status. For production, add retry, backoff, and monitoring around the LLM call.

## Customer Test Checklist

Before handing the integration to end users, verify:

- The agent starts with `python transparent_mqtt_agent.py --api-key ...`.
- The startup log shows the expected broker host, project ID, and prefix.
- The agent logs `Connected. Waiting for user messages ...`.
- A user message appears in the agent log with the expected `session_id` and `text`.
- The reply is published to `{prefix}/{projectId}/{sessionId}/reply`.
- Streaming replies use one stable `messageId` for all deltas and the done event.
- No real API key or LLM provider key is committed into the Python file.
- If LLM mode is enabled, the LLM responds within your target latency.