package com.example.webserver.handler;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class ProxyWebSocketHandler extends TextWebSocketHandler {

    // A map to store client sessions and their corresponding WebSocket proxy connections
    private final Map<WebSocketSession, WebSocketClient> proxies = new ConcurrentHashMap<>();

    // Real license key (used to replace the frontend's license during proxy connection)
    private static final String REAL_LICENSE = "sk_navtalk_key";


    @Override
    public void afterConnectionEstablished(WebSocketSession clientSession) throws Exception {
        // Get the original query parameters from the client's URL (e.g., license=xxx&characterName=man2)
        String query = clientSession.getUri().getQuery();
        String newQuery = rewriteQuery(query);

        // Construct the target URL by changing the domain, but keeping the path and other query parameters
        final String targetUrl = "wss://transfer.navtalk.ai/api/realtime-api"
                + (!newQuery.isEmpty() ? "?" + newQuery : "");

        // Create a proxy WebSocket connection to the target service
        WebSocketClient proxy = new WebSocketClient(new URI(targetUrl)) {
            @Override
            public void onOpen(ServerHandshake handshakedata) {
                // Log when the proxy connection to the target is established
                System.out.println("Proxy connected to target: " + targetUrl);
            }

            @Override
            public void onMessage(String message) {
                try {
                    // Send the received message to the client session if it is still open
                    if (clientSession.isOpen()) {
                        clientSession.sendMessage(new TextMessage(message));
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            @Override
            public void onClose(int code, String reason, boolean remote) {
                try {
                    // Close the client session if the proxy connection is closed
                    if (clientSession.isOpen()) {
                        clientSession.close();
                    }
                } catch (Exception ignore) {}
            }

            @Override
            public void onError(Exception ex) {
                ex.printStackTrace();
            }
        };

        // Connect the proxy and add it to the proxies map
        proxy.connect();
        proxies.put(clientSession, proxy);
        System.out.println("Frontend connected: " + clientSession.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        WebSocketClient proxy = proxies.get(session);
        if (proxy != null && proxy.isOpen()) {
            // Send the client's message to the proxy WebSocket
            proxy.send(message.getPayload());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        // Clean up the proxy connection when the client session is closed
        WebSocketClient proxy = proxies.remove(session);
        if (proxy != null && proxy.isOpen()) {
            proxy.close();
        }
        System.out.println("Connection closed: " + session.getId());
    }

    // This method rewrites the query parameters, replacing the license value with the real license
    private String rewriteQuery(String query) {
        if (query == null) return "";
        StringBuilder sb = new StringBuilder();
        for (String part : query.split("&")) {
            if (part.startsWith("license=")) {
                // Log the license value from the frontend
                System.out.println("License from frontend: " + part.split("=")[1]);

                // ===============================
                // ⚠️ Note:
                // Here, we are hardcoding the license replacement.
                // In a real-world project, you should replace the license value
                // with the actual one, typically fetched from a database, Redis, or a config center.
                // ===============================

                // Replace the license value with the real license
                sb.append("license=").append(REAL_LICENSE);
            } else {
                sb.append(part);
            }
            sb.append("&");
        }
        if (sb.length() > 0) sb.setLength(sb.length() - 1); // Remove the trailing "&"
        return sb.toString();
    }
}
