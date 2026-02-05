FROM python:3.11-slim

WORKDIR /app

# Runtime env
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=swaply.settings_production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Start: použije start.sh, ktorý vždy spustí daphne (ASGI) pre WebSocket
# Railway môže prepísať CMD cez Start Command v Settings - v tom prípade nastav: ./start.sh
CMD ["./start.sh"]
