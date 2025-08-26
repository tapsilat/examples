#!/bin/bash

# Tapsilat Python E-Commerce Cart Development Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build     - Build the Docker image"
    echo "  start     - Start the development container"
    echo "  stop      - Stop the development container"
    echo "  restart   - Restart the development container"
    echo "  shell     - Open a shell in the development container"
    echo "  logs      - Show container logs"
    echo "  install   - Install dependencies"
    echo "  update    - Update dependencies"
    echo "  clean     - Clean up containers and images"
    echo "  status    - Show container status"
    echo "  env       - Check and setup .env file in container"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build"
    echo "  $0 start"
    echo "  $0 shell"
    echo "  $0 logs"
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found!"
        print_status "Creating .env file from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_warning "Please edit .env file and enter your Tapsilat API key"
        else
            print_error ".env.example file not found!"
            exit 1
        fi
    fi
}

# Function to check if .env file exists in container
check_env_in_container() {
    print_status "Checking .env file in container..."
    if docker-compose exec app test -f .env; then
        print_success ".env file exists in container"
    else
        print_status "Copying .env file to container..."
        docker-compose exec app cp .env.example .env
        print_success ".env file created in container"
    fi
}

# Function to build the image
build_image() {
    print_status "Building Docker image..."
    docker-compose build
    print_success "Docker image built successfully!"
}

# Function to start the container
start_container() {
    check_env_file
    print_status "Starting development container..."
    docker-compose up -d
    print_success "Development container started!"
    print_status "Application is running at: http://localhost:5000"
    print_status "Use '$0 logs' to see container logs"
    print_status "Use '$0 shell' to access the container"
}

# Function to stop the container
stop_container() {
    print_status "Stopping development container..."
    docker-compose down
    print_success "Development container stopped!"
}

# Function to restart the container
restart_container() {
    print_status "Restarting development container..."
    docker-compose restart
    print_success "Development container restarted!"
}

# Function to open a shell
open_shell() {
    print_status "Opening shell in development container..."
    docker-compose exec app /bin/bash
}

# Function to show logs
show_logs() {
    print_status "Showing container logs..."
    docker-compose logs -f app
}

# Function to install dependencies
install_deps() {
    print_status "Installing Python dependencies..."
    docker-compose exec app pip install -r requirements.txt
    print_success "Dependencies installed successfully!"
}

# Function to update dependencies
update_deps() {
    print_status "Updating Python dependencies..."
    docker-compose exec app pip install --upgrade -r requirements.txt
    print_success "Dependencies updated successfully!"
}

# Function to show status
show_status() {
    print_status "Container status:"
    docker-compose ps
}

# Function to clean up
clean_up() {
    print_warning "This will remove all containers and images related to this project."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up containers and images..."
        docker-compose down --rmi all --volumes
        print_success "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Main script logic
case "$1" in
    "build")
        build_image
        ;;
    "start")
        start_container
        ;;
    "stop")
        stop_container
        ;;
    "restart")
        restart_container
        ;;
    "shell")
        open_shell
        ;;
    "logs")
        show_logs
        ;;
    "install")
        install_deps
        ;;
    "update")
        update_deps
        ;;
    "clean")
        clean_up
        ;;
    "status")
        show_status
        ;;
    "env")
        check_env_in_container
        ;;
    "help"|"")
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac
