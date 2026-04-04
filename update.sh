#!/bin/bash
set -e
echo "=== Saleor Update $(date) ==="

cd ~/saleor-production

# 1. Docker Images aktualisieren
echo "[1/4] Pulling latest images..."
docker compose pull

# 2. Container neu starten mit neuen Images
echo "[2/4] Restarting containers..."
docker compose up -d api worker beat dashboard caddy

# 3. Migrationen ausführen
echo "[3/4] Running migrations..."
docker compose run --rm api python3 manage.py migrate

# 4. Storefront aktualisieren
echo "[4/4] Updating storefront..."
cd storefront
git pull
NEXT_PUBLIC_SALEOR_API_URL=https://api.edelbrandfreunde.at/graphql/ \
pnpm run generate:all
NEXT_PUBLIC_SALEOR_API_URL=https://api.edelbrandfreunde.at/graphql/ \
NEXT_OUTPUT=standalone \
npx next build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
sudo systemctl restart saleor-storefront

echo "=== Update complete ==="
