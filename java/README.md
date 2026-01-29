# Tapsilat Java SDK Example

This project demonstrates how to use the Tapsilat Java SDK to integrate payment functionalities. It covers the full range of SDK capabilities including order management, subscriptions, and payment terms.

The example includes a web dashboard to visualize these features.

## Prerequisites

- **Docker** (Recommended for easiest setup)
- **Java 17+** (If running manually)
- **Maven** (If running manually)
- **Tapsilat API Key** (Obtain from your Tapsilat dashboard)

## Installation and Processing

### Option 1: Using Docker (Recommended)

You can run the entire application using Docker Compose without installing Java locally.

1.  Clone the repository:
    ```bash
    git clone https://github.com/tapsilat/examples.git
    cd examples/java
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

    The dashboard will be available at: http://localhost:8080

### Option 2: Manual Manual Installation

1.  Build the project:
    ```bash
    ./mvnw clean install
    ```

2.  Configure Environment:
    Ensure .env file exists with your TAPSILAT_API_KEY.

3.  Run Application:
    ```bash
    ./mvnw spring-boot:run
    ```
    Access at http://localhost:8080.

## SDK Usage Guide

This section demonstrates how to use methods available in the Tapsilat Java SDK.

### Initialization

```java
import com.tapsilat.TapsilatClient;
import com.tapsilat.config.TapsilatConfig;

String apiKey = System.getenv("TAPSILAT_API_KEY");
TapsilatConfig config = TapsilatConfig.builder()
    .token(apiKey)
    .baseUrl("https://panel.tapsilat.dev")
    .build();

TapsilatClient client = new TapsilatClient(config);
```

### Order Management

#### Create Order
Creates a new payment order.

```java
OrderRequestBuilder builder = OrderRequestBuilder.newBuilder()
    .amount(new BigDecimal("100.0"))
    .currency("TRY")
    .locale("en")
    .buyer(buyer)
    .basketItems(items);

OrderResponse response = client.orders().create(builder.build());
```

#### Get Order
Retrieve details of a specific order by Reference ID.

```java
OrderResponse order = client.orders().get("REF_123");
```

#### Get Order by Conversation ID
Retrieve details using your custom Conversation ID.

```java
OrderResponse order = client.orders().getByConversationId("CONV_123456");
```

#### Get Order List
List orders with filtering.

```java
Map<String, Object> list = client.orders().list(
    1, 10, "2023-01-01", "2023-12-31", null, null, null
);
```

#### Get Order Submerchants
List submerchants.

```java
Map<String, Object> subs = client.orders().getSubmerchants(1, 10);
```

#### Get Order Status
Get the current status of an order.

```java
Map<String, Object> status = client.orders().getStatus("REF_123");
```

#### Cancel Order
Cancel an unpaid or processing order.

```java
client.orders().cancel("REF_123");
```

#### Refund Order
Refund a paid order.

```java
RefundOrderRequest refundReq = new RefundOrderRequest();
refundReq.setReferenceId("REF_123");
refundReq.setAmount(new BigDecimal("50.0")); // Optional partial refund
client.orders().refund(refundReq);
```

#### Terminate Order
Terminate an order process.

```java
client.orders().terminate("REF_123");
```

#### Manual Callback
Trigger a manual callback.

```java
OrderManualCallbackRequest req = new OrderManualCallbackRequest();
req.setReferenceId("REF_123");
client.orders().manualCallback(req);
```

### Payment Terms

#### Create Term
Create a new payment term.

```java
OrderPaymentTermCreateRequest req = new OrderPaymentTermCreateRequest();
req.setOrderId("REF_123");
req.setAmount(new BigDecimal("100.0"));
req.setDueDate("2023-12-31");
client.orders().createTerm(req);
```

#### Update Term
Update an existing term.

```java
OrderPaymentTermUpdateRequest req = new OrderPaymentTermUpdateRequest();
req.setTermReferenceId("TERM_REF_123");
req.setAmount(new BigDecimal("150.0"));
client.orders().updateTerm(req);
```

#### Delete Term
Delete a payment term.

```java
client.orders().deleteTerm("REF_123", "TERM_REF_123");
```

#### Refund Term
Refund a specific term payment.

```java
OrderTermRefundRequest req = new OrderTermRefundRequest();
req.setReferenceId("TERM_REF_123");
req.setAmount(new BigDecimal("50.0"));
client.orders().refundTerm(req);
```

### Subscriptions

#### Create Subscription
Create a recurring subscription plan.

```java
SubscriptionCreateRequest req = new SubscriptionCreateRequest();
req.setTitle("Gold Plan");
req.setAmount(new BigDecimal("49.90"));
req.setPeriod(1);
// ... user details
client.subscriptions().create(req);
```

#### List Subscriptions
List all subscriptions.

```java
Map<String, Object> list = client.subscriptions().list(1, 10);
```

#### Cancel Subscription
Cancel an active subscription.

```java
SubscriptionCancelRequest req = new SubscriptionCancelRequest();
req.setReferenceId("SUB_REF_123");
client.subscriptions().cancel(req);
```

### Organization

#### Get Organization Settings
Retrieve settings for the current organization.

```java
Map<String, Object> settings = client.orders().getOrganizationSettings();
```

## Structure

- src/main/java: Java source code (Spring Boot Controller & Logic).
- src/main/resources/templates: HTML frontend templates.
- webhooks: Captured webhook data.
- Dockerfile / docker-compose.yml: Docker configuration.
