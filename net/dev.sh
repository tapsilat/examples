#!/bin/bash
set -e

# .env check
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo ".env created from .env.example. Please set TAPSILAT_API_KEY."
    else
        echo "No .env or .env.example found."
    fi
fi

# Docker commands
if [ "$1" == "up" ] || [ -z "$1" ]; then
    echo "Starting Docker container..."
    docker-compose up --build
elif [ "$1" == "down" ]; then
    docker-compose down
elif [ "$1" == "shell" ]; then
    docker-compose run --rm tapsilat-net /bin/bash
else
    echo "Usage: ./dev.sh [up|down|shell]"
fi
