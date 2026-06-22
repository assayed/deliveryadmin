#!/usr/bin/env bash
#
# recover-all.sh
# --------------
# One command to bring BOTH systems back after a reboot:
#   - the Docker "existing system" (uat-api / flod domains)
#   - the FODEK Admin Panel on PM2 (flod.uat.fodek.net/admin, port 3010)
#
# Run as root:  sudo /usr/local/bin/recover-all.sh
#
# Note: PM2 usually runs under a non-root deploy user. Set PM2_USER so the
# admin-panel step runs as the right user.
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PM2_USER="${PM2_USER:-$SUDO_USER}"   # user that owns the PM2 processes

echo "############################################################"
echo "# 1/2  Docker stack"
echo "############################################################"
bash "$SCRIPT_DIR/docker-startup.sh" || echo "docker-startup.sh reported an issue"

echo
echo "############################################################"
echo "# 2/2  FODEK Admin Panel (PM2)"
echo "############################################################"
if [ -n "${PM2_USER:-}" ] && [ "$PM2_USER" != "root" ]; then
  echo "Running admin-startup.sh as user: $PM2_USER"
  sudo -u "$PM2_USER" -H bash "$SCRIPT_DIR/admin-startup.sh" \
    || echo "admin-startup.sh reported an issue"
else
  bash "$SCRIPT_DIR/admin-startup.sh" || echo "admin-startup.sh reported an issue"
fi

echo
echo "All recovery steps finished. Re-check the URLs in a browser."
