# Tapsilat Python SDK - E-Commerce Cart Example Application

This project is a **complete example application** for the [tapsilat-py](https://github.com/tapsilat/tapsilat-py) Python SDK library. It demonstrates how to integrate Tapsilat payment system into a Docker-enabled e-commerce cart application using Flask.

> **Note:** This is an official example application showcasing the capabilities and usage of the `tapsilat-py` library for Python developers.

## About Tapsilat Python SDK

This application uses the [tapsilat-py](https://github.com/tapsilat/tapsilat-py) library. With Tapsilat Python SDK, you can easily perform the following operations:

- Order creation
- Checkout URL retrieval
- Basket item management
- Customer and address information processing
- Installment options
- Payment status tracking

## Technology Stack

- **Backend:** Python 3.11 + Flask
- **Payment SDK:** [Tapsilat Python SDK](https://github.com/tapsilat/tapsilat-py)
- **Frontend:** Bootstrap 5, FontAwesome
- **Containerization:** Docker & Docker Compose
- **Package Manager:** pip

## Features

- **Complete Tapsilat Python SDK** integration example
- **Flask** web framework implementation
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

# Install dependencies on first setup
docker-compose exec app pip install -r requirements.txt
```

### 3. Access the Application

Open your browser and navigate to [http://localhost:5000](http://localhost:5000).

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
python/
├── templates/
│   └── index.html         # Main page (cart interface)
├── src/
│   ├── __init__.py
│   └── utils.py           # Utility functions
├── app.py                 # Flask application (Tapsilat integration)
├── requirements.txt       # Python dependencies
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Docker image definition
├── dev.sh                # Development script
├── .env.example          # Environment example file
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
      "id": "product_1",
      "name": "Wireless Bluetooth Headphones",
      "price": 299.99,
      "category": "Electronics",
      "quantity": 1
    }
  ],
  "billing": {
    "contact_name": "John Doe",
    "email": "john@example.com",
    "contact_phone": "05551234567",
    "address": "123 Main Street",
    "city": "Istanbul",
    "zip_code": "34000",
    "vat_number": "12345678901"
  },
  "same_address": true,
  "shipping": {
    "contact_name": "John Doe",
    "address": "123 Main Street",
    "city": "Istanbul",
    "zip_code": "34000"
  },
  "installment": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "order_id": "order-uuid-123",
  "reference_id": "ref-uuid-456",
  "checkout_url": "https://checkout.tapsilat.dev?reference_id=ref-uuid-456"
}
```

## Development Script Usage

## API Endpoints

### POST /api
Sipariş oluşturma endpoint'i.

**Request Body:**
```json
{
  "cart": [
    {
      "id": 1,
      "name": "Ürün Adı",
      "price": 299.99,
      "quantity": 2
    }
  ],
  "billing": {
    "contact_name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "contact_phone": "05551234567",
    "vat_number": "12345678901",
    "address": "Örnek Mahallesi, Örnek Sokak No:1",
    "city": "İstanbul",
    "zip_code": "34000"
  },
  "same_address": true,
  "shipping": {
    "contact_name": "Ahmet Yılmaz",
    "contact_phone": "05551234567",
    "address": "Örnek Mahallesi, Örnek Sokak No:1",
    "city": "İstanbul",
    "zip_code": "34000"
  },
  "installment": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sipariş başarıyla oluşturuldu",
  "data": {
    "conversation_id": "CONV_1234567890_abcd1234",
    "checkout_url": "https://checkout.tapsilat.dev/...",
    "total": 599.98
  }
}
```

## Development Script Kullanımı

You can easily manage the development environment using the `dev.sh` script located in the project root:

```bash
# Display all commands
./dev.sh help

# Build Docker image
./dev.sh build

# Start container
./dev.sh start

# Stop container
./dev.sh stop

# Connect to container with shell
./dev.sh shell

# View logs
./dev.sh logs

# Install dependencies
./dev.sh install

# Check container status
./dev.sh status
```

## Development Notes

- Flask development mode is active, automatic restart on code changes
- Uses the latest version of Tapsilat SDK
- Error logging written to `/logs/error.log`
- Cart data stored in localStorage
- Responsive design is mobile-friendly

## Error Handling

The application includes comprehensive error handling:
- API validation errors
- Tapsilat SDK errors
- Network errors
- User-friendly error messages

## Security

- API key management with environment variables
- Input validation and sanitization
- CORS headers
- Error logging

## Support

For any questions or suggestions:
- [GitHub Issues](https://github.com/tapsilat/tapsilat-py/issues)
- [Tapsilat Documentation](https://docs.tapsilat.dev)
