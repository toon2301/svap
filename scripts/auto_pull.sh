#!/usr/bin/env bash
set -euo pipefail

# PythonAnywhere auto-pull & collectstatic + optional webapp reload via API
# Use as Always-on task: bash /home/AntonChudjak/svap/scripts/auto_pull.sh

USERNAME="AntonChudjak"
DOMAIN="antonchudjak.pythonanywhere.com"
PA_API_TOKEN="98abcfc32fb8280f90caac93912bcb6a1b625849"

BASE="/home/$USERNAME/svap"
BACKEND="$BASE/backend"

cd "$BASE"
echo "[AutoPull] Fetching updates..."
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[AutoPull] Up to date. Sleeping 60s..."
  sleep 60
  exit 0
fi

echo "[AutoPull] Resetting to origin/main"
git reset --hard origin/main

echo "[AutoPull] Running collectstatic"
source "$BACKEND/venv/bin/activate"
cd "$BACKEND"
python manage.py collectstatic --noinput --settings=swaply.settings_production

# Try to reload the webapp via PythonAnywhere API
if command -v curl >/dev/null 2>&1; then
  echo "[AutoPull] Triggering webapp reload via API"
  API_URL="https://www.pythonanywhere.com/api/v0/user/$USERNAME/webapps/$DOMAIN/reload/"
  HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Token $PA_API_TOKEN" "$API_URL") || true
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[AutoPull] Reload OK (200)"
  else
    echo "[AutoPull] Reload failed (HTTP $HTTP_CODE) — reload manually from Dashboard"
  fi
else
  echo "[AutoPull] curl not found — skipping API reload"
fi

echo "[AutoPull] Done. Sleeping 10s before exit..."
sleep 10

