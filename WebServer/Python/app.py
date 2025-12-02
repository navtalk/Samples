"""
Python WebSocket Proxy Server
Main application entry point
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from handler.proxy_websocket_handler import ProxyWebSocketHandler
import uvicorn
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(title="WebSocket Proxy Server")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register WebSocket handler
proxy_handler = ProxyWebSocketHandler()

@app.websocket("/api/realtime-api")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Pass query string to handler
    query_string = str(websocket.url.query) if websocket.url.query else ""
    await proxy_handler.handle(websocket, query_string)

@app.get("/")
async def root():
    return {"message": "WebSocket Proxy Server is running"}

if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    port = int(os.getenv("SERVER_PORT", "8810"))
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )

