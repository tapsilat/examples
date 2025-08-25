FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    libicu-dev \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    intl

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files
COPY composer.json composer.lock* ./

# Install dependencies
RUN composer install --no-interaction --no-progress --no-dev --optimize-autoloader

# Copy source code
COPY . .

# Copy .env file if it exists
COPY .env* ./

# Create a non-root user
RUN useradd -m -u 1000 developer && \
    chown -R developer:developer /var/www/html

USER developer

# Expose port
EXPOSE 8000

# Default command
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public"]
