# Tapsilat Go SDK Example

This project demonstrates how to use the Tapsilat Go SDK to create orders and handle payments. It includes a simple web interface to simulate a shopping cart and checkout process.

## Prerequisites

- Go 1.20 or higher
- A Tapsilat API Key (you can get one from the Tapsilat dashboard)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tapsilat/examples.git
   cd examples/go
   ```

2. Install dependencies:
   ```bash
   go mod download
   ```

## Configuration

1. Create a `.env` file in the root directory (you can copy `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and set your Tapsilat API key:
   ```bash
   TAPSILAT_API_KEY=your_api_key_here
   PORT=5005
   ```

## Running the Application

1. Start the server:
   ```bash
   go run main.go
   ```

2. Open your browser and navigate to:
   http://localhost:5005

## Usage

1. Add items to your cart.
2. Proceed to the "Address Information" step. The form is pre-filled with mock data for testing purposes.
3. Proceed to the "Payment" step.
4. Select an installment option (default is Cash Payment).
5. Click "Complete Order" to initiate the payment process with Tapsilat.

## Project Structure

- `main.go`: The main application entry point containing the server logic and Tapsilat SDK integration.
- `templates/`: HTML templates for the web interface.
- `static/`: Static assets (CSS, JS, images).
- `go.mod`: Go module definition.
