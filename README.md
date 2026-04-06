# Saleor Production Setup — Self-Hosted E-Commerce

Ein vollständiges, produktionsreifes Saleor E-Commerce Setup mit Next.js Storefront, Docker und Caddy.

Getestet auf **Ubuntu 24.04** mit **8 GB RAM**.

---

## Architektur

```
Internet
   │
   ▼
┌─────────────────────────────────────────────────────┐
│  Caddy (Docker)  — Reverse Proxy + Auto-TLS         │
│  Port 80/443                                         │
├──────────┬──────────────┬───────────────────────────┤
│          │              │                           │
│  shop.   │  api.        │  admin.                   │
│  ↓       │  ↓           │  ↓                        │
│  :3000   │  :8000       │  :80                      │
│ (Host)   │ (Docker)     │ (Docker)                  │
└──────────┴──────────────┴───────────────────────────┘
     │              │              │
 Storefront    Saleor API     Dashboard
 (systemd)    + Worker/Beat   (statisch)
                    │
              ┌─────┴─────┐
              │ PostgreSQL │  Redis
              │  (Docker)  │ (Docker)
              └────────────┘
```

| Service | Image | Zugriff |
|---------|-------|---------|
| Caddy | `caddy:2-alpine` | Port 80, 443 |
| Saleor API | `ghcr.io/saleor/saleor:3.20` | Intern :8000 |
| Dashboard | `ghcr.io/saleor/saleor-dashboard:3.20` | Intern :80 |
| Worker/Beat | `ghcr.io/saleor/saleor:3.20` | Kein Port |
| PostgreSQL | `postgres:16-alpine` | Intern :5432 |
| Redis | `redis:7-alpine` | Intern :6379 |
| Storefront | Next.js (systemd) | Intern :3000 |

---

## Voraussetzungen

Bevor du das Repo klonst, muss der Server vorbereitet sein:

### 1. Server mieten

- **Empfohlen:** Hetzner Cloud CX32 oder besser (mind. 4 GB RAM, 2 vCPU)
- **OS:** Ubuntu 24.04 LTS
- **SSH-Key** bei der Erstellung hinterlegen

### 2. Server absichern

Verbinde dich per SSH und führe folgendes aus:

```bash
# System updaten
apt update && apt upgrade -y

# Neuen Admin-User erstellen (NICHT als root arbeiten)
adduser webshopadmin
usermod -aG sudo webshopadmin

# SSH-Key für neuen User kopieren
mkdir -p /home/webshopadmin/.ssh
cp ~/.ssh/authorized_keys /home/webshopadmin/.ssh/
chown -R webshopadmin:webshopadmin /home/webshopadmin/.ssh

# SSH härten — Root-Login deaktivieren
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Fail2Ban
apt install -y fail2ban
systemctl enable fail2ban

# Automatische Sicherheitsupdates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

**Ab jetzt nur noch als `webshopadmin` einloggen:**

```bash
ssh webshopadmin@DEINE-SERVER-IP
```

### 3. Docker installieren

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Ausloggen und neu einloggen damit die Gruppe aktiv wird
exit
```

### 4. Node.js 20 installieren

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm
```

### 5. DNS-Records setzen

Bei deinem Domain-Provider diese A-Records auf deine Server-IP zeigen lassen:

```
shop.DEINE-DOMAIN.at    A    DEINE-SERVER-IP
api.DEINE-DOMAIN.at     A    DEINE-SERVER-IP
admin.DEINE-DOMAIN.at   A    DEINE-SERVER-IP
```

Optional (für Redirect):
```
www.DEINE-DOMAIN.at     CNAME    shop.DEINE-DOMAIN.at
```

---

## Installation

### 1. Repo klonen

```bash
cd ~
git clone git@github.com:CarliDerZerstoere/edebrandfreunde_webshop.git saleor-production
cd saleor-production
```

### 2. Storefront klonen

```bash
git clone https://github.com/saleor/storefront.git storefront
```

### 3. Secrets erstellen

**Wichtig:** Diese Dateien werden NIEMALS committed. Du musst sie auf jedem neuen Server neu erstellen.

```bash
# .env — Datenbank- und Redis-Passwörter
cp .env.example .env
nano .env
# Generiere sichere Passwörter:
#   openssl rand -hex 16    (für POSTGRES_PASSWORD)
#   openssl rand -hex 24    (für REDIS_PASSWORD)

