# Tapsilat API TypeScript Console App

This example project demonstrates the capabilities of the [Tapsilat TypeScript SDK](https://github.com/tapsilat/tapsilat-js) in a Node.js console application. It walks through a complete flow of order management, payment terms, and subscriptions using mock data against the Tapsilat API.

## Features Covered

The application executes the following operations sequentially:

1.  **System Health & Info**
    *   API Health Check
    *   Retrieve System Order Statuses

2.  **Order Management**
    *   Create a new Order with detailed buyer and basket info
    *   Retrieve Checkout URL
    *   Get Order Details
    *   Check Order Status
    *   Order Accounting & Post-Authorization (Mock)
    *   Cancel Order
    *   List Orders (Pagination)

3.  **Payment Terms (Installments)**
    *   Create a Payment Term for an Order
    *   Update Payment Term
    *   Get Payment Term Details
    *   Delete Payment Term

4.  **Subscription Management**
    *   Create a new Subscription
    *   Get Subscription Details
    *   Get Subscription Payment Link
    *   List Subscriptions
    *   Cancel Subscription

## Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn

## Installation

1.  Clone the repository and navigate to the example directory:
    ```bash
    cd examples/typescript
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

Run the console application:

```bash
npm start
```

You will see colored output in the terminal indicating the progress of each step, the data sent/received, and the success or failure status of each API call.

## Configuration

The SDK configuration is defined at the top of `src/index.ts`. You can modify the `config` object to test with different credentials or environments:

```typescript
const config: TapsilatConfig = {
    bearerToken: 'your_api_token',
    baseURL: 'https://panel.tapsilat.dev/api/v1', 
    debug: true
};
```
