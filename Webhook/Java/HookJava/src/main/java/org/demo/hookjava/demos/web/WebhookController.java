package org.demo.hookjava.demos.web;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webhook")
public class WebhookController {

    private static final Logger logger = LoggerFactory.getLogger(WebhookController.class);

    /**
     * Receive Webhook POST requests
     */
    @PostMapping
    public ResponseEntity<String> receiveWebhook(@RequestBody WebhookPayload payload) {

        logger.info("=============================");
        logger.info("Received webhook event: {}", payload.getEvent());
        logger.info("Session ID: {}", payload.getSessionId());
        logger.info("Role: {}", payload.getRole());
        logger.info("Timestamp: {}", payload.getTimestamp());
        logger.info("Message: {}", payload.getMessage());
        logger.info("=============================");

        // Handle business logic based on event type
        switch (payload.getEvent()) {
            case "session.created":
                // Handle session start logic
                break;
            case "conversation.output":
                // Handle messages during the session
                break;
            case "session.closed":
                // Handle session end logic
                break;
            default:
                logger.warn("Unknown event type: {}", payload.getEvent());
        }

        return ResponseEntity.ok("Webhook received successfully");
    }

}

