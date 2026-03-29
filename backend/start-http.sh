#!/bin/sh

set -e

echo "🚀 Starting Swaply HTTP backend with gunicorn..."

./start-common.sh

PORT=${PORT:-8000}
WEB_CONCURRENCY=${WEB_CONCURRENCY:-2}
GUNICORN_THREADS=${GUNICORN_THREADS:-4}
GUNICORN_TIMEOUT=${GUNICORN_TIMEOUT:-120}
GUNICORN_KEEPALIVE=${GUNICORN_KEEPALIVE:-15}

echo "🌐 Starting gunicorn on 0.0.0.0:$PORT with workers=$WEB_CONCURRENCY threads=$GUNICORN_THREADS"
exec gunicorn \
  --bind "0.0.0.0:$PORT" \
  --workers "$WEB_CONCURRENCY" \
  --threads "$GUNICORN_THREADS" \
  --timeout "$GUNICORN_TIMEOUT" \
  --keep-alive "$GUNICORN_KEEPALIVE" \
  --access-logfile - \
  --error-logfile - \
  swaply.wsgi:application
