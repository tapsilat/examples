# Tapsilat Go SDK Example

This project demonstrates how to use the Tapsilat Go SDK to integrate payment functionalities. It covers the full range of SDK capabilities including order management, subscriptions, and payment terms.

The example includes a web dashboard to visualize these features.

## Prerequisites

- **Docker** (Recommended for easiest setup)
- **Go 1.20+** (If running manually)
- **Tapsilat API Key** (Obtain from your Tapsilat dashboard)

## Installation and Processing

### Option 1: Using Docker (Recommended)

You can run the entire application using Docker Compose without installing Go locally.

1.  Clone the repository:
    ```bash
    git clone https://github.com/tapsilat/examples.git
    cd examples/go
    ```

2.  Configure Environment:
    Create a .env file and add your API key:
    ```bash
    cp .env.example .env
    # Edit .env and set TAPSILAT_API_KEY=your_key_here
    ```

3.  Run with Docker:
    ```bash
    docker compose up --build
    ```

    The dashboard will be available at: http://localhost:5005

### Option 2: Manual Manual Installation

1.  Install Dependencies:
    ```bash
    go mod tidy
    ```

2.  Configure Environment:
    Ensure .env file exists with your TAPSILAT_API_KEY.

3.  Run Application:
    ```bash
    go run main.go
    ```
    Access at http://localhost:5005.

## SDK Usage Guide

This section demonstrates how to use every method available in the Tapsilat Go SDK.

### Initialization

```go
import "github.com/tapsilat/tapsilat-go"

// Initialize with API Key
apiKey := os.Getenv("TAPSILAT_API_KEY")
apiClient := tapsilat.NewAPI(apiKey)

// Initialize with Custom Endpoint (Optional)
// apiClient := tapsilat.NewCustomAPI("https://custom-endpoint.com", apiKey)
```

### Order Management

#### Create Order
Creates a new payment order.

```go
order := tapsilat.Order{
    Locale:            "en",
    ConversationID:    "CONV_123456",
    Amount:            100.0,
    Currency:          "TRY",
    Buyer: tapsilat.OrderBuyer{
        Name: "John", Surname: "Doe", Email: "john@example.com", GsmNumber: "5551234567",
        // Additional buyer fields...
    },
    // Additional fields...
}
resp, err := apiClient.CreateOrder(context.Background(), order)
```

#### Get Order
Retrieve details of a specific order by Reference ID.

```go
order, err := apiClient.GetOrder(context.Background(), "REF_123")
```

#### Get Order by Conversation ID
Retrieve details using your custom Conversation ID.

```go
order, err := apiClient.GetOrderByConversationID(context.Background(), "CONV_123456")
```

#### Get Orders (Paginated)
List orders for a specific buyer.

```go
// Page 1, 10 items per page, for buyer ID "BUYER_1"
orders, err := apiClient.GetOrders(context.Background(), "1", "10", "BUYER_1")
```

#### Get Order List (Filtered)
Advanced filtering for orders.

```go
// Context, Page, PerPage, StartDate, EndDate, OrgID, RelatedRefID
orders, err := apiClient.GetOrderList(context.Background(), 1, 20, "2023-01-01", "2023-12-31", "", "")
```

#### Get Order Submerchants
List submerchants associated with orders.

```go
submerchants, err := apiClient.GetOrderSubmerchants(context.Background(), 1, 10)
```

#### Get Checkout URL
Get the payment page URL for an existing order.

```go
url, err := apiClient.GetCheckoutURL(context.Background(), "REF_123")
```

#### Get Order Status
Get the current status of an order.

```go
status, err := apiClient.GetOrderStatus(context.Background(), "REF_123")
```

#### Get Order Payment Details
Retrieve detailed payment information.

```go
details, err := apiClient.GetOrderPaymentDetails(context.Background(), "REF_123", "")
```

#### Get Order Transactions
List all transactions for an order.