# .env.api — Saleor API Konfiguration
cp .env.api.example .env.api
nano .env.api
# Passe an:
#   - DATABASE_URL: Postgres-Passwort aus .env eintragen
#   - REDIS_URL + CELERY_BROKER_URL: Redis-Passwort aus .env eintragen
#   - SECRET_KEY: openssl rand -hex 32
#   - Alle URLs auf deine Domain ändern
#   - ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, etc.

# RSA-Key für JWT-Signierung
openssl genrsa 2048 > rsa_private.pem
chmod 600 rsa_private.pem

# Dateiberechtigungen sichern
chmod 600 .env .env.api
```

### 4. Caddyfile anpassen

```bash
nano Caddyfile
# Ersetze alle "edelbrandfreunde.at" durch deine Domain
```

### 5. docker-compose.yml anpassen

```bash
nano docker-compose.yml
# Ändere die Dashboard API_URL auf deine Domain:
#   API_URL=https://api.DEINE-DOMAIN.at/graphql/
```

### 6. Backend starten

```bash
# Datenbank + Redis starten
docker compose up -d db redis
sleep 10

# Migrationen ausführen
docker compose run --rm api python3 manage.py migrate
docker compose run --rm api python3 manage.py collectstatic --noinput

# Admin-Account erstellen
docker compose run --rm api python3 manage.py createsuperuser

# Alle Services starten
docker compose up -d
sleep 15

# Prüfen ob API läuft
curl -s https://api.DEINE-DOMAIN.at/graphql/ \
  -H "Content-Type: application/json" \
  -d '{"query":"{shop{name}}"}'
```

### 7. Storefront einrichten

```bash
cd storefront

# .env konfigurieren
cat > .env << EOF
NEXT_PUBLIC_DEFAULT_CHANNEL=default-channel
NEXT_PUBLIC_SALEOR_API_URL=https://api.DEINE-DOMAIN.at/graphql/
EOF

# Dependencies installieren
pnpm install
pnpm approve-builds   # Alle auswählen und bestätigen

# GraphQL Types generieren
NEXT_PUBLIC_SALEOR_API_URL=https://api.DEINE-DOMAIN.at/graphql/ pnpm run generate:all

# Bauen
NEXT_OUTPUT=standalone \
NEXT_PUBLIC_SALEOR_API_URL=https://api.DEINE-DOMAIN.at/graphql/ \
NEXT_PUBLIC_DEFAULT_CHANNEL=default-channel \
npx next build

# Statische Dateien kopieren
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

cd ..
```

### 8. Storefront als systemd Service einrichten

```bash
sudo tee /etc/systemd/system/saleor-storefront.service << 'EOF'
[Unit]
Description=Saleor Storefront (Next.js)
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=webshopadmin
WorkingDirectory=/home/webshopadmin/saleor-production/storefront
Environment=NEXT_PUBLIC_SALEOR_API_URL=https://api.DEINE-DOMAIN.at/graphql/
Environment=PORT=3000
Environment=NODE_ENV=production
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# DEINE-DOMAIN.at durch deine echte Domain ersetzen!
sudo nano /etc/systemd/system/saleor-storefront.service

sudo systemctl daemon-reload
sudo systemctl enable saleor-storefront
sudo systemctl start saleor-storefront
```

### 9. Firewall für Docker → Storefront

```bash
# Caddy (Docker) muss den Storefront (Host :3000) erreichen können
sudo ufw allow from 172.20.0.0/24 to any port 3000 proto tcp comment "Docker frontend to storefront"
```

### 10. Prüfen ob alles läuft

```bash
# Alle Container
docker compose ps

