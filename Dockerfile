# Dockerfile
FROM python:3.11-slim

# Nastavenie pracovného adresára
WORKDIR /app

# Skopíruj requirements a backend
COPY backend/requirements.txt ./
COPY backend/ ./backend/

# Inštalácia Python závislostí
RUN pip install --no-cache-dir -r requirements.txt

# Nastavenie prostredia pre Django
ENV DJANGO_SETTINGS_MODULE=swaply.settings_production

# Exponovanie portu
EXPOSE 8000

# Spustenie servera
CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000"]
