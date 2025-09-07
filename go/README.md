# Tapsilat Go SDK - E-Commerce Cart Example Application

This project is a **complete example application** for the [tapsilat-go](https://github.com/tapsilat/tapsilat-go) Go SDK library. It demonstrates how to integrate Tapsilat payment system into a Docker-enabled e-commerce cart application using Gin web framework.

> **Note:** This is an official example application showcasing the capabilities and usage of the `tapsilat-go` library for Go developers.

## About Tapsilat Go SDK

This application uses the [tapsilat-go](https://github.com/tapsilat/tapsilat-go) library. With Tapsilat Go SDK, you can easily perform the following operations:

- Order creation
- Checkout URL retrieval
- Basket item management
- Customer and address information processing
- Installment options
- Payment status tracking

## Technology Stack

- **Backend:** Go 1.21 + Gin Web Framework
- **Payment SDK:** [Tapsilat Go SDK](https://github.com/tapsilat/tapsilat-go)
- **Frontend:** Bootstrap 5, FontAwesome
- **Containerization:** Docker & Docker Compose
- **Package Manager:** Go Modules

## Features

- **Complete Tapsilat Go SDK** integration example
- **Gin** web framework implementation
- **Bootstrap 5** responsive design
- **Product catalog** and cart management
- **Basket items** with detailed order content
- **Address forms** (billing and shipping)
- **Installment** options
- **Docker** support for easy setup
- **Automatic checkout** redirection
- **API error handling** and user-friendly error messages

## Installation

### 1. Environment File

Copy `.env.example` to `.env` and enter your API key:

```bash
cp .env.example .env
```

Edit the `.env` file:
```env
TAPSILAT_API_KEY=your_actual_api_key_here
```

### 2. Run with Docker

```bash
# Build and start the Docker container
docker-compose up -d

# Or use the development script
./dev.sh start
```

### 3. Run in Development Mode (Local)

```bash
# Install dependencies
go mod tidy

# Run the application
./dev.sh dev
# or
go run main.go
```

### 4. Access the Application

Open your browser and navigate to [http://localhost:5005](http://localhost:5005).

## Usage

### 1. Product Cart
- View products on the main page
- Add products to cart using "Add to Cart" button
- Change product quantities and remove items in the cart
- Continue to address information page with "Continue" button

### 2. Address Information
- Fill in billing address information (required)
- Use "Same as billing address" option for shipping address
- Fill in all required fields
- Complete the order with "Complete Order" button

### 3. Payment
- System automatically creates order via Tapsilat API
- When order is successfully created, you'll be redirected to Tapsilat checkout page

## Project Structure

```
go/
├── templates/
│   ├── index.html             # Main page (cart interface)
│   ├── payment_success.html   # Payment success page
│   └── payment_failure.html   # Payment failure page
├── utils/
│   └── utils.go              # Utility functions
├── main.go                   # Main application (Tapsilat integration)
├── go.mod                    # Go module dependencies
├── go.sum                    # Go module checksums
├── docker-compose.yml        # Docker configuration
├── Dockerfile               # Docker image definition
├── dev.sh                   # Development script
├── .env.example             # Environment example file
└── README.md
```

## API Endpoints

### POST /api
Order creation endpoint.

**Request Body:**
```json
{
  "cart": [
    {
      "id": 1,
      "name": "Product Name",
      "price": 99.99,
      "quantity": 2
    }
  ],
  "installment": 1,
  "billing": {
    "contact_name": "John Doe",
    "email": "john@example.com",
    "contact_phone": "555 123 45 67",
    "address": "Sample Address",
    "city": "Istanbul",
    "zip_code": "34000",
    "vat_number": "12345678901"
  },
  "same_address": true
}
```

**Response:**
```json
{
  "success": true,
  "checkout_url": "https://checkout.tapsilat.dev?reference_id=ref-uuid-456",
  "reference_id": "ORDER_1234567890_abcd1234"
}
```

### GET /payment/success
Payment success callback endpoint.

### GET /payment/failure
Payment failure callback endpoint.

### GET /api/payment/status/:reference_id
Get payment status for a specific order.

## Development Script Usage

The `dev.sh` script provides convenient commands for development:

```bash
# Build Docker image
./dev.sh build

# Start development container
./dev.sh start

# Stop development container
./dev.sh stop

# View container logs
./dev.sh logs

# Open shell in container
./dev.sh shell

# Run in local development mode
./dev.sh dev

# Install dependencies
./dev.sh install

# Update dependencies
./dev.sh update

# Setup environment file
./dev.sh env

# Clean up Docker resources
./dev.sh clean

# Show help
./dev.sh help
```

## Go Dependencies

Key dependencies used in this project:

- **github.com/gin-gonic/gin** - HTTP web framework
- **github.com/tapsilat/tapsilat-go** - Tapsilat payment SDK
- **github.com/joho/godotenv** - Environment variable loading
- **github.com/google/uuid** - UUID generation

## Configuration

### Environment Variables

- `TAPSILAT_API_KEY` - Your Tapsilat API key (required)
- `PORT` - Server port (default: 5005)
- `GIN_MODE` - Gin framework mode (debug/release)

### API Configuration

This application uses the **original Tapsilat API** endpoints. The API client is configured to connect directly to Tapsilat's production API servers. Make sure you have a valid API key from your Tapsilat dashboard.

### Docker Configuration

The application is fully containerized with Docker support:

- **Development**: Hot-reload enabled with volume mounting
- **Production**: Multi-stage build for optimized image size
- **Network**: Isolated Docker network for security

## Validation Features

The application includes comprehensive validation:

- **Phone Number** validation (generic format support)
- **Email** validation
- **Required field** validation
- **Cart content** validation
- **Installment** option validation

## Error Handling

- **API errors** are logged and user-friendly messages displayed
- **Validation errors** are shown with specific field information
- **Network errors** are handled gracefully
- **Payment failures** redirect to dedicated error page

## Support

For support and questions:

- **Tapsilat Go SDK**: [GitHub Issues](https://github.com/tapsilat/tapsilat-go/issues)
- **Example Issues**: [This Repository Issues](https://github.com/tapsilat/examples/issues)

## Related Links

- [Tapsilat Go SDK](https://github.com/tapsilat/tapsilat-go)
