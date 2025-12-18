# Tapsilat Ruby SDK Example

A comprehensive dashboard application demonstrating the Tapsilat Ruby SDK capabilities, built with Sinatra.

This example is created for the official Tapsilat Ruby SDK:
https://github.com/tapsilat/tapsilat-ruby

## Features

- **Order Management**
  - Create orders with full customization
  - List orders with filtering and pagination
  - View order details
  - Cancel and refund orders
  - Payment terms management

- **Subscriptions**
  - Create recurring subscriptions
  - List active subscriptions
  - Cancel subscriptions
  - Manage subscription billing

- **Webhook Monitoring**
  - Real-time webhook capture
  - Webhook history viewer
  - Support for success, failure, refund, and cancel callbacks

- **Interactive Dashboard**
  - Modern, responsive UI
  - Multi-step order creation wizard
  - Real-time order status updates
  - Payment success/failure pages

## Quick Start

```bash
# Install dependencies
bundle install

# Create .env file and add your API key
cp .env.example .env
# Edit .env and set TAPSILAT_API_KEY value

# Start the application
bundle exec ruby app.rb
```

The application will run at `http://localhost:8080` (or the port specified in your `.env`).

## Prerequisites

- Ruby 2.6.0 or higher
- Bundler
- Tapsilat API credentials

## Installation

1. Clone the repository and navigate to the example directory:
   ```bash
   cd examples/ruby
   ```

2. Install dependencies:
   ```bash
   bundle install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   ```env
   TAPSILAT_API_KEY=your_api_key_here
   TAPSILAT_BASE_URL=https://panel.tapsilat.dev/api/v1
   PORT=8080
   ```

## Running the Application

### Development

Start the server using `bundle exec`:

```bash
bundle exec ruby app.rb
```

### Using Rack

```bash
bundle exec rackup
```

### Important Note

Always use `bundle exec` when running the application to ensure the local SDK and dependencies are correctly loaded:

```bash
# Correct
bundle exec ruby app.rb

# Wrong - will fail with LoadError
ruby app.rb
```

## Project Structure

```
examples/ruby/
├── app.rb                 # Main application file
├── Gemfile                # Ruby dependencies
├── .env.example           # Environment variables template
├── views/                 # ERB templates
│   ├── index.erb          # Main dashboard
│   ├── payment_success.erb
│   └── payment_failure.erb
├── webhooks/              # Webhook storage (auto-created)
└── README.md
```

## API Endpoints

### Order Management
- `POST /api` - Create a new order
- `GET /api/order/list` - List orders with pagination
- `GET /api/order/details/:reference_id` - Get order details
- `GET /api/payment/status/:reference_id` - Get payment status
- `POST /api/cancel` - Cancel an order
- `POST /api/refund` - Refund an order

### Subscriptions
- `POST /api/subscription` - Create a subscription
- `GET /api/subscription/list` - List subscriptions
- `POST /api/subscription/cancel` - Cancel a subscription

### Webhooks
- `POST /api/callback` - Success webhook
- `POST /api/fail_callback` - Failure webhook
- `POST /api/refund_callback` - Refund webhook
- `POST /api/cancel_callback` - Cancel webhook
- `GET /api/webhooks` - List received webhooks

### Payment Pages
- `GET /payment/success` - Payment success page
- `GET /payment/failure` - Payment failure page

## Usage Examples

### Creating an Order

The dashboard provides an interactive wizard for creating orders:

1. **Step 1**: Configure order settings and add basket items
2. **Step 2**: Enter billing and shipping information
3. **Step 3**: Select payment options and complete the order

Alternatively, use the API directly:

```ruby
require 'net/http'
require 'json'

uri = URI('http://localhost:8080/api')
req = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')
req.body = {
  cart: [
    { id: 1, name: 'Product 1', price: 100.0, quantity: 1 }
  ],
  billing: {
    contact_name: 'John Doe',
    email: 'john@example.com',
    contact_phone: '5551234567',
    address: 'Test Address',
    city: 'Istanbul',
    zip_code: '34000',
    vat_number: '11111111111'
  },
  locale: 'tr',
  currency: 'TRY',
  three_d_force: true
}.to_json

response = Net::HTTP.start(uri.hostname, uri.port) do |http|
  http.request(req)
end

puts response.body
```

### Creating a Subscription

```ruby
uri = URI('http://localhost:8080/api/subscription')
req = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')
req.body = {
  name: 'Monthly Plan',
  amount: 49.90,
  period: 1,
  payment_date: 1,
  subscriber_email: 'subscriber@example.com',
  subscriber_phone: '5551234567'
}.to_json

response = Net::HTTP.start(uri.hostname, uri.port) do |http|
  http.request(req)
end

puts response.body
```

## Webhook Configuration

To receive webhooks from Tapsilat:

1. Configure your webhook URLs in the Tapsilat dashboard:
   - Success: `http://your-domain.com/api/callback`
   - Failure: `http://your-domain.com/api/fail_callback`
   - Refund: `http://your-domain.com/api/refund_callback`
   - Cancel: `http://your-domain.com/api/cancel_callback`

2. Webhooks are automatically saved to the `webhooks/` directory
3. View received webhooks in the dashboard's "Webhook Monitor" section

## Development

### Hot Reloading

The application uses `sinatra/reloader` in development mode for automatic code reloading.

### Adding New Features

1. Add new routes in `app.rb`
2. Create corresponding views in `views/`
3. Update the sidebar navigation in `index.erb`

## Troubleshooting

### Port Already in Use

If port 5006 is already in use, change the `PORT` in your `.env` file:

```env
PORT=8080
```

### API Connection Issues

Verify your API credentials:
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://panel.tapsilat.dev/api/v1/health
```

### Webhook Not Receiving

- Ensure your application is publicly accessible
- Check firewall settings
- Verify webhook URLs in Tapsilat dashboard
- Check `webhooks/` directory permissions

## Production Deployment

For production deployment:

1. Use a production-grade web server (Puma, Unicorn)
2. Set up SSL/TLS certificates
3. Configure environment variables securely
4. Enable logging and monitoring
5. Set up a reverse proxy (Nginx, Apache)

Example with Puma:

```bash
bundle exec puma -p 8080 -e production
```

## License

This example application is provided as-is for demonstration purposes.