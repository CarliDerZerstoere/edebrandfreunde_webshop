#!/bin/bash
# ==============================================
# Saleor Production — Update
# ==============================================
# Aktualisiert Docker-Images, führt Migrationen aus,
# und baut das Storefront neu.
# ==============================================

set -e

echo "=== Saleor Update $(date) ==="

cd ~/saleor-production

echo "[1/5] Docker Images aktualisieren..."
docker compose -f docker-compose.yml pull

echo "[2/5] Backend-Container neu starten..."
docker compose -f docker-compose.yml up -d api worker beat dashboard caddy

echo "[3/5] Datenbank-Migrationen..."
docker compose -f docker-compose.yml run --rm api python3 manage.py migrate

echo "[4/5] Storefront aktualisieren und bauen..."
cd storefront
git pull
pnpm install
pnpm run generate:all
rm -rf .next
NEXT_OUTPUT=standalone npx next build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cd ..

echo "[5/5] Storefront-Service neu starten..."
sudo systemctl restart saleor-storefront

echo "=== Update abgeschlossen ==="
