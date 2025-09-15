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

    // 保存客户端session -> 对应的后端代理连接
    private final Map<WebSocketSession, WebSocketClient> proxies = new ConcurrentHashMap<>();

    // 真实 license （这里写死，也可以从配置文件里读）
    private static final String REAL_LICENSE = "sk_navtalk_nrVpx4iGVsy8vfCbCBmkCeFnk8P2iOfL";


    @Override
    public void afterConnectionEstablished(WebSocketSession clientSession) throws Exception {
        // 原始 URL 参数
        String query = clientSession.getUri().getQuery(); // license=xxx&characterName=man2
        String newQuery = rewriteQuery(query);

        // 拼接目标地址：改 domain，保留路径和其他参数
        final String targetUrl = "wss://transfer.navtalk.ai/api/realtime-api"
                + (!newQuery.isEmpty() ? "?" + newQuery : "");

        // 创建到目标服务的代理连接
        WebSocketClient proxy = new WebSocketClient(new URI(targetUrl)) {
            @Override
            public void onOpen(ServerHandshake handshakedata) {
                System.out.println("代理已连接到目标: " + targetUrl);
            }

            @Override
            public void onMessage(String message) {
                try {
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

        proxy.connect();
        proxies.put(clientSession, proxy);
        System.out.println("前端连接进来: " + clientSession.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        WebSocketClient proxy = proxies.get(session);
        if (proxy != null && proxy.isOpen()) {
            proxy.send(message.getPayload());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        WebSocketClient proxy = proxies.remove(session);
        if (proxy != null && proxy.isOpen()) {
            proxy.close();
        }
        System.out.println("连接关闭: " + session.getId());
    }

    private String rewriteQuery(String query) {
        if (query == null) return "";
        StringBuilder sb = new StringBuilder();
        for (String part : query.split("&")) {
            if (part.startsWith("license=")) {
                // ===============================
                // ⚠️ 注意：
                // 这里 demo 是写死替换成一个真实的 license。
                // 实际项目里，你应该根据前端传递的 license 占位符（例如 "Your_token"），
                // 去数据库 / Redis / 配置中心查询真正对应的 license，
                // 然后替换掉。
                // ===============================
                sb.append("license=").append(REAL_LICENSE);
            } else {
                sb.append(part);
            }
            sb.append("&");
        }
        if (sb.length() > 0) sb.setLength(sb.length() - 1); // 去掉最后一个&
        return sb.toString();
    }

}
