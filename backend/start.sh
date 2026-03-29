#!/bin/sh

set -e

APP_SERVER_MODE=${APP_SERVER_MODE:-all}

case "$APP_SERVER_MODE" in
  http)
    exec ./start-http.sh
    ;;
  ws|websocket)
    exec ./start-ws.sh
    ;;
  all)
    echo "🚀 Starting Swaply backend in compatibility mode (ASGI HTTP + WebSocket)..."
    ./start-common.sh
    PORT=${PORT:-8000}
    echo "📡 Starting daphne on 0.0.0.0:$PORT"
    exec daphne -b 0.0.0.0 -p "$PORT" swaply.asgi:application
    ;;
  *)
    echo "❌ Unknown APP_SERVER_MODE: $APP_SERVER_MODE"
    echo "Expected one of: all, http, ws"
    exit 1
    ;;
esac
