# Tapsilat PHP SDK E-Commerce Example Application

This project is a Docker-supported e-commerce cart application developed using the **Tapsilat PHP SDK** library. It provides an example implementation for Tapsilat payment system integration.

## About Tapsilat PHP SDK

This application uses the [tapsilat/tapsilat-php](https://github.com/tapsilat/tapsilat-php) library. With Tapsilat PHP SDK, you can easily perform operations such as:

- Order creation
- Payment page URL retrieval
- Basket items management
- Customer and address information processing
- Installment options
- Payment status tracking

## Technologies Used

- **Backend:** PHP 8.2
- **Payment SDK:** [Tapsilat PHP SDK](https://github.com/tapsilat/tapsilat-php)
- **Frontend:** Bootstrap 5, FontAwesome
- **Containerization:** Docker & Docker Compose
- **Dependency Management:** Composer

## Features

- **Tapsilat PHP SDK** full integration
- **Bootstrap 5** responsive design
- **Product catalog** and cart management
- **Basket Items** with detailed order content
- **Address information** forms (billing and shipping)
- **Installment** options
- **Docker** supported easy setup
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
# Build and start Docker container
docker-compose up -d

# Install composer dependencies on first setup
docker-compose exec app composer install
```

### 3. Access Application

Go to [http://localhost:8000](http://localhost:8000) in your browser.

## Usage

### 1. Product Cart
- View products on the main page
- Add products to cart with "Add to Cart" button
- Change product quantities and remove items in cart
- Go to address information page with "Continue" button

### 2. Address Information
- Fill in billing address information (required)
- You can use "Same as billing address" option for shipping address
- Fill in all required fields
- Go to payment step with "Complete Order" button

### 3. Payment
- System automatically creates order with Tapsilat API
- When order is successfully created, you are redirected to Tapsilat checkout page

## Project Structure

```
php/
├── public/
│   ├── index.php          # Main page (cart interface)
│   └── api.php            # Backend API (Tapsilat integration)
├── src/                   # PHP classes (for future use)
├── vendor/                # Composer dependencies
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Docker image definition
├── composer.json         # PHP dependencies
├── .env.example          # Environment example file
└── README.md
```

## API Endpoints

### POST /api.php
Order creation endpoint.

**Request Body:**
```json
{
  "cart": [
    {
      "id": "product_1",
      "name": "Product Name",
      "price": 299.99,
      "category": "Category",
      "quantity": 1
    }
  ],
  "billing": {
    "contact_name": "Full Name",
    "email": "email@example.com",
    "contact_phone": "05551234567",
    "address": "Address",
    "city": "City",
    "vat_number": "12345678901",
    "zip_code": "34000"
  },
  "shipping": {
    // Shipping address (if same_address: false)
  },
  "same_address": true,
  "installment": 1
}
```

**Response:**
```json
{
  "success": true,
  "order_id": "order_123",
  "reference_id": "ref_123",
  "checkout_url": "https://checkout.tapsilat.dev/...",
  "message": "Order created successfully"
}
```

## Docker Commands

```bash
# Start container
docker-compose up -d

# Stop container
docker-compose down

# View logs
docker-compose logs -f

# Enter container
docker-compose exec app bash

# Update composer dependencies
docker-compose exec app composer update
```

## Development

### Tapsilat PHP SDK Usage Example

Basic Tapsilat SDK operations used in this application:

```php
// 1. Create API Client
$client = new TapsilatAPI($apiKey);

// 2. Buyer information
$buyer = new BuyerDTO(
    "John",               // Name
    "Doe",                // Surname
    null,                 // birth_date
    "Istanbul",           // city
    "Turkey",             // country
    "john@example.com",   // email
    "05551234567"         // gsm_number
);

// 3. Basket Items
$basketItems = [];
$basketItemPayer = new BasketItemPayerDTO(null, "payer_ref", null, null, "PERSONAL", null);
$basketItem = new BasketItemDTO(
    "Electronics",        // category1
    null,                 // category2
    0,                    // commission_amount
    null,                 // coupon
    0,                    // coupon_discount
    null,                 // data
    "product_1",          // id
    "PHYSICAL",           // item_type
    "Product Name",       // name
    0,                    // paid_amount
    $basketItemPayer,     // payer
    299.99,               // price (total price)
    1                     // quantity
);
$basketItems[] = $basketItem;

// 4. Create order
$order = new OrderCreateDTO(
    299.99,               // amount
    'TRY',                // currency
    'tr',                 // locale
    $buyer,               // buyer
    $basketItems,         // basket_items
    $billingAddress,      // billing_address
    null,                 // checkout_design
    null,                 // conversation_id
    [1, 2, 3, 6]         // enabled_installments
);

$orderResponse = $client->createOrder($order);

// 5. Get checkout URL
$checkoutUrl = $client->getCheckoutUrl($orderResponse->getReferenceId());
```

### Adding New Products
You can add new products to the `products` array in `public/index.php`:

```javascript
const products = [
    {
        id: 'product_new',
        name: 'New Product',
        price: 199.99,
        image: 'https://via.placeholder.com/250x200?text=New+Product',
        category: 'Category',
        description: 'Product description'
    }
    // ...other products
];
```

### API Settings
You can modify Tapsilat API settings in `public/api.php`:
- Installment options
- Payment methods
- Checkout design
- Metadata information

## Troubleshooting

### Composer Error
```bash
# Clear composer cache
docker-compose exec app composer clear-cache
docker-compose exec app composer install
```

### API Key Error
- Make sure `.env` file is in the correct location
- Check that `TAPSILAT_API_KEY` value is correct
- Restart container: `docker-compose restart`

### Port Error
- If another application is using port 8000, change the port in `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Use port 8001
```

## Links

- **Tapsilat PHP SDK:** [https://github.com/tapsilat/tapsilat-php](https://github.com/tapsilat/tapsilat-php)
- **Tapsilat API Documentation:** [https://docs.tapsilat.dev](https://docs.tapsilat.dev)
- **Composer Packagist:** [https://packagist.org/packages/tapsilat/tapsilat-php](https://packagist.org/packages/tapsilat/tapsilat-php)
