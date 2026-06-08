#!/bin/bash
set -e

echo "Setting up Tapsilat Python Example Environment..."

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Upgrade pip and forcefully reinstall requirements to avoid local cache issues
echo "Installing dependencies..."
pip install --upgrade pip
pip install --force-reinstall -r requirements.txt

# Run the Flask app
echo "Starting the application..."
python app.py
