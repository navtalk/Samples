using HookCSharp.Models;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace HookCSharp.Controllers
{
    [ApiController]
    [Route("api/webhook")]
    public class WebhookController : ControllerBase
    {
        private readonly ILogger<WebhookController> _logger;

        public WebhookController(ILogger<WebhookController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Endpoint to receive real-time webhook events.
        /// Handles events such as session creation, conversation output, and session closure.
        /// </summary>
        [HttpPost("message")]
        public ActionResult<string> ReceiveRealTimeWebhook([FromBody] MessageData payload)
        {
            _logger.LogInformation("========== Webhook Event Received ==========");
            _logger.LogInformation("Event: {Event}", payload.Event);
            _logger.LogInformation("Session ID: {SessionId}", payload.SessionId);
            _logger.LogInformation("Role: {Role}", payload.Role);
            _logger.LogInformation("Timestamp: {Timestamp}", payload.Timestamp);
            _logger.LogInformation("Message: {Message}", payload.Message);
            _logger.LogInformation("============================================");

            // Handle business logic based on event type
            switch (payload.Event)
            {
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
                    _logger.LogWarning("Unknown event type: {Event}", payload.Event);
                    break;
            }

            return Ok("Webhook received successfully");
        }

        /// <summary>
        /// Endpoint to receive full session records when a session ends.
        /// Receives the entire session data and logs it in pretty JSON format.
        /// </summary>
        [HttpPost("session")]
        public ActionResult<string> ReceiveSessionRecord([FromBody] SessionData sessData)
        {
            try
            {
                var jsonStr = JsonSerializer.Serialize(sessData, new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                _logger.LogInformation("Full session record received: {Json}", jsonStr);

                // TODO: persist sessData to database or perform other business logic
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process session record");
            }

            return Ok("Session record received successfully");
        }
    }
}
