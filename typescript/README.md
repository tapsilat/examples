# Tapsilat API TypeScript & Express Dashboard Example

This example project demonstrates the capabilities of the [@tapsilat/tapsilat-js](https://github.com/tapsilat/tapsilat-js) SDK in an Express web application dashboard and console runner. It covers order management, Elements sessions for mobile card sheets, order item payments (OIP), payment terms, subscriptions, and webhook signature verification.

## Features Covered

1.  **Web Dashboard (Express & HTML)**
    *   **New Order**: Create orders with basket items, buyer details, and retrieve checkout URLs.
    *   **Order Management**: List orders, inspect order details, and retrieve transactions.
    *   **Elements Sessions**: Create, retrieve, and cancel mobile SDK card sessions (POST `/elements/sessions`).
    *   **Order Item Payments (OIP)**: Record order item payments taken outside the checkout (POST `/order/oip`).
    *   **Payment Terms**: Create, update, view, and refund order payment terms.
    *   **Subscriptions**: Create and cancel recurring subscriptions.
    *   **Webhook Monitor & Verifier**: Receive webhooks and verify `Tapsilat-Signature` using `sdk.verifyWebhook()` and `WebhookEvent`.

2.  **Console Runner (`src/index.ts`)**
    *   Sequential execution of system health, orders, terms, and subscriptions.

## Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn

## Installation

1.  Navigate to the example directory:
    ```bash
    cd examples/typescript
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

### Run the Web Dashboard

```bash
npm start
```
The dashboard will be available at `http://localhost:8080`.

### Configuration

You can provide environment variables:
```bash
export TAPSILAT_API_KEY="your_api_key_here"
export TAPSILAT_WEBHOOK_SECRET="your_webhook_secret_here"
export PORT=8080
```
