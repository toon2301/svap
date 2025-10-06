# Dockerfile pre Django backend v podpriečinku backend/
FROM python:3.11-slim

# Nastavíme premenné prostredia
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Inštalácia systémových závislostí
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Nastavenie pracovného adresára
WORKDIR /app

# Skopírujeme requirements.txt z backend priečinka
COPY backend/requirements.txt .

# Inštalácia Python závislostí
RUN pip install --no-cache-dir -r requirements.txt

# Skopírujeme celý obsah backend priečinka do /app
COPY backend/ .

# Spustenie Gunicorn servera
CMD gunicorn swaply.wsgi:application --bind 0.0.0.0:$PORT --workers=3



