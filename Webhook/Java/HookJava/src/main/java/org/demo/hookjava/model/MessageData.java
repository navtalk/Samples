package org.demo.hookjava.model;

public class MessageData {
    private String event;       // session.created、conversation.output、session.closed
    private String sessionId;
    private String role;        // ai、user、system
    private String timestamp;   // ISO 8601
    private String message;     // conversation.output

    // Getter / Setter
    public String getEvent() { return event; }
    public void setEvent(String event) { this.event = event; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}

