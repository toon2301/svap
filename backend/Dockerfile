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

# Make start scripts executable
RUN chmod +x start.sh start-common.sh start-http.sh start-ws.sh

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Start: použije start.sh, ktorý podľa APP_SERVER_MODE spustí
# - gunicorn pre HTTP (`http`)
# - daphne pre WebSocket (`ws`)
# - alebo kompatibilný daphne all-in-one režim (`all`, default)
CMD ["./start.sh"]
