"""
WebSocket Proxy Handler
Handles WebSocket connections and proxies them to the target server
"""
import asyncio
import logging
import urllib.parse
from typing import Dict
import websockets
from websockets.exceptions import ConnectionClosed
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

class ProxyWebSocketHandler:
    """Handles WebSocket proxy connections"""
    
    # Real license key (used to replace the frontend's license during proxy connection)
    REAL_LICENSE = "sk_navtalk_key"
    
    # Target server URL
    TARGET_BASE_URL = "wss://transfer.navtalk.ai/api/realtime-api"
    
    def __init__(self):
        self.proxies: Dict[str, websockets.WebSocketClientProtocol] = {}
    
    async def handle(self, client_websocket: WebSocket, query_string: str = ""):
        """
        Handle a new WebSocket connection from the client
        
        Args:
            client_websocket: The client WebSocket connection (FastAPI WebSocket)
            query_string: Query string from the WebSocket URL
        """
        client_id = id(client_websocket)
        logger.info(f"Frontend connected: {client_id}")
        
        proxy_websocket = None
        try:
            # Rewrite query parameters
            new_query = self.rewrite_query(query_string)
            
            # Construct the target URL
            target_url = self.TARGET_BASE_URL
            if new_query:
                target_url += "?" + new_query
            
            logger.info(f"Connecting to target: {target_url}")
            
            # Create a proxy WebSocket connection to the target service
            proxy_websocket = await websockets.connect(
                target_url,
                ping_interval=None,  # Disable ping/pong for now
            )
            logger.info(f"Proxy connected to target: {target_url}")
            
            # Store the proxy connection
            self.proxies[str(client_id)] = proxy_websocket
            
            # Create tasks for bidirectional message forwarding
            client_to_proxy = asyncio.create_task(
                self.forward_client_to_proxy(client_websocket, proxy_websocket)
            )
            proxy_to_client = asyncio.create_task(
                self.forward_proxy_to_client(proxy_websocket, client_websocket)
            )
            
            # Wait for either task to complete (connection closed)
            done, pending = await asyncio.wait(
                [client_to_proxy, proxy_to_client],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel pending tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                
        except Exception as e:
            logger.error(f"Error in WebSocket handler: {e}", exc_info=True)
        finally:
            # Clean up
            if str(client_id) in self.proxies:
                del self.proxies[str(client_id)]
            if proxy_websocket:
                try:
                    await proxy_websocket.close()
                except:
                    pass
            logger.info(f"Connection closed: {client_id}")
    
    async def forward_client_to_proxy(self, client_websocket: WebSocket, proxy_websocket):
        """
        Forward messages from client to proxy
        
        Args:
            client_websocket: FastAPI WebSocket (client)
            proxy_websocket: websockets client (proxy)
        """
        try:
            while True:
                try:
                    # Receive message from client (FastAPI WebSocket)
                    data = await client_websocket.receive_text()
                    # Send to proxy (websockets client)
                    await proxy_websocket.send(data)
                except WebSocketDisconnect:
                    logger.info("Client disconnected")
                    break
                except ConnectionClosed:
                    logger.info("Proxy connection closed")
                    break
                except Exception as e:
                    logger.error(f"Error forwarding client->proxy: {e}")
                    break
        except Exception as e:
            logger.error(f"Error in client->proxy forwarding: {e}", exc_info=True)
    
    async def forward_proxy_to_client(self, proxy_websocket, client_websocket: WebSocket):
        """
        Forward messages from proxy to client
        
        Args:
            proxy_websocket: websockets client (proxy)
            client_websocket: FastAPI WebSocket (client)
        """
        try:
            async for message in proxy_websocket:
                try:
                    # Send message to client (FastAPI WebSocket)
                    if isinstance(message, str):
                        await client_websocket.send_text(message)
                    elif isinstance(message, bytes):
                        await client_websocket.send_bytes(message)
                except WebSocketDisconnect:
                    logger.info("Client disconnected")
                    break
                except Exception as e:
                    logger.error(f"Error forwarding proxy->client: {e}")
                    break
        except ConnectionClosed:
            logger.info("Proxy connection closed")
        except Exception as e:
            logger.error(f"Error in proxy->client forwarding: {e}", exc_info=True)
    
    def rewrite_query(self, query: str) -> str:
        """
        Rewrite the query parameters, replacing the license value with the real license
        
        Args:
            query: Original query string
            
        Returns:
            Rewritten query string
        """
        if not query:
            return ""
        
        parts = []
        for part in query.split("&"):
            if part.startswith("license="):
                # Log the license value from the frontend
                license_value = part.split("=", 1)[1] if "=" in part else ""
                logger.info(f"License from frontend: {urllib.parse.unquote(license_value)}")
                
                # ===============================
                # ⚠️ Note:
                # Here, we are hardcoding the license replacement.
                # In a real-world project, you should replace the license value
                # with the actual one, typically fetched from a database, Redis, or a config center.
                # ===============================
                
                # Replace the license value with the real license
                parts.append(f"license={urllib.parse.quote(self.REAL_LICENSE)}")
            else:
                parts.append(part)
        
        return "&".join(parts)

