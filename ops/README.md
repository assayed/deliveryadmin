# FODEK UAT — Docker auto-start & monitoring runbook

Server: Hostinger VPS `72.60.46.114` (Ubuntu 24.04)

Two systems on this host:

- **Existing system** — Docker containers behind Nginx (`uat-api.fodek.net`,
  `flod.uat.fodek.net`). This is what goes 502 after reboots.
- **FODEK Admin Panel** — this repo, Node.js on PM2, port `3010`.

This folder fixes the root cause (containers not restarting on reboot) and adds
a self-healing health check that alerts you when something is down.

---

## Part 1 — Make Docker containers auto-start on reboot (and verify)

### 1.1 Confirm the Docker daemon starts on boot

```bash
systemctl is-enabled docker        # want: enabled
systemctl is-enabled docker.socket # want: enabled (or static)
systemctl enable --now docker docker.socket
```

### 1.2 Confirm restart policies on existing containers

`docker update --restart always $(docker ps -aq)` only touches containers that
**exist right now**. Verify it actually took:

```bash
docker inspect -f '{{.Name}} => {{.HostConfig.RestartPolicy.Name}}' $(docker ps -aq)
```

Every line should say `always` (or `unless-stopped`). Anything showing `no` or
empty was missed — re-apply:

```bash
docker update --restart unless-stopped $(docker ps -aq)
```

> **`always` vs `unless-stopped`:** `always` restarts the container even after
> you deliberately `docker stop` it (once the daemon restarts). `unless-stopped`
> does the same on reboot/crash but respects a manual stop. For a UAT box you
> almost always want **`unless-stopped`** — it auto-heals on reboot but doesn't
> fight you during maintenance.

### 1.3 THE PERMANENT FIX — set the policy where containers are defined

`docker update` is lost the moment a container is **recreated** (e.g. you
`docker compose up` after pulling a new image — Compose destroys and recreates
the container, dropping the manually-set policy). So the policy must live in the
source of truth:

**If you use docker-compose** — add to every service in each
`docker-compose.yml`:

```yaml
services:
  api:
    image: ...
    restart: unless-stopped   # <-- add this line to every service
```

Then re-apply cleanly:

```bash
cd /path/to/compose/project
docker compose up -d          # recreates with the new restart policy
```

**If containers are started with `docker run`** — add `--restart unless-stopped`
to each run command / start script.

### 1.4 Prove it survives a reboot (do this in a maintenance window)

```bash
sudo reboot
# wait ~60s, reconnect, then:
docker ps                                   # all containers Up
curl -I https://uat-api.fodek.net/          # not 502
curl -I https://flod.uat.fodek.net/         # not 502
pm2 status                                  # admin panel still up
```

> PM2 has its own boot gap. Make sure it's also set to resurrect on boot:
> ```bash
> pm2 startup systemd        # run the command it prints
> pm2 save                   # snapshot current process list (incl. port 3010 app)
> ```

---

## Part 2 — Self-healing health check + alerts

`container-healthcheck.sh` runs every minute via a systemd timer. It:

- flags any container that's not running / `unhealthy`,
- **auto-restarts** it,
- probes `uat-api.fodek.net` and `flod.uat.fodek.net` for 502/5xx,
- alerts **only on state changes** (down once, recovered once — no spam),
- logs everything to `/var/log/fodek-monitor.log`.

### 2.1 Install

```bash
# From this repo on the server (git pull first), in ops/:
sudo install -m 0755 container-healthcheck.sh /usr/local/bin/container-healthcheck.sh
sudo cp fodek-monitor.service /etc/systemd/system/
sudo cp fodek-monitor.timer   /etc/systemd/system/
sudo cp fodek-monitor.env.example /etc/fodek-monitor.env
sudo chmod 600 /etc/fodek-monitor.env     # holds your bot token
```

### 2.2 Configure alerting

Edit `/etc/fodek-monitor.env`. Pick `NOTIFY_METHOD` and fill the matching block:

- **Telegram (recommended on a VPS — no mail server needed):**
  1. Message `@BotFather` → `/newbot` → copy the token into `TELEGRAM_BOT_TOKEN`.
  2. Message your new bot once, then open
     `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id` into
     `TELEGRAM_CHAT_ID` (or use `@userinfobot`).
- **Discord/Slack:** set `NOTIFY_METHOD=webhook` and paste an incoming
  `WEBHOOK_URL`.
- **Email:** set `NOTIFY_METHOD=email`, `EMAIL_TO=you@…` (needs working
  `mail`/msmtp).

### 2.3 Enable

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now fodek-monitor.timer

# Verify
systemctl list-timers fodek-monitor.timer
sudo systemctl start fodek-monitor.service   # run once now
journalctl -u fodek-monitor.service -n 50 --no-pager
tail -f /var/log/fodek-monitor.log
```

### 2.4 Test the alert path end-to-end

```bash
# Stop a non-critical container and wait ~1 min — you should get a DOWN alert,
# an auto-restart, then a RECOVERED alert.
docker stop <some-container>
```

---

## Part 3 — (Optional) Uptime Kuma dashboard

If you'd rather have a web UI + status page with built-in notifications:

```bash
docker run -d --restart unless-stopped \
  -p 3011:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma louislam/uptime-kuma:1
```

Then open `http://72.60.46.114:3011` (proxy it behind Nginx with auth before
exposing publicly), add HTTP monitors for both domains and a Docker monitor for
the containers, and wire up Telegram/Slack/email notifications in its UI. This
complements — doesn't replace — Part 1, which is the actual reboot fix.

---

## Quick reference

| Goal | Command |
|------|---------|
| Daemon starts on boot | `systemctl enable --now docker docker.socket` |
| Check restart policies | `docker inspect -f '{{.Name}} {{.HostConfig.RestartPolicy.Name}}' $(docker ps -aq)` |
| Permanent policy | `restart: unless-stopped` in compose, then `docker compose up -d` |
| PM2 on boot | `pm2 startup systemd && pm2 save` |
| Monitor status | `systemctl list-timers fodek-monitor.timer` |
| Monitor logs | `tail -f /var/log/fodek-monitor.log` |
