# Tapsilat React SDK Example

This project demonstrates how to integrate the official [`@tapsilat/tapsilat-react`](https://github.com/tapsilat/tapsilat-react) SDK into a modern React application built with TypeScript and Vite.

It showcases React Provider configuration and specialized custom hooks for handling orders, subscriptions, payment terms, and organization settings.

## Features Covered

- **`TapsilatProvider`**: Global client context configuration with API credentials.
- **`useTapsilatOrder`**:
  - `createOrder`: Build and initiate orders with items, buyer profile, addresses, and retrieve checkout URLs.
  - `listOrders`: Fetch paginated orders with filters.
  - `fetchOrder`: Query individual order details by reference ID.
  - `cancelOrder`: Cancel pending orders.
  - `refundOrder`: Issue full or partial refunds.
- **`useTapsilatSubscription`**:
  - `createSubscription`: Register new subscription billing plans.
  - `listSubscriptions`: View active subscription customers.
  - `cancelSubscription`: Terminate subscriptions.
- **`useTapsilatOrganization`**:
  - `getSettings`: Query merchant organization limits and settings.
- **`useTapsilatClient`**: Direct access to the underlying `@tapsilat/tapsilat-js` client instance.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Installation

1. Navigate to the example directory:
   ```bash
   cd examples/react
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Development & Usage

### 1. Configuration
Open `src/main.tsx` or `src/App.tsx` and configure the `TapsilatProvider` with your API credentials:

```tsx
import { TapsilatProvider } from '@tapsilat/tapsilat-react';

createRoot(document.getElementById('root')!).render(
  <TapsilatProvider config={{ apiKey: "your_api_key_here" }}>
    <App />
  </TapsilatProvider>
);
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build for Production
```bash
npm run build
```
Builds the app into `dist/` using TypeScript (`tsc -b`) and Vite.

### 4. Preview Production Build
```bash
npm run preview
```
Runs the local Vite preview server on `http://localhost:4173` (or configured port).

## Project Structure

```text
react/
├── src/
│   ├── assets/        # SVG / Image assets
│   ├── App.tsx        # Main dashboard interface with cart, order, subscription tabs
│   ├── App.css        # Styles for dashboard tabs and status badges
│   ├── index.css      # Base styling
│   └── main.tsx       # App entry point with TapsilatProvider
├── index.html         # HTML entry template
├── vite.config.ts     # Vite configuration
├── package.json       # Project dependencies
└── tsconfig.json      # TypeScript configuration
```

## Security Best Practice

> [!IMPORTANT]
> The React SDK is designed for client-side workflows (rendering checkout buttons, requesting redirect URLs, or polling order status). Sensitive operations such as creating mobile Elements sessions with server API keys or verifying webhook signatures should always occur on your secure backend server.
