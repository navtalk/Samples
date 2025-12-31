using System.Net.WebSockets;

namespace WebServer
{
    public static class WebSocketProxy
    {
        public static async Task HandleAsync(
        HttpContext context,
        ProxyOptions options,
        ILogger logger)
        {
            if (!context.WebSockets.IsWebSocketRequest)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsync("WebSocket request required.");
                return;
            }

            using var clientWs = await context.WebSockets.AcceptWebSocketAsync();

            // Java version: String query = clientSession.getUri().getQuery();
            var rawQuery = context.Request.QueryString.HasValue
                ? context.Request.QueryString.Value!.TrimStart('?')
                : string.Empty;

            var newQuery = RewriteQuery(rawQuery, options.RealLicense, logger);

            var upstreamUrl = BuildUpstreamUrl(options.UpstreamBaseUrl, options.UpstreamPath, newQuery);

            using var upstreamWs = new ClientWebSocket();

            // Optional: forward Origin if needed
            if (context.Request.Headers.TryGetValue("Origin", out var origin))
            {
                upstreamWs.Options.SetRequestHeader("Origin", origin.ToString());
            }

            try
            {
                await upstreamWs.ConnectAsync(new Uri(upstreamUrl), context.RequestAborted);
                logger.LogInformation("Proxy connected to target: {UpstreamUrl}", upstreamUrl);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to connect upstream: {UpstreamUrl}", upstreamUrl);

                // close client websocket
                await CloseSafeAsync(clientWs, WebSocketCloseStatus.InternalServerError, "Upstream connect failed", context.RequestAborted);
                return;
            }

            // Bidirectional relay
            var c2u = RelayAsync(clientWs, upstreamWs, "client->upstream", logger, context.RequestAborted);
            var u2c = RelayAsync(upstreamWs, clientWs, "upstream->client", logger, context.RequestAborted);

            // stop when either side ends
            await Task.WhenAny(c2u, u2c);

            await CloseSafeAsync(clientWs, WebSocketCloseStatus.NormalClosure, "Closed", CancellationToken.None);
            await CloseSafeAsync(upstreamWs, WebSocketCloseStatus.NormalClosure, "Closed", CancellationToken.None);

            logger.LogInformation("Connection closed.");
        }

        private static string BuildUpstreamUrl(string baseUrl, string path, string query)
        {
            var b = baseUrl.TrimEnd('/');
            var p = path.StartsWith("/") ? path : "/" + path;

            return string.IsNullOrWhiteSpace(query)
                ? $"{b}{p}"
                : $"{b}{p}?{query}";
        }

        // Java version rewrites by splitting "&" and replacing "license="
        private static string RewriteQuery(string query, string realLicense, ILogger logger)
        {
            if (string.IsNullOrWhiteSpace(query)) return string.Empty;

            var parts = query.Split('&', StringSplitOptions.RemoveEmptyEntries);
            for (int i = 0; i < parts.Length; i++)
            {
                if (parts[i].StartsWith("license=", StringComparison.OrdinalIgnoreCase))
                {
                    var idx = parts[i].IndexOf('=') + 1;
                    var frontendLicense = idx > 0 && idx < parts[i].Length ? parts[i][idx..] : "";
                    logger.LogInformation("License from frontend: {License}", frontendLicense);

                    parts[i] = "license=" + realLicense;
                }
            }

            return string.Join("&", parts);
        }

        private static async Task RelayAsync(
            WebSocket from,
            WebSocket to,
            string tag,
            ILogger logger,
            CancellationToken ct)
        {
            var buffer = new byte[16 * 1024];

            try
            {
                while (!ct.IsCancellationRequested &&
                       from.State == WebSocketState.Open &&
                       to.State == WebSocketState.Open)
                {
                    WebSocketReceiveResult result;
                    using var ms = new MemoryStream();

                    do
                    {
                        result = await from.ReceiveAsync(buffer, ct);

                        if (result.MessageType == WebSocketMessageType.Close)
                        {
                            await CloseSafeAsync(to,
                                result.CloseStatus ?? WebSocketCloseStatus.NormalClosure,
                                result.CloseStatusDescription ?? "Closed",
                                ct);
                            return;
                        }

                        ms.Write(buffer, 0, result.Count);
                    }
                    while (!result.EndOfMessage);

                    var payload = ms.ToArray();
                    await to.SendAsync(payload, result.MessageType, true, ct);
                }
            }
            catch (OperationCanceledException)
            {
                // ignore
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Relay error ({Tag})", tag);
            }
        }

        private static async Task CloseSafeAsync(
            WebSocket ws,
            WebSocketCloseStatus status,
            string reason,
            CancellationToken ct)
        {
            try
            {
                if (ws.State == WebSocketState.Open || ws.State == WebSocketState.CloseReceived)
                {
                    await ws.CloseAsync(status, reason, ct);
                }
            }
            catch
            {
                // ignore
            }
        }
    }
}
