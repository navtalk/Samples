package org.demo.hookjava.model;


import java.util.List;

/**
 * Represents a full session record, including all messages and session metadata.
 */
public class SessionData {

    /**
     * All messages in this session.
     * Each message is represented as a WebhookPayload.
     */
    private List<MessageData> messages;

    /**
     * Session start time (UTC).
     */
    private String startTime;

    /**
     * Session end time (UTC).
     */
    private String endTime;

    /**
     * Session ID
     */
    private String sessionId;  // or Long, depends on your payload

    // Getter & Setter
    public List<MessageData> getMessages() {
        return messages;
    }

    public void setMessages(List<MessageData> messages) {
        this.messages = messages;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
}

