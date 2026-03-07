FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Copy .env file if it exists
COPY .env* ./

# Create a non-root user
RUN useradd -m -u 1000 developer && \
    chown -R developer:developer /app

USER developer

# Expose port
EXPOSE 5000

# Default command
CMD ["python", "app.py"]
