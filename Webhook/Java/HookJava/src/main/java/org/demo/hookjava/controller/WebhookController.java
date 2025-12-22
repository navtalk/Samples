package org.demo.hookjava.controller;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.demo.hookjava.model.SessionData;
import org.demo.hookjava.model.MessageData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhook")
public class WebhookController {

    private static final Logger logger = LoggerFactory.getLogger(WebhookController.class);

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Endpoint to receive real-time webhook events.
     * This endpoint handles events such as session creation, conversation output, and session closure.
     *
     * @param payload the webhook payload object
     * @return HTTP 200 OK response
     */
    @PostMapping("/message")
    public ResponseEntity<String> receiveRealTimeWebhook(@RequestBody MessageData payload) {

        logger.info("========== Webhook Event Received ==========");
        logger.info("Event: {}", payload.getEvent());
        logger.info("Session ID: {}", payload.getSessionId());
        logger.info("Role: {}", payload.getRole());
        logger.info("Timestamp: {}", payload.getTimestamp());
        logger.info("Message: {}", payload.getMessage());
        logger.info("============================================");

        // Handle business logic based on event type
        switch (payload.getEvent()) {
            case "session.created":
                // TODO: handle session creation logic
                break;
            case "conversation.output":
                // TODO: handle conversation messages
                break;
            case "session.closed":
                // TODO: handle session closure logic
                break;
            default:
                logger.warn("Unknown event type: {}", payload.getEvent());
        }

        return ResponseEntity.ok("Webhook received successfully");
    }

    /**
     * Endpoint to receive full session records when a session ends.
     * This endpoint receives the entire session data as a map and logs it in JSON format.
     *
     * @param sessData the session record as a map
     * @return HTTP 200 OK response
     */
    @PostMapping("/session")
    public ResponseEntity<String> receiveSessionRecord(@RequestBody SessionData sessData) {
        try {
            String jsonStr = objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(sessData);

            logger.info("Full session record received: {}", jsonStr);

            // TODO: persist sessData to the database or perform other business logic
        } catch (Exception e) {
            logger.error("Failed to process session record", e);
        }

        return ResponseEntity.ok("Session record received successfully");
    }



}

