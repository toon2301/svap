#!/usr/bin/env bash
set -euo pipefail

# ======================================================
#  SvAPLY - FULL AUTO DEPLOY TO PYTHONANYWHERE (Windows Git Bash compatible)
# ======================================================
# What it does locally:
#  - Builds Next.js frontend
#  - Zips the static export directory (out or build)
#  - Uploads ZIP to PythonAnywhere via SCP
#  - Uploads a small remote deploy script
#  - Runs the remote deploy script over SSH (unzip + collectstatic)
#
# Requirements locally:
#  - Git Bash (bash, ssh, scp available in PATH)
#  - Node.js + npm
#  - SSH key allowing access to PythonAnywhere (paid account)
#    - Set PA_SSH_KEY env var to your private key path (optional if ssh-agent already has it)
#  - Optional: PA_API_TOKEN to auto-reload web app using PythonAnywhere API
# ======================================================

trap 'echo "[ERROR] Failure on line $LINENO" >&2' ERR

# ---------- Config ----------
USERNAME="AntonChudjak"
HOST="ssh.pythonanywhere.com"
REMOTE_DOMAIN="antonchudjak.pythonanywhere.com"    # for optional API reload

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_ROOT="$SCRIPT_DIR"
FRONTEND_DIR="$LOCAL_ROOT/frontend"
DEFAULT_BUILD_DIR_NAME="out"                        # Next.js static export default
ALT_BUILD_DIR_NAME="build"                          # Fallback name for other setups
ZIP_PATH="$LOCAL_ROOT/frontend-build.zip"

REMOTE_BASE="/home/$USERNAME/svap"
REMOTE_BACKEND="$REMOTE_BASE/backend"
REMOTE_ZIP="$REMOTE_BASE/frontend-build.zip"
REMOTE_SCRIPT_PATH="$REMOTE_BASE/remote_deploy.sh"

# SSH options
declare -a SSH_OPTS
SSH_OPTS=("-o" "StrictHostKeyChecking=no")
if [[ -n "${PA_SSH_KEY:-}" ]]; then
  SSH_OPTS+=("-i" "$PA_SSH_KEY")
fi

# ---------- Helpers ----------
need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] Missing required command: $1" >&2
    exit 1
  fi
}

section() { echo; echo "========== $1"; }
step()    { echo "[+] $1"; }
success() { echo "[✓] $1"; }

# ---------- Pre-flight checks ----------
section "Pre-flight checks"
need npm
need ssh
need scp

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "[ERROR] Frontend directory not found: $FRONTEND_DIR" >&2
  exit 1
fi

# ---------- 1) Build frontend locally ----------
section "1) Building frontend"
(
  cd "$FRONTEND_DIR"
  step "Running: npm run build"
  npm run build
)
success "Frontend build completed"

# Determine build directory
BUILD_DIR="$FRONTEND_DIR/$DEFAULT_BUILD_DIR_NAME"
if [[ ! -d "$BUILD_DIR" ]]; then
  if [[ -d "$FRONTEND_DIR/$ALT_BUILD_DIR_NAME" ]]; then
    BUILD_DIR="$FRONTEND_DIR/$ALT_BUILD_DIR_NAME"
  else
    echo "[ERROR] Neither '$DEFAULT_BUILD_DIR_NAME' nor '$ALT_BUILD_DIR_NAME' found in $FRONTEND_DIR" >&2
    exit 1
  fi
fi
step "Using build directory: $BUILD_DIR"

# ---------- 2) Zip build ----------
section "2) Packing build into ZIP"
rm -f "$ZIP_PATH"

# Prefer 'zip' if available, else PowerShell, else tar -a
if command -v zip >/dev/null 2>&1; then
  step "Creating ZIP via zip: $ZIP_PATH"
  (
    cd "$BUILD_DIR"
    zip -r -q "$ZIP_PATH" .
  )
elif command -v powershell.exe >/dev/null 2>&1 || command -v powershell >/dev/null 2>&1; then
  PS="powershell"
  command -v powershell.exe >/dev/null 2>&1 && PS="powershell.exe"
  step "Creating ZIP via PowerShell: $ZIP_PATH"
  "$PS" -NoProfile -Command "Compress-Archive -Path '$BUILD_DIR/*' -DestinationPath '$ZIP_PATH' -Force" >/dev/null
else
  need tar
  step "Creating ZIP via tar: $ZIP_PATH"
  tar -a -c -f "$ZIP_PATH" -C "$BUILD_DIR" .
fi
success "ZIP created"

# ---------- 3) Upload to PythonAnywhere ----------
section "3) Uploading ZIP and remote script to PythonAnywhere"
if [[ -n "${PA_SSH_KEY:-}" ]]; then
  step "Using SSH key: $PA_SSH_KEY"
fi
step "Uploading ZIP to $USERNAME@$HOST:$REMOTE_ZIP"
scp "${SSH_OPTS[@]}" "$ZIP_PATH" "$USERNAME@$HOST:$REMOTE_ZIP"

# Upload remote deploy script
LOCAL_REMOTE_SCRIPT="$SCRIPT_DIR/scripts/pythonanywhere_remote_deploy.sh"
if [[ ! -f "$LOCAL_REMOTE_SCRIPT" ]]; then
  echo "[ERROR] Missing remote deploy script at: $LOCAL_REMOTE_SCRIPT" >&2
  exit 1
fi
step "Uploading remote script to $REMOTE_SCRIPT_PATH"
scp "${SSH_OPTS[@]}" "$LOCAL_REMOTE_SCRIPT" "$USERNAME@$HOST:$REMOTE_SCRIPT_PATH"
step "chmod +x remote script"
ssh "${SSH_OPTS[@]}" "$USERNAME@$HOST" "chmod +x '$REMOTE_SCRIPT_PATH'"
success "Upload complete"

# ---------- 4) Remote: unzip + collectstatic ----------
section "4) Remote: unzip and collectstatic"
ssh "${SSH_OPTS[@]}" "$USERNAME@$HOST" "bash '$REMOTE_SCRIPT_PATH' '$REMOTE_ZIP'" 
success "Remote steps completed"

# ---------- 5) Optional: reload web app via API ----------
if [[ -n "${PA_API_TOKEN:-}" ]]; then
  section "5) Reloading web app via PythonAnywhere API"
  if command -v curl >/dev/null 2>&1; then
    API_URL="https://www.pythonanywhere.com/api/v0/user/$USERNAME/webapps/$REMOTE_DOMAIN/reload/"
    step "POST $API_URL"
    HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Token $PA_API_TOKEN" "$API_URL") || true
    if [[ "$HTTP_CODE" == "200" ]]; then
      success "Web app reload triggered"
    else
      echo "[WARN] Failed to trigger reload via API (HTTP $HTTP_CODE). Reload via Dashboard." >&2
    fi
  else
    echo "[WARN] curl not available; skip API reload. Reload via Dashboard." >&2
  fi
else
  section "5) Reload"
  echo "Reload your web app in PythonAnywhere Dashboard (Web -> Reload)."
fi

section "DONE"
success "Deployment finished successfully!"
echo "Domain: https://$REMOTE_DOMAIN"