# Storefront
sudo systemctl status saleor-storefront

# Websites testen
curl -s -o /dev/null -w "%{http_code}" -L https://shop.DEINE-DOMAIN.at/
curl -s -o /dev/null -w "%{http_code}" https://api.DEINE-DOMAIN.at/graphql/ -H "Content-Type: application/json" -d '{"query":"{shop{name}}"}'
curl -s -o /dev/null -w "%{http_code}" https://admin.DEINE-DOMAIN.at/
```

---

## Storefront anpassen

Das Storefront ist ein frischer Clone von [github.com/saleor/storefront](https://github.com/saleor/storefront) mit folgenden Anpassungen:

### Dateien die angepasst werden müssen

| Datei | Was anpassen |
|-------|-------------|
| `storefront/.env` | API-URL und Channel-Slug |
| `storefront/src/config/brand.ts` | Shop-Name, Tagline, Beschreibung |
| `storefront/src/config/locale.ts` | Sprache, Locale, Währung |
| `storefront/src/styles/brand.css` | Farbschema (CSS-Variablen) |
| `storefront/src/ui/components/shared/logo.tsx` | Logo-Komponente |
| `storefront/public/logo-*.png` | Logo-Datei |

### Nach Änderungen neu bauen

```bash
cd ~/saleor-production/storefront
rm -rf .next
NEXT_OUTPUT=standalone \
NEXT_PUBLIC_SALEOR_API_URL=https://api.DEINE-DOMAIN.at/graphql/ \
NEXT_PUBLIC_DEFAULT_CHANNEL=DEIN-CHANNEL \
npx next build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
sudo systemctl restart saleor-storefront
```

---

## Dashboard — Inhalte verwalten

Alle Inhalte werden über das Saleor Dashboard verwaltet: `https://admin.DEINE-DOMAIN.at`

### Landing Page Texte

Unter **Content → Pages** findest du diese Seiten:

| Page (Slug) | Steuert | Titel = | Inhalt = |
|---|---|---|---|
| `landing-hero` | Hero-Sektion oben | Große Überschrift | Tagline/Untertitel |
| `landing-sortiment` | Kategorien-Überschrift | z.B. "Unsere Edelbrände" | Beschreibungstext |
| `landing-bestseller` | Bestseller-Überschrift | z.B. "Bestseller" | Beschreibungstext |
| `landing-qualitaet` | Qualitätsmerkmale | z.B. "Unser Versprechen" | Je Absatz: `Titel — Beschreibung` |
| `landing-destillation` | Destillations-Sektion | z.B. "Die Kunst der Destillation" | Absätze mit Text |
| `landing-about` | Über uns | z.B. "Über die Edelbrandfreunde" | Geschichte in Absätzen |

### Statische Seiten

| Page (Slug) | URL | Inhalt |
|---|---|---|
| `impressum` | /pages/impressum | Impressum |
| `datenschutz` | /pages/datenschutz | Datenschutzerklärung |
| `agb` | /pages/agb | AGB |
| `kontakt` | /pages/kontakt | Kontaktseite |
| `versand` | /pages/versand | Versandinfos |
| `widerruf` | /pages/widerruf | Widerrufsbelehrung |

### Navigation

Unter **Content → Navigation:**

| Menü-Slug | Steuert |
|---|---|
| `navbar` | Header-Menü oben |
| `footer` | Footer-Links unten |

### Produkte & Katalog

| Was | Wo im Dashboard |
|---|---|
| Produkte anlegen | Catalog → Products → Create |
| Kategorien | Catalog → Categories |
| Bestseller festlegen | Catalog → Collections → "Featured Products" → Produkte zuweisen |
| Versandzone | Configuration → Shipping Methods |
| Steuern | Configuration → Taxes |
| Payment (Stripe) | Configuration → Plugins → Stripe |

---

## Storefront wiederherstellen

Falls der Server neu aufgesetzt wird oder die `storefront/` gelöscht wurde — der komplette angepasste Source-Code liegt in `storefront-custom/`:

