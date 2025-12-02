# Python Webhook Server

A webhook server that receives and processes real-time events and session records from the NavTalk API.

## Features

- Receives real-time webhook events (`/api/webhook/message`)
- Receives full session records (`/api/webhook/session`)
- Handles events: `session.created`, `conversation.output`, `session.closed`
- Serves static files
- RESTful API endpoints

## Installation

Install dependencies:

```bash
pip install -r requirements.txt
```

## Running the Server

Run the server using:

```bash
python app.py
```

Or use uvicorn directly:

```bash
uvicorn app:app --host 0.0.0.0 --port 8080
```

## Configuration

Configure the server port in the `.env` file:

```
SERVER_PORT=8080
```

## API Endpoints

- `POST /api/webhook/message` - Receive real-time webhook events
- `POST /api/webhook/session` - Receive full session records
- `GET /` - Root endpoint (serves index.html if available)
- `GET /static/*` - Static file serving

## Webhook Event Types

### Message Webhook (`/api/webhook/message`)

Receives events with the following structure:

```json
{
  "event": "session.created|conversation.output|session.closed",
  "session_id": "string",
  "role": "ai|user|system",
  "timestamp": "ISO 8601 format",
  "message": "message content"
}
```

### Session Webhook (`/api/webhook/session`)

Receives full session records with the following structure:

```json
{
  "session_id": "string",
  "start_time": "UTC timestamp",
  "end_time": "UTC timestamp",
  "messages": [
    {
      "event": "string",
      "session_id": "string",
      "role": "string",
      "timestamp": "string",
      "message": "string"
    }
  ]
}
```

## Project Structure

```
HookPython/
├── app.py                          # FastAPI main application
├── controller/
│   └── webhook_controller.py      # Webhook endpoints
├── model/
│   ├── message_data.py            # Message data model
│   └── session_data.py            # Session data model
├── static/
│   └── index.html                 # Static HTML page
├── requirements.txt                # Python dependencies
├── README.md                       # Project documentation
└── .env                           # Environment configuration
```

## Migration from Java Version

This Python version was converted from the Java Spring Boot version. Key changes:

- Uses FastAPI instead of Spring Boot
- Uses Pydantic for data validation instead of Jackson
- Uses uvicorn as the ASGI server
- Uses async/await pattern for better performance

## Technology Stack

- **FastAPI**: Web framework
- **Pydantic**: Data validation and serialization
- **uvicorn**: ASGI server
- **python-dotenv**: Environment variable management

## License

This project is part of the NavTalk sample codebase.

