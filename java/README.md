# Tapsilat Java Dashboard Example

This project is a modern **Spring Boot** dashboard application demonstrating the usage of the **Tapsilat Java SDK**. It mirrors the features of the Python SDK dashboard example, providing a secure checkout flow with multi-step cart, address, and payment redirection.

## Built With
- **Java 17+**
- **Spring Boot 3.x** (The industry standard for Java production apps)
- **Thymeleaf**: For server-side templating
- **Tapsilat Java SDK**: For seamless payment integration
- **Bootstrap 5 & FontAwesome**: For a premium UI/UX

## Prerequisites
- **JDK 17** or higher
- **Maven 3.6+**
- A Tapsilat **API Key** (Bearer Token)

## Setup & Installation

1. **Install the SDK locally**:
   Ensure you have built and installed the Tapsilat Java SDK to your local Maven repository:
   ```bash
   cd sdks/tapsilat-java
   mvn install -DskipTests
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your API Key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```
   TAPSILAT_API_KEY=your_actual_bearer_token_here
   ```

3. **Run the Application**:
   Navigate to the example directory and start the Spring Boot app:
   ```bash
   cd examples/java
   mvn spring-boot:run
   ```

4. **Access the Dashboard**:
   Open [http://localhost:8080](http://localhost:8080) in your browser.

## Key Features Demonstrated
- **Marketplace Flow**: Step-by-step cart and checkout process.
- **Order Management**: List, filter, and inspect detailed order payloads.
- **Subscription Management**: Activate and list recurring billing plans.
- **Webhook Monitor**: Integrated log viewer for incoming payment notifications.
- **Payment Terms**: Management of installments and due dates.
- **Transaction History**: View detailed transaction logs for orders.
- **Advanced Control**: Order termination and manual callbacks.

## Project Structure
- `src/main/java/com/tapsilat/example/config/TapsilatAppConfig.java`: Spring Bean configuration for the SDK.
- `src/main/java/com/tapsilat/example/controller/ApiController.java`: REST endpoints for dashboard logic.
- `src/main/java/com/tapsilat/example/controller/DashboardController.java`: Page routing for the UI.
- `src/main/resources/templates/index.html`: The main Pro Dashboard template.
