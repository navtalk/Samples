namespace HookCSharp.Models
{
    public class MessageData
    {
        // session.created / conversation.output / session.closed
        public string? Event { get; set; }

        public string? SessionId { get; set; }

        // ai / user / system
        public string? Role { get; set; }

        // ISO 8601
        public string? Timestamp { get; set; }

        // conversation.output text
        public string? Message { get; set; }
    }
}
