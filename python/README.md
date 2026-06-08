# Tapsilat Python SDK - E-Commerce Cart Example Application

This project is a **complete example application** for the [tapsilat-py](https://github.com/tapsilat/tapsilat-py) Python SDK library. It demonstrates how to integrate Tapsilat payment system into a Docker-enabled e-commerce cart application using Flask.

> **Note:** This is an official example application showcasing the capabilities and usage of the `tapsilat-py` library for Python developers.

## About Tapsilat Python SDK

This application uses the [tapsilat-py](https://github.com/tapsilat/tapsilat-py) library. With Tapsilat Python SDK, you can easily perform the following operations:

- Order creation, checkout, refund, and cancellation
- Basket item management
- Customer and address information processing
- Installment and payment options management
- Subscription creation and tracking
- Organization, sub-organization, and user management
- Payment term and system metadata queries
- Payment status tracking and webhooks

## Technology Stack

- **Backend:** Python 3.11 + Flask
- **Payment SDK:** [Tapsilat Python SDK](https://github.com/tapsilat/tapsilat-py)
- **Frontend:** Bootstrap 5, FontAwesome
- **Containerization:** Docker & Docker Compose
- **Package Manager:** pip

## Features

- **Complete Tapsilat Python SDK** integration example
- **Flask** web framework implementation exposing all SDK functionalities
- **Bootstrap 5** responsive design for cart and checkout simulator
- **Comprehensive API routes** covering Orders, Subscriptions, Organization, Terms, and System queries
- **Docker** support for easy setup
- **Automatic checkout** redirection and webhooks logging
- **API error handling** and user-friendly error messages

## Installation

### Option 1: Using Docker (Recommended)

1.  Clone the repository:
    ```bash
    git clone https://github.com/tapsilat/examples.git
    cd examples/python
    ```

2.  Configure Environment:
    ```bash
    cp .env.example .env
    # Edit .env and set TAPSILAT_API_KEY and TAPSILAT_BASE_URL
    ```

3.  Run with Docker:
    ```bash
    docker compose up --build
    ```
    Access at [http://localhost:5000](http://localhost:5000) (Docker uses port 5000 by default).

### Option 2: Manual Installation

1.  Create Virtual Environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

2.  Install Dependencies:
    ```bash
    pip install -r requirements.txt
    ```

3.  Run Application:
    ```bash
    python3 app.py
    ```

### 3. Access the Application

Open your browser and navigate to [http://localhost:5001](http://localhost:5001) (Manual execution defaults to port 5001).

## Usage

### 1. E-Commerce Flow
- View products on the main page
- Add products to cart using "Add to Cart" button
- Complete the order with Address and Customer information
- Redirect to Tapsilat Checkout page automatically

### 2. Full API Exploration
The application exposes comprehensive routes under `/api/...` matching the SDK's functionalities:
- **Order:** `/api/order/create`, `/api/order/list`, `/api/order/refund`, `/api/order/cancel`, etc.
- **Subscription:** `/api/subscription/create`, `/api/subscription/list`, etc.
- **Organization:** `/api/organization/settings`, `/api/organization/limits`, `/api/organization/suborganizations`, etc.
- **Term:** `/api/term/create`, `/api/term/refund`, etc.
- **System:** `/api/system/order-statuses`, `/api/system/error-codes`, etc.
- **Webhooks:** `/api/webhooks/logs` to view received webhooks.

## Project Structure

```text
python/
├── .docker/
│   └── Dockerfile         # Docker image definition
├── src/
│   ├── __init__.py
│   └── utils.py           # Utility functions
├── static/                # Static assets (CSS, JS)
├── templates/
│   └── index.html         # Main page (cart interface)
├── webhooks/              # Directory where webhook logs are saved
├── app.py                 # Flask application (Tapsilat integration)
├── requirements.txt       # Python dependencies
├── docker-compose.yml     # Docker configuration
├── .env.example           # Environment example file
└── README.md
```

## API Endpoints (Examples)

### Order Creation (POST /api/order/create)
```json
{
  "amount": 299.99,
  "currency": "TRY",
  "buyer": {
    "name": "Ahmet",
    "surname": "Yılmaz",
    "email": "ahmet@example.com",
    "gsm_number": "+905551234567"
  },
  "basket_items": [
    {
      "id": "1",
      "name": "Headphones",
      "price": 299.99,
      "quantity": 1
    }
  ]
}
```

### Subscription Creation (POST /api/subscription/create)
```json
{
  "amount": 99.99,
  "currency": "TRY",
  "title": "Premium Membership",
  "period": 1,
  "user": {
    "first_name": "Ahmet",
    "last_name": "Yılmaz",
    "email": "ahmet@example.com"
  }
}
```

## Development Notes

- Flask development mode is active, automatic restart on code changes
- Uses the latest version of Tapsilat SDK
- Incoming Webhooks are stored as JSON files under `webhooks/` directory.
- Cart data and API inputs can be directly configured.

## Error Handling

The application includes comprehensive error handling:
- API validation errors
- Tapsilat SDK errors
- Network errors
- Appropriate HTTP 400 responses on failures

## Security

- API key management with environment variables
- Webhook signature validation (SDK side)
- Request header based API credentials (`X-Api-Key` and `X-Api-Url`)

## Support

For any questions or suggestions:
- [GitHub Issues](https://github.com/tapsilat/tapsilat-py/issues)
- [Tapsilat Documentation](https://docs.tapsilat.dev)
