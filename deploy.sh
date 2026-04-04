#!/bin/bash
# ==============================================
# Saleor Production Deployment
# edelbrandfreunde.at
# ==============================================

set -e

echo "=========================================="
echo "  Saleor Production Deployment"
echo "  shop.edelbrandfreunde.at"
echo "=========================================="

# Prüfe ob Docker läuft
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker läuft nicht. Starte Docker zuerst."
    exit 1
fi

echo ""
echo "[1/6] Storefront-Code klonen..."
if [ ! -d "storefront/.git" ]; then
    git clone https://github.com/saleor/storefront.git storefront
else
    echo "  Storefront bereits vorhanden, aktualisiere..."
    cd storefront && git pull && cd ..
fi

echo ""
echo "[2/6] Docker Images bauen und pullen..."
docker compose build
docker compose pull

echo ""
echo "[3/6] Datenbank starten und warten..."
docker compose up -d db redis
echo "  Warte 10 Sekunden auf Datenbank..."
sleep 10

echo ""
echo "[4/6] Datenbank-Migrationen ausführen..."
docker compose run --rm api python3 manage.py migrate
docker compose run --rm api python3 manage.py collectstatic --noinput

echo ""
echo "[5/6] Admin-Account erstellen..."
echo "  Erstelle deinen Superuser-Account:"
docker compose run --rm api python3 manage.py createsuperuser

echo ""
echo "[6/6] Alle Services starten..."
docker compose up -d

echo ""
echo "=========================================="
echo "  DEPLOYMENT ABGESCHLOSSEN"
echo "=========================================="
echo ""
echo "  Shop:      https://shop.edelbrandfreunde.at"
echo "  API:       https://api.edelbrandfreunde.at"
echo "  Dashboard: https://admin.edelbrandfreunde.at"
echo "  GraphQL:   https://api.edelbrandfreunde.at/graphql/"
echo ""
echo "  Status prüfen:  docker compose ps"
echo "  Logs anzeigen:  docker compose logs -f"
echo "  Stoppen:        docker compose down"
echo ""
echo "=========================================="
