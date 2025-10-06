# Opravený Dockerfile
FROM python:3.11-slim

# Inštalácia systémových závislostí, ktoré ste mali v logoch
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Nastavenie pracovného adresára
WORKDIR /app

# Skopíruj iba súbor s požiadavkami ako prvý, aby sa využil Docker cache
COPY backend/requirements.txt .

# Inštalácia Python závislostí
RUN pip install --no-cache-dir -r requirements.txt

# Skopírovanie celého kódu aplikácie z priečinka backend do /app
COPY backend/ .

# Spustenie Gunicorn servera s premennými od Railway
# Používame "shell" formu CMD, aby sa správne načítala premenná $PORT
CMD gunicorn swaply.wsgi:application --bind 0.0.0.0:$PORT --workers=3