```go
txs, err := apiClient.GetOrderTransactions(context.Background(), "REF_123")
```

#### Cancel Order
Cancel an unpaid or processing order.

```go
resp, err := apiClient.CancelOrder(context.Background(), tapsilat.CancelOrder{
    ReferenceID: "REF_123",
})
```

#### Refund Order
Refund a paid order (full or partial).

```go
resp, err := apiClient.RefundOrder(context.Background(), tapsilat.RefundOrder{
    ReferenceID: "REF_123",
    Amount:      50.0, // Optional for partial
})
```

#### Refund All Order
Full refund of an order.

```go
resp, err := apiClient.RefundAllOrder(context.Background(), "REF_123")
```

#### Terminate Order
Terminate an order process.

```go
resp, err := apiClient.OrderTerminate(context.Background(), "REF_123")
```

#### Manual Callback
Trigger a manual callback for an order.

```go
resp, err := apiClient.OrderManualCallback(context.Background(), "REF_123", "CONV_123")
```

#### Related Update
Update relationship between orders.

```go
resp, err := apiClient.OrderRelatedUpdate(context.Background(), "REF_CHILD", "REF_PARENT")
```

### Payment Terms

#### Create Term
Create a new payment term for an order.

```go
resp, err := apiClient.CreateOrderTerm(context.Background(), tapsilat.OrderPaymentTermCreateDTO{
    ReferenceID: "REF_123",
    Amount:      100.0,
    DueDate:     "2023-12-31",
})
```

#### Get Term
Retrieve a payment term.

```go
term, err := apiClient.GetOrderTerm(context.Background(), "TERM_REF_123")
```

#### Update Term
Update an existing term.

```go
resp, err := apiClient.UpdateOrderTerm(context.Background(), tapsilat.OrderPaymentTermUpdateDTO{
    TermReferenceID: "TERM_REF_123",
    Amount:          150.0,
})
```

#### Delete Term
Delete a payment term.

```go
resp, err := apiClient.DeleteOrderTerm(context.Background(), "REF_123", "TERM_REF_123")
```

#### Refund Term
Refund a specific term payment.

```go
resp, err := apiClient.RefundOrderTerm(context.Background(), tapsilat.OrderTermRefundRequest{
    OrderReferenceID: "REF_123",
    TermReferenceID:  "TERM_REF_123",
    Amount:           50.0,
})
```

### Subscriptions

#### Create Subscription
Create a recurring subscription plan.

```go
resp, err := apiClient.CreateSubscription(context.Background(), tapsilat.SubscriptionCreateRequest{
    Title:  "Gold Plan",
    Amount: 49.90,
    Period: 1, // Monthly
    // ... user details
})
```

#### Get Subscription
Get subscription details.

```go
sub, err := apiClient.GetSubscription(context.Background(), tapsilat.SubscriptionGetRequest{
    ReferenceID: "SUB_REF_123",
})
```

#### List Subscriptions
List all subscriptions.

```go
list, err := apiClient.ListSubscriptions(context.Background(), 1, 10)
```

#### Cancel Subscription
Cancel an active subscription.

```go
err := apiClient.CancelSubscription(context.Background(), tapsilat.SubscriptionCancelRequest{
    SubscriptionID: "SUB_REF_123",
})
```

#### Redirect Subscription
Update subscription redirect URLs.

```go
resp, err := apiClient.RedirectSubscription(context.Background(), tapsilat.SubscriptionRedirectRequest{
    SubscriptionID: "SUB_REF_123",
    SuccessURL:     "https://new-url.com/success",
})
```

### Organization

#### Get Organization Settings
Retrieve settings for the current organization.

```go
settings, err := apiClient.GetOrganizationSettings(context.Background())
```

## Structure

- main.go: Main application logic and API usage.
- templates/: HTML frontend files.
- webhooks/: Captured webhook data.
- .docker/: Docker configuration.
