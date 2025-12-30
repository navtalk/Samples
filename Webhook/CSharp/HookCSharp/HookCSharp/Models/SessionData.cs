namespace HookCSharp.Models
{
    /// <summary>
    /// Represents a full session record, including all messages and session metadata.
    /// </summary>
    public class SessionData
    {
        /// <summary>
        /// All messages in this session.
        /// </summary>
        public List<MessageData>? Messages { get; set; }

        /// <summary>
        /// Session start time (UTC).
        /// </summary>
        public string? StartTime { get; set; }

        /// <summary>
        /// Session end time (UTC).
        /// </summary>
        public string? EndTime { get; set; }

        /// <summary>
        /// Session ID.
        /// </summary>
        public string? SessionId { get; set; }
    }
}
