#!/usr/bin/env bash
set -euo pipefail

# PythonAnywhere remote deploy helper
# - Unzips provided ZIP into /home/AntonChudjak/svap/out
# - Runs collectstatic under swaply.settings_production

USERNAME="AntonChudjak"
REMOTE_BASE="/home/$USERNAME/svap"
REMOTE_BACKEND="$REMOTE_BASE/backend"
REMOTE_OUT_DIR="$REMOTE_BASE/out"

ZIP_PATH="${1:-}"
if [[ -z "$ZIP_PATH" ]]; then
  echo "[Remote ERROR] ZIP path argument is required" >&2
  exit 1
fi

echo "[Remote] Using ZIP: $ZIP_PATH"
if [[ ! -f "$ZIP_PATH" ]]; then
  echo "[Remote ERROR] ZIP file not found: $ZIP_PATH" >&2
  exit 1
fi

echo "[Remote] Preparing out directory: $REMOTE_OUT_DIR"
mkdir -p "$REMOTE_OUT_DIR"
rm -rf "$REMOTE_OUT_DIR"/*

if command -v unzip >/dev/null 2>&1; then
  echo "[Remote] Unzipping with unzip"
  unzip -o "$ZIP_PATH" -d "$REMOTE_OUT_DIR" >/dev/null
else
  echo "[Remote] 'unzip' not available, using Python zipfile module"
  python3 - <<'PY'
import sys, zipfile
from pathlib import Path
zip_path = Path(sys.argv[1])
dst = Path(sys.argv[2])
with zipfile.ZipFile(zip_path, 'r') as zf:
    zf.extractall(dst)
print('Extracted to', dst)
PY
  "$ZIP_PATH" "$REMOTE_OUT_DIR"
fi

if [[ ! -d "$REMOTE_BACKEND" ]]; then
  echo "[Remote ERROR] Backend directory not found: $REMOTE_BACKEND" >&2
  exit 1
fi

echo "[Remote] Activating venv and running collectstatic"
source "$REMOTE_BACKEND/venv/bin/activate"
cd "$REMOTE_BACKEND"
python manage.py collectstatic --noinput --settings=swaply.settings_production

echo "[Remote] Cleaning up ZIP"
rm -f "$ZIP_PATH"

echo "[Remote] Completed successfully"


