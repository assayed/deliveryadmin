#!/usr/bin/env bash
#
# admin-startup.sh
# ----------------
# Recovers the FODEK Admin Panel (Node.js app managed by PM2 on port 3010)
# after a reboot, and makes PM2 resurrect it automatically on future boots.
#
# Run it as the user that owns the PM2 process (often the deploy user, NOT
# root). If PM2 runs under root, run with sudo.
#
#     ./admin-startup.sh
#
# Env overrides:
#   APP_DIR    repo root (default: auto-detected from this script's location)
#   APP_NAME   PM2 process name (default: fodek-admin)
#   APP_PORT   port Nginx proxies /admin to (default: 3010)
#   APP_ENTRY  entry script if not yet in PM2 (default: backend/index.js)
#
set -uo pipefail

APP_NAME="${APP_NAME:-fodek-admin}"
APP_PORT="${APP_PORT:-3010}"
APP_ENTRY="${APP_ENTRY:-backend/index.js}"
ENDPOINT="${ENDPOINT:-https://flod.uat.fodek.net/admin}"

# Default APP_DIR = parent of the dir holding this script (repo root).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(dirname "$SCRIPT_DIR")}"

say() { echo -e "\n==> $*"; }

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 not found in PATH for user '$(id -un)'." >&2
  echo "Install (npm i -g pm2) or run this as the user that owns PM2." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
say "1. Restoring saved PM2 processes (pm2 resurrect)"
pm2 resurrect 2>/dev/null || true
sleep 2

# ---------------------------------------------------------------------------
say "2. Ensuring '$APP_NAME' is online"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  echo "'$APP_NAME' not in PM2 yet; starting from $APP_DIR/$APP_ENTRY"
  if [ -f "$APP_DIR/$APP_ENTRY" ]; then
    ( cd "$APP_DIR" && pm2 start "$APP_ENTRY" --name "$APP_NAME" )
  else
    echo "ERROR: entry $APP_DIR/$APP_ENTRY not found. Set APP_DIR/APP_ENTRY." >&2
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
say "3. Saving process list + enabling PM2 on boot (so reboots self-heal)"
pm2 save
# pm2 startup prints a command to run once as root; surface it.
echo "If PM2 is not yet set to start on boot, run the command printed below ONCE:"
pm2 startup systemd 2>/dev/null | grep -E '^sudo ' || \
  echo "  (PM2 startup already configured, or run: pm2 startup systemd)"

# ---------------------------------------------------------------------------
say "4. Status"
pm2 status

say "5. Verifying port $APP_PORT and the public endpoint"
if command -v ss >/dev/null 2>&1; then
  ss -ltnp 2>/dev/null | grep ":$APP_PORT" \
    && echo "    listening on $APP_PORT" \
    || echo "    WARNING: nothing listening on $APP_PORT yet (check 'pm2 logs $APP_NAME')"
fi
local_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:$APP_PORT/" || echo 000)"
echo "    direct  http://127.0.0.1:$APP_PORT/  -> HTTP $local_code"
pub_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$ENDPOINT" || echo 000)"
echo "    public  $ENDPOINT -> HTTP $pub_code"

if [ "$local_code" = "000" ] || [ "$local_code" -ge 500 ] 2>/dev/null; then
  echo
  echo "App is not answering on $APP_PORT. Most likely a crash on startup."
  echo "Inspect:  pm2 logs $APP_NAME --lines 80"
fi

say "Done."
