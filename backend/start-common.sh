#!/bin/sh

set -e

RUN_STARTUP_TASKS=${RUN_STARTUP_TASKS:-1}

if [ "$RUN_STARTUP_TASKS" != "1" ]; then
  echo "ℹ️  Skipping startup tasks (RUN_STARTUP_TASKS=$RUN_STARTUP_TASKS)"
  exit 0
fi

echo "🛠️  Running startup tasks..."

python manage.py migrate --noinput || echo "⚠️  Migrations failed, continuing..."
python manage.py init_db 2>/dev/null || echo "ℹ️  init_db skipped (not required)"
python manage.py collectstatic --noinput || echo "⚠️  Collectstatic failed, continuing..."