```bash
# 1. Source kopieren
cp -r storefront-custom storefront
cd storefront

# 2. Environment konfigurieren
cp .env.example .env
nano .env
# NEXT_PUBLIC_DEFAULT_CHANNEL und NEXT_PUBLIC_SALEOR_API_URL anpassen

# 3. Dependencies installieren
pnpm install
pnpm approve-builds

# 4. GraphQL Types generieren
NEXT_PUBLIC_SALEOR_API_URL=https://api.DEINE-DOMAIN.at/graphql/ pnpm run generate:all

# 5. Bauen
NEXT_OUTPUT=standalone \
NEXT_PUBLIC_SALEOR_API_URL=https://api.DEINE-DOMAIN.at/graphql/ \
NEXT_PUBLIC_DEFAULT_CHANNEL=oe \
npx next build

# 6. Statische Dateien kopieren
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

# 7. Service starten
sudo systemctl restart saleor-storefront
```

---

## Dateien-Übersicht

```
saleor-production/
├── docker-compose.yml     # Container-Orchestrierung
├── Caddyfile              # Reverse Proxy Konfiguration
├── .env.example           # Template für .env (Passwörter)
├── .env.api.example       # Template für .env.api (Saleor Konfig)
├── entrypoint.sh          # RSA-Key Loader für Saleor
├── deploy.sh              # Erstinstallation
├── update.sh              # Update-Script
├── README.md              # Diese Datei
│
├── storefront-custom/     # ✅ Angepasster Storefront Source (in Git)
│   ├── src/               # React/Next.js Source-Code
│   ├── public/            # Statische Assets (Logo, Favicons)
│   ├── package.json       # Dependencies
│   └── .env.example       # Template für .env
│
├── .env                   # ⛔ NICHT in Git (Passwörter)
├── .env.api               # ⛔ NICHT in Git (Secrets)
├── rsa_private.pem        # ⛔ NICHT in Git (JWT-Key)
│
└── storefront/            # ⛔ NICHT in Git (Live-Build, separater Clone)
    ├── .env               # Channel + API-URL
    ├── src/styles/brand.css
    ├── src/config/brand.ts
    └── ...
```

---

## Updates

```bash
cd ~/saleor-production
./update.sh
```

Das Script:
1. Zieht neue Docker-Images
2. Startet Backend-Container neu
3. Führt DB-Migrationen aus
4. Baut das Storefront neu
5. Startet den Storefront-Service neu

---

## Backups

### Datenbank sichern

```bash
docker compose exec -T db pg_dump -U saleor saleor | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Datenbank wiederherstellen

```bash
gunzip -c backup_DATUM.sql.gz | docker compose exec -T db psql -U saleor saleor
```

### Ganzen Server sichern

Hetzner Cloud Console → Server → Backups aktivieren (~1.50 EUR/Monat).

---

## Troubleshooting

### Storefront zeigt 502

```bash
# Prüfe ob der Storefront-Service läuft
sudo systemctl status saleor-storefront

# Prüfe ob Caddy den Host erreichen kann
docker compose exec caddy wget -qO- --timeout=3 http://host.docker.internal:3000/

# Falls nicht: UFW-Regel prüfen
sudo ufw status | grep 3000
```

### API gibt 301 Redirect

Die API redirected HTTP → HTTPS. Caddy muss den Header setzen:
```
header_up X-Forwarded-Proto https
```
Das ist in der Caddyfile bereits konfiguriert.

### "Couldn't find all resumable slots"

Cache-Problem. Lösung:
```bash
cd ~/saleor-production/storefront
rm -rf .next
# Neu bauen (siehe "Nach Änderungen neu bauen")
```

### Produkte werden nicht angezeigt

1. Produkt ist dem Channel zugewiesen? (Dashboard → Products → Availability)
2. Produkt ist veröffentlicht? (Published = Ja)
3. Produkt hat Preis und Bestand?
4. Featured Products: Ist das Produkt in der Collection "Featured Products"?
