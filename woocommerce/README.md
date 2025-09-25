# WordPress Docker Demo Environment

This project is a Docker-based example WordPress environment designed for easy testing and experimentation with the **Tapsilat WooCommerce** payment plugin.

## About the Project

This demo environment includes:
- **WordPress** (latest version)
- **MySQL 8.0** database
- **phpMyAdmin** database management
- **Tapsilat WooCommerce Plugin** (automatically pulled from GitHub)

### Tapsilat WooCommerce Plugin Features

Tapsilat is a secure payment gateway plugin developed for modern e-commerce stores:

- **Secure Payment Processing**: Safe payment integration with Tapsilat API
- **WooCommerce Blocks Support**: Gutenberg checkout page compatibility
- **Multiple Display Modes**: iframe, redirect, or popup options
- **Automatic Order Tracking**: Configurable cron job for order status monitoring
- **Webhook Support**: Real-time payment updates
- **3D Secure Support**: Advanced security authentication
- **Multi-Currency Support**: TRY, USD, EUR support
- **Customizable Design**: Color and logo customization options

## Quick Start

### 1. Start Docker Environment

```bash
docker-compose up -d
```

> **🚀 Automatic Installation**: When Docker starts, it waits for WordPress to be fully ready and then automatically pulls the Tapsilat plugin from GitHub. This process may take 1-3 minutes.

### 2. Access Information

- **WordPress Site**: http://localhost:8092
- **phpMyAdmin**: http://localhost:8093

## Services

- **WordPress**: Runs on port 8092
- **MySQL 8.0**: Database service
- **phpMyAdmin**: Database management on port 8093

## Database Information

- **Database Name**: wordpress_db
- **Username**: wordpress
- **Password**: wordpress_password
- **Root Password**: root_password

### 3. WordPress Installation

1. Go to http://localhost:8092
2. Follow the WordPress installation wizard:
   - Select language
   - Set site title, username, and password
   - Complete the installation

### 4. WooCommerce and Tapsilat Plugin Installation

#### WooCommerce Installation:
1. WordPress Admin Panel → **Plugins** → **Add New**
2. Search for "WooCommerce" and install
3. Activate the plugin
4. Complete the WooCommerce setup wizard

#### Tapsilat WooCommerce Plugin:
> The plugin is automatically pulled from GitHub and installed when Docker starts.

1. WordPress Admin Panel → **Plugins** → **Installed Plugins**
2. Find "Tapsilat Payment Gateway for WooCommerce" plugin
3. Click **Activate**

### 5. Tapsilat Payment Gateway Configuration

1. **WooCommerce** → **Settings** → **Payments** → **Tapsilat**
2. Configure the required settings:
   - **Token**: Your Tapsilat API key (get it from [Tapsilat Panel](https://panel.tapsilat.com))
   - **Currency**: Select one from TRY, USD, EUR
   - **3D Secure**: Enable for security
   - **Payment Form Display**: Choose iframe, redirect, or popup

### 6. Testing

1. Add a product to your store
2. Add the product to cart and go to checkout page
3. Select Tapsilat payment method
4. Complete the test payment process

## Usage

### Starting Services
```bash
docker-compose up -d
```

### Stopping Services
```bash
docker-compose down
```

### Monitoring Installation Process
```bash
# Monitor all service logs
docker-compose logs -f

# Monitor only WordPress service logs
docker-compose logs -f wordpress
```

> **💡 Tip**: You can monitor WordPress logs to check if the Tapsilat plugin has been installed during the first startup.

### WordPress Files

WordPress files are stored in the `./wordpress` directory and synchronized with the container. The Tapsilat plugin is automatically pulled from the GitHub repository to `./wordpress/wp-content/plugins/tapsilat-woocommerce/` directory when Docker starts.

## How to Get Tapsilat API Key?

1. Go to [Tapsilat Panel](https://panel.tapsilat.com)
2. Log in to your account or create a new account
3. Get your API key from the API settings section
4. Enter this key in the Tapsilat settings in WordPress admin panel

## PHP Configuration

PHP settings can be customized in the `config/php.conf.ini` file.

## Notes

- This environment is for **demo and testing purposes** and is not suitable for production use
- WordPress installation will start automatically on first access
- The Tapsilat plugin is automatically pulled from GitHub and always stays up to date
- Database data is stored in Docker volumes
- You can test all features of the Tapsilat plugin
- The Tapsilat plugin uses cron jobs for automatic order status monitoring
- Receives real-time payment updates with webhook support
