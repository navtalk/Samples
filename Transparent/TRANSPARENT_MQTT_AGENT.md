# Transparent MQTT Agent Integration Guide

This sample connects a customer-side operator or LLM service to NavTalk
transparent mode over MQTT.

## Quick Start

Install the Python dependencies first:

```bash
cd Services/MuseTalk
python -m pip install -r requirements.txt
```

This agent requires these third-party packages from `requirements.txt`:

- `requests`
  - Exchanges the NavTalk project API key for a short-lived MQTT token.
  - Calls the optional LLM HTTP endpoint.
- `paho-mqtt>=2.1.0`
  - Connects to the MQTT broker, subscribes to user messages, and publishes
    replies or presence events.

Then run the agent:

```bash
python transparent_mqtt_agent.py --api-key YOUR_NAVTALK_PROJECT_API_KEY
```

If the MQTT broker is exposed through Cloudflare Access, open another terminal
and map the remote MQTT hostname to a local TCP port first:

```bash
cloudflared-windows-amd64.exe access tcp --hostname mqtt.navtalk.ai --url 127.0.0.1:18830
```

Then point the agent to the local mapped broker:

```bash
python transparent_mqtt_agent.py --api-key YOUR_NAVTALK_PROJECT_API_KEY --broker-url mqtt://127.0.0.1:18830
```

The script exchanges the API key for a short-lived NavTalk MQTT token, connects
to the broker, subscribes to user messages, and publishes replies.

## MQTT Topics

- Receive user messages: `{prefix}/{projectId}/{sessionId}/user`
- Send replies: `{prefix}/{projectId}/{sessionId}/reply`
- Presence: `{prefix}/{projectId}/agent/presence`

The default prefix is `navtalk/transparent`.

## Code Entry Points

Open `transparent_mqtt_agent.py` and start from these functions:

- `parse_incoming_user_message(...)`
  - MQTT data in.
  - Converts the raw MQTT topic and JSON payload into `UserMqttMessage`.
  - Customize this if your user payload has different fields.

- `publish_mqtt_json(...)`
  - MQTT data out.
  - Publishes reply, streaming delta, done, and presence payloads.
  - Customize this if you need extra logging, wrapping, or signing.

- `generate_reply_text(...)`
  - Non-streaming LLM or business logic hook.
  - Replace this to call your own model, backend, CRM, ticketing system, or human
    operator queue.

- `stream_reply_text(...)`
  - Streaming LLM hook.
  - Yield text chunks. If it yields nothing, the script falls back to
    `generate_reply_text(...)`.

The rest of the file handles token exchange, MQTT authentication, topic routing,
presence, and fallback behavior.

## User Payload Shape

`parse_incoming_user_message(...)` extracts text from these fields by default:

- `text`
- `content`
- `message`
- nested `data.text`, `data.content`, or `data.message`

The full original JSON is still available as `UserMqttMessage.payload`.

## Reply Payload Shape

Replies are sent as JSON events:

- Final text: `transparent.reply.text`
- Streaming chunk: `transparent.reply.text.delta`
- Streaming complete: `transparent.reply.text.done`

NavTalk reads the `text` or `content` fields from reply payloads.
