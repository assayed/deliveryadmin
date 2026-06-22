#!/bin/bash
# FODEK Admin Panel — VPS Deployment Script
# Safe: only manages 'fodek-admin' PM2 process, never touches 'backend'
set -e

DEPLOY_DIR="/var/www/fodek-admin"
BRANCH="claude/amazing-brahmagupta-k9h15d"
API_URL="http://72.60.46.114:3010"

echo "=== FODEK Admin Deploy ==="

# 1. Pull latest code
cd "$DEPLOY_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

# 2. Backend deps
cd "$DEPLOY_DIR/backend"
npm install --production

# 3. Build frontend with correct API URL
cd "$DEPLOY_DIR/frontend"
npm install
REACT_APP_API_URL="$API_URL" npm run build

# 4. Restart ONLY fodek-admin — never touch 'backend' process
pm2 describe fodek-admin > /dev/null 2>&1 && pm2 restart fodek-admin || \
  pm2 start "$DEPLOY_DIR/backend/index.js" --name fodek-admin --env production -- --env PORT=3010

pm2 save

echo ""
echo "=== Verify ==="
sleep 2
curl -s http://localhost:3010/api/health && echo " ← fodek-admin OK"
echo ""
echo "=== Done. Test: curl http://localhost:3010/api/health ==="
