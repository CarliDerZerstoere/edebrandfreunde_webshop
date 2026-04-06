#!/bin/bash
# ==============================================
# Saleor Production — Update
# ==============================================
# Aktualisiert Docker-Images, führt Migrationen aus,
# und baut das Storefront neu.
# ==============================================

set -e
trap 'echo "FEHLER in Zeile $LINENO. Prüfe den Status mit: docker compose ps"' ERR

echo "=== Saleor Update $(date) ==="

cd ~/saleor-production

echo "[0/5] Pre-Update Datenbank-Backup..."
docker compose exec -T db pg_dump -U saleor saleor | gzip > "backup_pre-update_$(date +%Y%m%d_%H%M%S).sql.gz"
echo "       Backup erstellt."

echo "[1/5] Docker Images aktualisieren..."
docker compose -f docker-compose.yml pull

echo "[2/5] Backend-Container neu starten..."
docker compose -f docker-compose.yml up -d db redis
echo "       Warte auf Datenbank..."
sleep 10
docker compose -f docker-compose.yml up -d api worker beat dashboard caddy
echo "       Warte auf API..."
sleep 10

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
