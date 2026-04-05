#!/bin/bash
# ==============================================
# Saleor Production — Erstinstallation
# ==============================================
# Voraussetzungen:
#   - Docker + Docker Compose installiert
#   - Node.js 20 + pnpm installiert
#   - .env und .env.api konfiguriert (siehe README.md)
#   - rsa_private.pem erstellt
#   - DNS-Records gesetzt
#   - Caddyfile + docker-compose.yml angepasst
# ==============================================

set -e

echo "=========================================="
echo "  Saleor Production — Erstinstallation"
echo "=========================================="

# Prüfe Voraussetzungen
if ! docker info > /dev/null 2>&1; then
    echo "FEHLER: Docker läuft nicht."
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "FEHLER: .env nicht gefunden. Kopiere .env.example:"
    echo "  cp .env.example .env && nano .env"
    exit 1
fi

if [ ! -f ".env.api" ]; then
    echo "FEHLER: .env.api nicht gefunden. Kopiere .env.api.example:"
    echo "  cp .env.api.example .env.api && nano .env.api"
    exit 1
fi

if [ ! -f "rsa_private.pem" ]; then
    echo "FEHLER: rsa_private.pem nicht gefunden. Erstelle einen:"
    echo "  openssl genrsa 2048 > rsa_private.pem && chmod 600 rsa_private.pem"
    exit 1
fi

echo ""
echo "[1/6] Storefront klonen..."
if [ ! -d "storefront/.git" ]; then
    git clone https://github.com/saleor/storefront.git storefront
else
    echo "  Storefront vorhanden."
fi

echo ""
echo "[2/6] Datenbank + Redis starten..."
docker compose -f docker-compose.yml up -d db redis
echo "  Warte 10 Sekunden..."
sleep 10

echo ""
echo "[3/6] Datenbank-Migrationen..."
docker compose -f docker-compose.yml run --rm api python3 manage.py migrate
docker compose -f docker-compose.yml run --rm api python3 manage.py collectstatic --noinput

echo ""
echo "[4/6] Admin-Account erstellen..."
docker compose -f docker-compose.yml run --rm api python3 manage.py createsuperuser

echo ""
echo "[5/6] Alle Backend-Services starten..."
docker compose -f docker-compose.yml up -d
echo "  Warte 15 Sekunden auf API..."
sleep 15

echo ""
echo "[6/6] Storefront bauen..."
cd storefront
pnpm install
echo "y" | pnpm approve-builds 2>/dev/null || true
pnpm run generate:all
NEXT_OUTPUT=standalone npx next build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cd ..

echo ""
echo "=========================================="
echo "  INSTALLATION ABGESCHLOSSEN"
echo "=========================================="
echo ""
echo "  Nächste Schritte:"
echo "  1. Storefront-Service einrichten (siehe README.md Schritt 8)"
echo "  2. UFW-Regel setzen (siehe README.md Schritt 9)"
echo "  3. Im Dashboard einloggen und Inhalte anlegen"
echo ""
echo "=========================================="
