package com.example.webserver.handler;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * ProxyWebSocketHandler acts as a WebSocket proxy between clients and the target remote server.
 * It relays both text and binary messages while enforcing a connection limit.
 */
public class ProxyWebSocketHandler extends BinaryWebSocketHandler {

    /**
     * Stores the mapping between local WebSocket sessions and remote WebSocket clients.
     * Key: session ID, Value: WebSocketClient instance
     */
    private final Map<String, WebSocketClient> proxyMap = new ConcurrentHashMap<>();

    /**
     * The real license key to rewrite in client requests.
     */
    private static final String REAL_LICENSE = "sk_navtalk_real_xxx";

    /**
     * Atomic counter to track the number of currently connected clients.
     */
    private static final AtomicInteger ONLINE = new AtomicInteger();

    /**
     * Maximum allowed simultaneous connections.
     */
    private static final int MAX_CONN = 5000;

    /**
     * Called when a new WebSocket connection is established from a client.
     * Sets up a proxy WebSocket connection to the remote server and maps it to this session.
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {

        // Increment online count and check against maximum connections
        if (ONLINE.incrementAndGet() > MAX_CONN) {
            session.close(CloseStatus.SERVICE_OVERLOAD); // Reject connection if limit exceeded
            return;
        }

        // Get the original query parameters from the client request
        String query = session.getUri().getQuery();

        // Rewrite the query to always include the real license key
        String newQuery = rewriteQuery(query);

        // Construct the target WebSocket URL with rewritten query
        String target = "wss://transfer.navtalk.ai/wss/v2/realtime-chat"
                + (newQuery.isEmpty() ? "" : "?" + newQuery);

        // Create a WebSocketClient to connect to the target server
        WebSocketClient proxy = new WebSocketClient(new URI(target)) {

            /**
             * Called when the proxy connection is successfully opened.
             */
            @Override
            public void onOpen(ServerHandshake handshakedata) {
                System.out.println("Proxy connected → " + target);
            }

            /**
             * Called when a text message is received from the remote server.
             * It forwards the message to the client session.
             */
            @Override
            public void onMessage(String message) {
                sendSafe(session, new TextMessage(message));
            }

            /**
             * Called when a binary message is received from the remote server.
             * It forwards the message to the client session.
             */
            @Override
            public void onMessage(java.nio.ByteBuffer bytes) {
                sendSafe(session, new BinaryMessage(bytes));
            }

            /**
             * Called when the proxy WebSocket is closed by the server or network.
             * Ensures the client session is also closed.
             */
            @Override
            public void onClose(int code, String reason, boolean remote) {
                closeSession(session);
            }

            /**
             * Called when an error occurs on the proxy WebSocket.
             * Prints the stack trace and closes the client session.
             */
            @Override
            public void onError(Exception ex) {
                ex.printStackTrace();
                closeSession(session);
            }
        };

        // Connect to the remote server synchronously
        proxy.connectBlocking();   // Wait until connection is established

        // Map this client session ID to the proxy WebSocket
        proxyMap.put(session.getId(), proxy);

        System.out.println("Client connected: " + session.getId());
    }

    /**
     * Handles text messages received from the client.
     * Forwards them to the mapped remote WebSocket.
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {

        WebSocketClient proxy = proxyMap.get(session.getId());

        if (proxy != null && proxy.isOpen()) {
            proxy.send(message.getPayload());
        }
    }

    /**
     * Handles binary messages received from the client.
     * Forwards them to the mapped remote WebSocket.
     */
    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {

        WebSocketClient proxy = proxyMap.get(session.getId());

        if (proxy != null && proxy.isOpen()) {
            proxy.send(message.getPayload());
        }
    }

    /**
     * Called when the client WebSocket connection is closed.
     * Cleans up the proxy mapping and decrements the online counter.
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {

        ONLINE.decrementAndGet();  // Decrement online count

        // Remove and close the proxy WebSocket associated with this session
        WebSocketClient proxy = proxyMap.remove(session.getId());

        if (proxy != null) {
            proxy.close();
        }

        System.out.println("Closed: " + session.getId());
    }

    /**
     * Safely sends a message to the client WebSocket session.
     * Synchronizes on the session to prevent concurrent sends.
     */
    private void sendSafe(WebSocketSession session, WebSocketMessage<?> msg) {

        if (!session.isOpen()) return;

        synchronized (session) {
            try {
                session.sendMessage(msg);
            } catch (Exception ignored) {} // Ignore errors when sending fails
        }
    }

    /**
     * Closes the client WebSocket session safely.
     * Removes the session from the proxy map and decrements the online counter.
     */
    private void closeSession(WebSocketSession session) {

        try {
            if (session.isOpen()) {
                session.close(CloseStatus.SERVER_ERROR);
            }
        } catch (Exception ignored) {}

        proxyMap.remove(session.getId());
        ONLINE.decrementAndGet();
    }

    /**
     * Rewrites the query parameters to ensure the license key is always replaced with the real one.
     * If no license is present, appends it.
     *
     * @param query Original query string
     * @return Rewritten query string containing the correct license
     */
    private String rewriteQuery(String query) {

        if (query == null || query.isEmpty()) {
            return "license=" + REAL_LICENSE;
        }

        StringBuilder sb = new StringBuilder();

        boolean found = false;

        // Iterate over each query parameter
        for (String part : query.split("&")) {

            if (part.startsWith("license=")) {
                sb.append("license=").append(REAL_LICENSE);  // Replace license
                found = true;
            } else {
                sb.append(part);  // Keep other parameters as-is
            }
            sb.append("&");
        }

        // If no license parameter existed, append it
        if (!found) {
            sb.append("license=").append(REAL_LICENSE);
        }

        // Remove the trailing '&'
        sb.setLength(sb.length() - 1);

        return sb.toString();
    }
}
