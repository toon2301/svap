#!/bin/sh

set -e

RUN_STARTUP_TASKS=${RUN_STARTUP_TASKS:-1}

if [ "$RUN_STARTUP_TASKS" != "1" ]; then
  echo "ℹ️  Skipping startup tasks (RUN_STARTUP_TASKS=$RUN_STARTUP_TASKS)"
  exit 0
fi

echo "🛠️  Running startup tasks..."

# Migrácie MUSIA prejsť. Keď zlyhajú, zámerne padneme (set -e, žiadne "|| continue"),
# aby Railway ponechal predošlý zdravý deploy namiesto servírovania proti neaktuálnej
# schéme. Neaplikovaná migrácia (napr. chýbajúca tabuľka accounts_profilelike z 0090)
# inak skončí ako nejasné 500 na endpointoch, ktoré ju referujú (napr. GET /api/auth/me/).
echo "📦 Applying database migrations..."
python manage.py migrate --noinput

# Best-effort úlohy – tie štart zhodiť nesmú.
python manage.py init_db 2>/dev/null || echo "ℹ️  init_db skipped (not required)"
python manage.py collectstatic --noinput || echo "⚠️  Collectstatic failed, continuing..."
