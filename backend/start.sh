#!/bin/sh
# Start script pre Railway - vždy používa daphne (ASGI) pre WebSocket podporu
# Tento script zabezpečí, že sa nepoužije gunicorn (WSGI)

set -e

echo "🚀 Starting Swaply backend with ASGI (daphne) for WebSocket support..."

# Spusti migrácie
python manage.py migrate --noinput || echo "⚠️  Migrations failed, continuing..."

# Spusti init_db ak existuje (voliteľné)
python manage.py init_db 2>/dev/null || echo "ℹ️  init_db skipped (not required)"

# Zber statických súborov
python manage.py collectstatic --noinput || echo "⚠️  Collectstatic failed, continuing..."

# Spusti daphne (ASGI) - PORT je nastavený Railway
PORT=${PORT:-8000}
echo "🌐 Starting daphne on 0.0.0.0:$PORT"
exec daphne -b 0.0.0.0 -p "$PORT" swaply.asgi:application
