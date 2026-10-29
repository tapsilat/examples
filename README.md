# Tapsilat — Examples

Welcome to the Tapsilat examples repository — a collection of small, focused example projects and reference implementations demonstrating integrations, usage patterns, and starter code across multiple languages and platforms.

This repository is intended to help developers quickly find working examples in the language or framework they prefer and to serve as a reference when building on top of Tapsilat libraries and APIs.

## Available Examples

| Example Directory | Language / Stack | Default Port | Features Covered |
| :--- | :--- | :--- | :--- |
| **[`go/`](./go)** | Go 1.20+ (net/http) | `:5005` | Orders, Subscriptions, Terms, Submerchants, Elements Sessions, OIP, Webhook Verification |
| **[`typescript/`](./typescript)** | TypeScript / Express | `:8080` | Orders, Subscriptions, Terms, Submerchants, Elements Sessions, OIP, Webhook Verification |
| **[`python/`](./python)** | Python 3.10+ / Flask | `:5001` (local) / `:5000` (Docker) | Orders, Subscriptions, Terms, Submerchants, Elements Sessions, OIP, Webhook Verification |
| **[`rust/`](./rust)** | Rust / Actix-Web | `:5005` | Orders, Subscriptions, Terms, Submerchants, Elements Sessions, Webhook Verification |
| **[`net/`](./net)** | .NET 8.0 (ASP.NET Core) | `:8080` | Orders, Subscriptions, Terms, Submerchants, Elements Sessions, OIP, Webhook Verification |
| **[`php/`](./php)** | PHP 8.2+ / Plain PHP | `:8000` | Orders, Subscriptions, Terms, Submerchants, Elements Sessions, OIP, Webhook Verification |
| **[`java/`](./java)** | Java 17+ / Spring Boot 3 | `:8080` | Orders, Subscriptions, Terms, Submerchants, Elements Sessions, OIP, Webhook Verification |
| **[`ruby/`](./ruby)** | Ruby 3.0+ / Sinatra | `:8080` | Orders, Subscriptions, Terms, Submerchants, Webhook Verification |
| **[`react/`](./react)** | React 19 / Vite / TS | `:5173` (dev) / `:5592` (preview) | React Provider & Hooks (`useTapsilatOrder`, `useTapsilatSubscription`, `useTapsilatOrganization`) |
| **[`woocommerce/`](./woocommerce)** | WordPress / WooCommerce | `:8092` (WP) / `:8093` (PMA) | Complete Dockerized WordPress & WooCommerce store with Tapsilat plugin |

Each subdirectory contains a self-contained example. Look inside each folder for detailed language-specific guides and Docker commands.

## Common Environment Variables

Most examples accept the following environment variables (defined in a `.env` file from `.env.example`):

```bash
# Your secret Tapsilat API key (from panel.tapsilat.dev)
TAPSILAT_API_KEY=your_api_key_here

# Webhook signing secret (used to verify incoming Tapsilat-Signature headers)
TAPSILAT_WEBHOOK_SECRET=your_webhook_secret_here

# Base API endpoint (defaults to production if omitted)
TAPSILAT_BASE_URL=https://api.tapsilat.com
```

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tapsilat/examples.git
   cd examples
   ```

2. **Navigate to your desired language:**
   ```bash
   cd go          # or typescript, python, rust, net, php, java, ruby, react, woocommerce
   ```

3. **Follow the setup instructions in each folder's README:**
   - **Go**: `cp .env.example .env && go run main.go` or `docker compose up --build`
   - **TypeScript**: `cp .env.example .env && npm install && npm start`
   - **Python**: `python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python3 app.py`
   - **Rust**: `cargo run`
   - **.NET**: `dotnet run` or `docker compose up --build`
   - **PHP**: `docker-compose up -d` or `composer install && php -S 0.0.0.0:8000 -t public`
   - **Java**: `mvn spring-boot:run` or `docker compose up --build`
   - **Ruby**: `bundle install && bundle exec ruby app.rb`
   - **React**: `npm install && npm run dev`
   - **WooCommerce**: `docker-compose up -d`

## Key Capabilities Demonstrated

- **Checkout & Orders**: Create orders, generate hosted checkout links, query order details, transactions, and execute refunds or cancellations.
- **Tapsilat Elements Sessions**: Backend creation and lifecycle management (`create`, `get`, `cancel`) of mobile card sessions (`pay` or `tokenize`) for native iOS & Android card sheets.
- **Order Item Payment (OIP)**: Record external item payments taken outside checkout (`POST /order/oip`).
- **Payment Terms & Subscriptions**: Create installment-based payment terms and recurring recurring billing plans.
- **Webhook Signature Verification**: Verify incoming `Tapsilat-Signature` HMAC-SHA256 headers using official SDK helper methods.

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub:  
https://github.com/tapsilat/examples

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE) for details.
