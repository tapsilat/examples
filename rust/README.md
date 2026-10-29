# Tapsilat Rust SDK Example

This project demonstrates how to use the Tapsilat Rust SDK to create orders and handle payments. It includes a simple web interface to simulate a shopping cart and checkout process, mirroring the functionality of the Go example.

## Prerequisites

- Rust 1.70 or higher
- A Tapsilat API Key (you can get one from the Tapsilat dashboard)

## Installation

1. Clone the repository (if you haven't already):
   ```bash
   git clone https://github.com/tapsilat/examples.git
   cd examples/rust
   ```

2. Build the project:
   ```bash
   cargo build
   ```

## Configuration

1. Create a `.env` file in the root directory (you can copy `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and set your Tapsilat credentials:
   ```bash
   TAPSILAT_API_KEY=your_api_key_here
   TAPSILAT_WEBHOOK_SECRET=your_webhook_secret_here
   PORT=5005
   ```

## Running the Application

1. Start the server:
   ```bash
   cargo run
   ```

2. Open your browser and navigate to:
   http://localhost:5005

## Usage

1. **New Order**: Add items to your cart and create orders with hosted checkout links.
2. **Elements Sessions**: Create, view, and cancel native mobile card sheet sessions (`/api/elements/sessions`).
3. **Subscriptions & Terms**: Manage recurring plans and term schedules.
4. **Webhook Signature Verifier**: Test signature validation with `WebhookModule::verify_webhook`.

## Project Structure

- `src/main.rs`: The main application entry point containing the Actix-Web server logic and Tapsilat SDK integration.
- `templates/`: Tera HTML templates for the web interface.
- `static/`: Static assets (CSS, JS, images).
- `Cargo.toml`: Rust package configuration and dependencies.

## Key Features Implemented

- **Order Creation**: Create orders with basket items, billing/shipping addresses.
- **Payment Processing**: Handle payment success/failure callbacks.
- **Subscriptions**: Create and manage subscriptions.
- **Webhooks**: Receive and log webhook events from Tapsilat.
- **Order Management**: List orders, view details, transactions, cancel, and refund.
