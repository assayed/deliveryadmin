#!/usr/bin/env bash
#
# container-healthcheck.sh
# -------------------------
# Monitors Docker containers and HTTP endpoints for the FODEK "existing system"
# (uat-api.fodek.net / flod.uat.fodek.net). Runs from a systemd timer every
# minute. It will:
#   1. Detect any container that is not running (or is "unhealthy").
#   2. Attempt automatic recovery (docker start / restart).
#   3. Probe the public HTTP endpoints for 502/down.
#   4. Send an alert ONLY on a state change (down -> alert, recovered -> notice)
#      so you are not spammed every minute.
#
# Config is via environment variables (see /etc/fodek-monitor.env). Anything
# left unset falls back to the defaults below.
#
set -uo pipefail

# ---------------------------------------------------------------------------
# Configuration (override in /etc/fodek-monitor.env)
# ---------------------------------------------------------------------------

# Space-separated container names to watch. Leave empty to auto-watch every
# container that currently exists on the host.
CONTAINERS="${CONTAINERS:-}"

# Space-separated HTTP(S) endpoints to probe. A 502/000 or 5xx counts as down.
ENDPOINTS="${ENDPOINTS:-https://uat-api.fodek.net/ https://flod.uat.fodek.net/}"

# Try to auto-recover a down container by restarting it.
AUTO_RECOVER="${AUTO_RECOVER:-true}"

# Alerting. NOTIFY_METHOD = telegram | webhook | email | none
NOTIFY_METHOD="${NOTIFY_METHOD:-none}"

# Telegram
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# Generic webhook (Discord: append /slack to a Discord webhook, or use Slack's)
WEBHOOK_URL="${WEBHOOK_URL:-}"

# Email (requires a working `mail` / msmtp setup on the host)
EMAIL_TO="${EMAIL_TO:-}"

# Where state + logs live.
STATE_DIR="${STATE_DIR:-/var/lib/fodek-monitor}"
LOG_FILE="${LOG_FILE:-/var/log/fodek-monitor.log}"

HOSTNAME_LABEL="${HOSTNAME_LABEL:-$(hostname)}"

# ---------------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------------
mkdir -p "$STATE_DIR"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE" >/dev/null
}

# Send a message through the configured channel.
notify() {
  local subject="$1"; shift
  local body="$1"
  local text="[$HOSTNAME_LABEL] $subject"$'\n'"$body"

  case "$NOTIFY_METHOD" in
    telegram)
      [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ] || { log "WARN telegram not configured"; return; }
      curl -fsS --max-time 15 \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="${TELEGRAM_CHAT_ID}" \
        --data-urlencode text="${text}" >/dev/null \
        || log "WARN telegram send failed"
      ;;
    webhook)
      [ -n "$WEBHOOK_URL" ] || { log "WARN webhook not configured"; return; }
      # Works for both Slack and Discord (Discord supports {"content": ...}).
      curl -fsS --max-time 15 -H 'Content-Type: application/json' \
        -d "$(printf '{"text":%s,"content":%s}' \
              "$(json_escape "$text")" "$(json_escape "$text")")" \
        "$WEBHOOK_URL" >/dev/null \
        || log "WARN webhook send failed"
      ;;
    email)
      [ -n "$EMAIL_TO" ] || { log "WARN email not configured"; return; }
      printf '%s\n' "$body" | mail -s "[$HOSTNAME_LABEL] $subject" "$EMAIL_TO" \
        || log "WARN email send failed"
      ;;
    none)
      : # alerting disabled; still logged below
      ;;
    *)
      log "WARN unknown NOTIFY_METHOD=$NOTIFY_METHOD"
      ;;
  esac
  log "ALERT $subject :: $body"
}

json_escape() {
  # Minimal JSON string escaper (quotes the result).
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  printf '"%s"' "$s"
}

# Track state per check so we only alert on transitions.
# state file contains "UP" or "DOWN"; returns 0 if the state changed.
state_changed() {
  local key="$1" new="$2"
  local file="$STATE_DIR/${key//\//_}.state"
  local old=""
  [ -f "$file" ] && old="$(cat "$file")"
  echo "$new" > "$file"
  [ "$old" != "$new" ]
}

# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

check_containers() {
  local list="$CONTAINERS"
  if [ -z "$list" ]; then
    list="$(docker ps -a --format '{{.Names}}')"
  fi

  for name in $list; do
    # running? and health (if the image defines a healthcheck)
    local running health restart_policy
    running="$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || echo missing)"
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || echo none)"
    restart_policy="$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$name" 2>/dev/null || echo unknown)"

    if [ "$running" = "true" ] && { [ "$health" = "healthy" ] || [ "$health" = "none" ]; }; then
      if state_changed "container_$name" "UP"; then
        notify "RECOVERED: container '$name' is up" "Container '$name' is running (health=$health, restart=$restart_policy)."
      fi
      continue
    fi

    # Down or unhealthy.
    local detail="running=$running health=$health restart=$restart_policy"
    log "DOWN container '$name' :: $detail"

    if [ "$AUTO_RECOVER" = "true" ] && [ "$running" != "missing" ]; then
      log "Attempting recovery: docker restart $name"
      docker restart "$name" >/dev/null 2>&1 || docker start "$name" >/dev/null 2>&1 || true
      sleep 5
      running="$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || echo missing)"
    fi

    if [ "$running" = "true" ]; then
      # auto-recovery worked; report only if it had been DOWN before
      if state_changed "container_$name" "UP"; then
        notify "RECOVERED: container '$name' restarted" "Container '$name' was down and was auto-restarted successfully."
      fi
    else
      if state_changed "container_$name" "DOWN"; then
        notify "DOWN: container '$name'" "Container '$name' is NOT running and auto-recovery failed ($detail). Check: docker logs $name"
      fi
    fi
  done
}

check_endpoints() {
  for url in $ENDPOINTS; do
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url" || echo 000)"
    if [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
      if state_changed "endpoint_$url" "UP"; then
        notify "RECOVERED: $url" "Endpoint $url is back (HTTP $code)."
      fi
    else
      log "DOWN endpoint $url :: HTTP $code"
      if state_changed "endpoint_$url" "DOWN"; then
        notify "DOWN: $url" "Endpoint $url returned HTTP $code (502/5xx/timeout)."
      fi
    fi
  done
}

# ---------------------------------------------------------------------------
main() {
  if ! command -v docker >/dev/null 2>&1; then
    log "ERROR docker not found in PATH"
    exit 1
  fi
  check_containers
  check_endpoints
}

main "$@"
