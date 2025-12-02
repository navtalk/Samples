# Python WebSocket Proxy Server

A WebSocket proxy server that forwards client WebSocket connections to a target server.

## Features

- Accepts WebSocket connections from clients
- Proxies connections to `wss://transfer.navtalk.ai/api/realtime-api`
- Replaces license parameters during proxy connection
- Handles bidirectional message forwarding
- CORS support

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

Or use the run script:

```bash
python run.py
```

Alternatively, use uvicorn directly:

```bash
uvicorn app:app --host 0.0.0.0 --port 8810
```

## Configuration

Configure the server port in the `.env` file:

```
SERVER_PORT=8810
```

## API Endpoints

- `WS /api/realtime-api` - WebSocket proxy endpoint
- `GET /` - Health check endpoint

## Project Structure

```
PythonWebServer/
├── app.py                          # FastAPI main application
├── run.py                          # Startup script
├── requirements.txt                # Python dependencies
├── README.md                       # Project documentation
├── .gitignore                      # Git ignore file
└── handler/
    ├── __init__.py
    └── proxy_websocket_handler.py  # WebSocket proxy handler
```

## Notes

⚠️ **Important**: The current implementation hardcodes the license replacement. In a production environment, you should fetch the actual license value from a database, Redis, or a configuration center.

## Migration from Java Version

This Python version was converted from the Java Spring Boot version. Key changes:

- Uses FastAPI instead of Spring Boot
- Uses `websockets` library instead of Java-WebSocket
- Uses `uvicorn` as the ASGI server
- Uses asynchronous programming pattern (async/await)

## Technology Stack

- **FastAPI**: Web framework and WebSocket support
- **websockets**: WebSocket client library
- **uvicorn**: ASGI server
- **python-dotenv**: Environment variable management

## License

This project is part of the NavTalk sample codebase.
