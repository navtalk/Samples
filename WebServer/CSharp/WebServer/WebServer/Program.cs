
namespace WebServer
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.Configure<ProxyOptions>(builder.Configuration.GetSection("Proxy"));
            builder.Services.AddSingleton(sp => sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<ProxyOptions>>().Value);

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseWebSockets(new WebSocketOptions
            {
                KeepAliveInterval = TimeSpan.FromSeconds(30)
            });

            // Health check (HTTP)
            app.MapGet("/health", () => Results.Ok("OK"));

            // WebSocket proxy endpoint (same as Java: /api/realtime-api)
            app.Map("/api/realtime-api", async (HttpContext ctx, ProxyOptions opt, ILoggerFactory lf) =>
            {
                var logger = lf.CreateLogger("WebSocketProxy");
                await WebSocketProxy.HandleAsync(ctx, opt, logger);
            });

            app.Run();
        }
    }
}
