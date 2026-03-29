#!/bin/sh

set -e

echo "🚀 Starting Swaply WebSocket backend with daphne..."

RUN_STARTUP_TASKS=${RUN_STARTUP_TASKS:-0} ./start-common.sh

PORT=${PORT:-8000}

echo "📡 Starting daphne on 0.0.0.0:$PORT"
exec daphne -b 0.0.0.0 -p "$PORT" swaply.asgi:application
