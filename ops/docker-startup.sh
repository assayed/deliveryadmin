#!/usr/bin/env bash
#
# docker-startup.sh
# -----------------
# Brings the FODEK "existing system" back up after a reboot (or any time
# Docker went down). Run it manually:
#
#     sudo /usr/local/bin/docker-startup.sh
#
# What it does:
#   1. Starts + enables the Docker daemon (so it also comes up on future boots).
#   2. If a compose file is given/found, runs `docker compose up -d`;
#      otherwise starts every existing container.
#   3. Sets restart policy to `unless-stopped` on all containers so they
#      auto-recover on the NEXT reboot without this script.
#   4. Prints status and probes the public endpoints.
#
# Optional: pass a compose file path as the first arg, or set COMPOSE_FILE.
#   sudo ./docker-startup.sh /opt/fodek/docker-compose.yml
#
set -uo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-${1:-}}"
RESTART_POLICY="${RESTART_POLICY:-unless-stopped}"
ENDPOINTS="${ENDPOINTS:-https://uat-api.fodek.net/ https://flod.uat.fodek.net/}"

say() { echo -e "\n==> $*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
say "1. Ensuring the Docker daemon is running and enabled on boot"
systemctl enable --now docker docker.socket
if ! systemctl is-active --quiet docker; then
  echo "Docker daemon failed to start. Check: journalctl -u docker -n 50" >&2
  exit 1
fi
echo "Docker daemon: $(systemctl is-active docker) (enabled=$(systemctl is-enabled docker))"

# ---------------------------------------------------------------------------
say "2. Starting containers"
# Auto-discover a compose file if none was provided.
if [ -z "$COMPOSE_FILE" ]; then
  for f in /opt/*/docker-compose.yml /srv/*/docker-compose.yml \
           /root/*/docker-compose.yml ./docker-compose.yml; do
    [ -f "$f" ] && COMPOSE_FILE="$f" && break
  done
fi

if [ -n "$COMPOSE_FILE" ] && [ -f "$COMPOSE_FILE" ]; then
  echo "Using compose file: $COMPOSE_FILE"
  docker compose -f "$COMPOSE_FILE" up -d
else
  echo "No compose file found; starting all existing containers."
  ids="$(docker ps -aq)"
  if [ -n "$ids" ]; then
    docker start $ids
  else
    echo "WARNING: no containers exist on this host." >&2
  fi
fi

# ---------------------------------------------------------------------------
say "3. Enforcing restart policy ($RESTART_POLICY) so this is the LAST manual start"
ids="$(docker ps -aq)"
[ -n "$ids" ] && docker update --restart "$RESTART_POLICY" $ids >/dev/null
docker inspect -f '    {{.Name}} => {{.HostConfig.RestartPolicy.Name}}' $ids 2>/dev/null

# ---------------------------------------------------------------------------
say "4. Current container status"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

say "5. Probing public endpoints"
for url in $ENDPOINTS; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url" || echo 000)"
  if [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
    echo "    OK   $url (HTTP $code)"
  else
    echo "    DOWN $url (HTTP $code) -- check 'docker logs <name>' and nginx"
  fi
done

say "Done. If endpoints still 502, inspect the upstream container's logs."
