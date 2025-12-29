# Tapsilat .NET SDK Example

This project demonstrates the usage of the Tapsilat .NET SDK in an ASP.NET Core MVC application. It features a comprehensive Dashboard UI mirroring the functionality of the Go and Rust examples, including:

- **Order Management**: Create, list, details, cancel, and refund orders.
- **Subscriptions**: Create, list, and cancel subscriptions.
- **Payment Terms**: Manage payment terms.
- **Webhook Monitor**: View incoming webhooks in real-time.

## Prerequisites

- .NET 8.0 SDK (for local development)
- Docker & Docker Compose (for containerized run)
- Tapsilat API Key

## Configuration

Set your API key in the `.env` file or environment variables.

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and set `TAPSILAT_API_KEY`.

## Running with Docker (Recommended)

To run the application using Docker, run the following command from this directory:

```bash
docker-compose up --build
```

The application will be accessible at [http://localhost:8080](http://localhost:8080).

## Running Locally

1. Restore dependencies:
   ```bash
   dotnet restore
   ```

2. Run the application:
   ```bash
   TAPSILAT_API_KEY=your_api_key dotnet run
   ```

## Project Structure

- `Controllers/`: Contains MVC controllers.
  - `HomeController.cs`: Handles page navigation.
  - `ApiController.cs`: Handles API requests (Order creation, etc.).
- `Models/`: Contains ViewModels.
- `Views/`: Contains Razor views.
- `Program.cs`: Application entry point and DI configuration.
