#!/bin/bash

# Ensure vendor directory exists locally
if [ ! -d "vendor" ]; then
    echo "Installing dependencies..."
    composer update
fi

echo "Starting PHP Development Server on port 5005..."
php -S 0.0.0.0:5005 -t public
