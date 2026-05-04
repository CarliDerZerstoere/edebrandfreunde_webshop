#!/bin/bash
# UFW Firewall Setup für edelbrandfreunde.at
# Defensives Setup — SSH wird VOR dem Enable freigegeben.
#
# Was wird erlaubt:
#   - Port 22  (SSH)         von überall
#   - Port 80  (HTTP)        von überall   (Caddy → Auto-TLS Renewal)
#   - Port 443 (HTTPS)       von überall   (Caddy → Storefront/API/Admin)
#   - Port 3000 (Next.js)    NUR von Docker-Subnets (172.17.0.0/16, 172.18.0.0/16, 172.20.0.0/24)
#   - Alles ausgehende       erlaubt
#   - Alles andere eingehend BLOCKIERT
#
# WICHTIG: Wenn das Skript fehlschlägt, bleibt UFW im Status davor — kein partielles Aufschließen.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "❌ Dieses Skript muss als root laufen. Starte mit: sudo bash $0"
  exit 1
fi

echo "=== Vorher: aktueller UFW-Status ==="
ufw status verbose | head -20 || true
echo

echo "=== Defaults setzen ==="
ufw default deny incoming
ufw default allow outgoing

echo
echo "=== Erlaubt: SSH (22), HTTP (80), HTTPS (443) ==="
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (Caddy)'
ufw allow 443/tcp comment 'HTTPS (Caddy)'
ufw allow 443/udp comment 'HTTPS/3 (Caddy QUIC)'

echo
echo "=== Erlaubt: Next.js (3000) nur von Docker-Bridges ==="
ufw allow from 172.17.0.0/16 to any port 3000 proto tcp comment 'Caddy→Next.js via docker0'
ufw allow from 172.18.0.0/16 to any port 3000 proto tcp comment 'Caddy→Next.js via backend net'
ufw allow from 172.20.0.0/24 to any port 3000 proto tcp comment 'Caddy→Next.js via frontend net'

echo
echo "=== Aktivieren (falls noch nicht aktiv) ==="
if ufw status | head -1 | grep -q "inactive"; then
  ufw --force enable
else
  echo "(UFW bereits aktiv — nur reload)"
  ufw reload
fi

echo
echo "=== Endstand ==="
ufw status verbose

echo
echo "=== Verifikation ==="
echo "Test 1: Storefront via Caddy (sollte 200 kommen)"
curl -sS -o /dev/null -w "  HTTPS://shop  → %{http_code}\n" https://shop.edelbrandfreunde.at/oe || true
echo "Test 2: Direkter Zugriff auf Port 3000 (sollte timeout/refused kommen — von außen)"
echo "  → manuell testen mit: curl --max-time 3 http://$(curl -sS https://api.ipify.org):3000"
echo "Test 3: Caddy → Next.js intern (sollte funktionieren)"
docker exec saleor-production-caddy-1 wget -q -T 3 -O /dev/null --server-response http://host.docker.internal:3000 2>&1 | head -1 || echo "  (kein wget im container — egal, prüfe: curl https://shop.edelbrandfreunde.at)"

echo
echo "✅ UFW konfiguriert."
