namespace WebServer
{
    public sealed class ProxyOptions
    {
        public string UpstreamBaseUrl { get; set; } = "wss://transfer.navtalk.ai";
        public string UpstreamPath { get; set; } = "/api/realtime-api";
        public string RealLicense { get; set; } = "sk_navtalk_key";
    }
}
