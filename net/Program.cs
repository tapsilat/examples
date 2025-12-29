using Tapsilat.Net;
using DotNetEnv;

var builder = WebApplication.CreateBuilder(args);

// Load .env file if it exists
Env.Load();

// Add services to the container.
builder.Services.AddControllersWithViews();

// Register TapsilatClient
builder.Services.AddSingleton<TapsilatClient>(sp =>
{
    var apiKey = Environment.GetEnvironmentVariable("TAPSILAT_API_KEY") 
                 ?? builder.Configuration["Tapsilat:ApiKey"];
                 
    if (string.IsNullOrEmpty(apiKey))
    {
        // Fallback for development/demo purposes or throw
        Console.WriteLine("Warning: TAPSILAT_API_KEY not found in environment variables.");
    }
    
    return new TapsilatClient(apiKey ?? "");
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
}

app.UseStaticFiles(); // Ensure static files are served
app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
