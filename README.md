# Edelbrandfreunde Webshop — Self-Hosted Saleor E-Commerce

Selbst gehosteter Online-Shop für die Abfindungsbrennerei Edelbrandfreunde (edelbrandfreunde.at).

**Stack:** Saleor API 3.20 + Next.js 16 Storefront + Caddy + PostgreSQL 16 + Redis 7 + Postfix

---

## Schnellreferenz — Die wichtigsten Befehle

### Shop ein-/ausschalten

```bash
# Storefront starten
sudo systemctl start saleor-storefront

# Storefront stoppen
sudo systemctl stop saleor-storefront

# Storefront neustarten
sudo systemctl restart saleor-storefront

# Status prüfen
sudo systemctl status saleor-storefront

# Docker-Container (API, DB, Redis, Dashboard, Caddy, Postfix)
docker compose up -d        # Alle starten
docker compose down         # Alle stoppen
docker compose ps           # Status anzeigen
docker compose restart api  # Einzelnen Container neustarten
```

### Storefront neu bauen (nach Code-Änderungen)

```bash
cd ~/saleor-production/storefront

# 1. Source synchronisieren
rsync -av --delete ~/saleor-production/storefront-custom/src/ src/

# 2. GraphQL Types neu generieren
NEXT_PUBLIC_SALEOR_API_URL=https://api.edelbrandfreunde.at/graphql/ pnpm run generate

# 3. Types zurückkopieren
cp -r src/gql/ ~/saleor-production/storefront-custom/src/gql/

# 4. Bauen
rm -rf .next
NEXT_OUTPUT=standalone \
NEXT_PUBLIC_SALEOR_API_URL=https://api.edelbrandfreunde.at/graphql/ \
NEXT_PUBLIC_DEFAULT_CHANNEL=oe \
NEXT_PUBLIC_STOREFRONT_URL=https://shop.edelbrandfreunde.at \
npx next build

# 5. Static Files kopieren
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

# 6. Service neustarten
sudo systemctl restart saleor-storefront
```

### Logs anschauen

```bash
# Storefront Logs (live)
journalctl -u saleor-storefront -f

# Storefront Logs (letzte 50 Zeilen)
journalctl -u saleor-storefront --no-pager -n 50

# Docker Container Logs
docker compose logs api --tail 50
docker compose logs worker --tail 50
docker compose logs postfix --tail 50
docker compose logs caddy --tail 50
```

### Datenbank

```bash
# Backup erstellen
docker compose exec -T db pg_dump -U saleor saleor | gzip > ~/backups/saleor_$(date +%Y%m%d_%H%M).sql.gz

# Backup wiederherstellen
gunzip -c ~/backups/saleor_DATUM.sql.gz | docker compose exec -T db psql -U saleor saleor

# Direkt in die DB verbinden
docker compose exec db psql -U saleor saleor
```

---

## Architektur

```
Internet
   |
   v
+--------------------------------------------------+
|  Caddy (Docker) — Reverse Proxy + Auto-TLS       |
|  Port 80/443                                      |
+-------+---------------+----------------+---------+
        |               |                |
  shop.           api.             admin.
  :3000           :8000             :80
  (systemd)       (Docker)         (Docker)
                    |
              +-----+-----+
              | PostgreSQL |  Redis   Postfix
              |  (Docker)  | (Docker) (Docker)
              +------------+
```

| Service | Container | Port | Zugriff |
|---------|-----------|------|---------|
| Storefront | systemd | 3000 | shop.edelbrandfreunde.at |
| Saleor API | Docker | 8000 | api.edelbrandfreunde.at |
| Dashboard | Docker | 80 | admin.edelbrandfreunde.at |
| PostgreSQL | Docker | 5432 | Nur intern |
| Redis | Docker | 6379 | Nur intern |
| Postfix | Docker | 587 | Nur intern |
| Caddy | Docker | 80/443 | Internet |

---

## CMS — Inhalte im Dashboard verwalten

Alle Inhalte werden über das Dashboard verwaltet: **https://admin.edelbrandfreunde.at**

### Produkte verwalten

| Was | Wo |
|-----|-----|
| Produkt anlegen/bearbeiten | Catalog → Products |
| Preis ändern | Catalog → Products → Produkt → Variants → Price |
| Bilder hochladen | Catalog → Products → Produkt → Media |
| Badge setzen (Bestseller, Limitiert) | Catalog → Products → Metadata → key: `badge` |
| Kategorie zuweisen | Catalog → Products → Produkt → Category |
| Bestseller festlegen | Catalog → Collections → "featured-products" |

### Produktattribute (vom Code gelesen)

| Attribut | Slug | Anzeige auf der Website |
|----------|------|------------------------|
| Alkoholgehalt | `alkoholgehalt` | "40% vol." auf Karte + PDP |
| Inhalt | `inhalt` | "0,5l" + Grundpreis/Liter berechnet |
| Sorte | `sorte` | Sortenbeschreibung auf der Karte |
| Jahrgang | `jahrgang` | "Jahrgang 2021" auf der Karte |

### Produkt-Metadata (key → value)

| Key | Beispiel-Value | Anzeige |
|-----|---------------|---------|
| `badge` | Bestseller / Limitiert / Unikat | Badge oben links auf der Karte |
| `award` | Gold · Destillata 2023 | Auszeichnung auf der PDP |
| `batch_size` | 48 | "Kleine Auflage · 48 Flaschen" auf PDP |
| `jahrgang` | 2021 | Jahrgang auf Karte + PDP |
| `herkunft` | Schwallenbach, Wachau | Herkunftsangabe auf PDP |

### Kategorie-Metadata

| Key | Beispiel-Value | Anzeige |
|-----|---------------|---------|
| `emoji` | 🍑 | Emoji neben Kategoriename (Fallback-Karten) |

### CMS-Seiten (Content → Pages)

| Slug | Steuert | Format |
|------|---------|--------|
| `landing-hero` | Hero: Titel + Tagline | Titel = Überschrift, Inhalt = Untertitel |
| `landing-sortiment` | Kategorien-Sektion | Titel + Beschreibung |
| `landing-bestseller` | Bestseller-Sektion | Titel + Beschreibung |
| `landing-qualitaet` | Qualitäts-Sektion | Je Absatz: "Titel — Beschreibung" |
| `landing-destillation` | Destillation-Sektion | Titel + Absätze |
| `landing-about` | Über uns-Sektion | Titel + Absätze |
| `products-hero` | Produktseite Hero-Band | Titel = Überschrift, Inhalt = Motto |
| `products-trust-bar` | Trust-Bar über Produktgrid | Pipe-getrennt: `Text1\|Text2\|Text3` |
| `products-price-ranges` | Preisfilter-Bereiche | `0-30:Unter €30\|30-50:€30 – €50\|...` |
| `pdp-trust-signals` | Trust unter Warenkorb-Button | Pipe-getrennt: `Signal1\|Signal2` |
| `impressum` | Impressum (Pflicht) | Rechtlicher Text |
| `agb` | AGB (Pflicht) | Rechtlicher Text |
| `datenschutz` | Datenschutzerklärung (Pflicht) | Rechtlicher Text |
| `widerruf` | Widerrufsbelehrung (Pflicht) | Text + Muster-Formular |
| `versand` | Versand & Lieferung | Versandinfos |
| `kontakt` | Kontaktseite | Kontaktdaten |
| `jugendschutz` | Jugendschutzhinweis (Pflicht) | NÖ JG §18 |

### Navigation (Content → Navigation)

| Menü-Slug | Steuert |
|-----------|---------|
| `navbar` | Header-Menü |
| `footer` | Footer-Links (3 Spalten mit Kindern) |

---

## Rechtliche Hinweise (Abfindungsbrennerei)

| Anforderung | Status | Wo |
|------------|--------|-----|
| Impressum (ECG §5) | Im CMS | Content → Pages → `impressum` |
| AGB (FAGG) | Im CMS | Content → Pages → `agb` |
| Datenschutz (DSGVO) | Im CMS | Content → Pages → `datenschutz` |
| Widerruf (FAGG §11) | Im CMS | Content → Pages → `widerruf` |
| Jugendschutz 18+ (NÖ JG §18) | Im CMS + Code | Checkout-Pflichtfeld geplant |
| "Unter Abfindung hergestellt" | Im Code | Automatisch auf allen Produkten |
| Grundpreis pro Liter (PrAG) | Im Code | Berechnet aus `inhalt` Attribut |
| Nur Österreich (§57 AlkStG) | In AGB + Versand | CMS-Seiten |
| Nur Letztverbraucher | In AGB | CMS-Seite |

---

## DNS-Records

```
A    shop.edelbrandfreunde.at     37.27.252.223
A    api.edelbrandfreunde.at      37.27.252.223
A    admin.edelbrandfreunde.at    37.27.252.223
A    mail.edelbrandfreunde.at     37.27.252.223

# E-Mail (wenn Port 25 freigeschaltet)
TXT  @                 v=spf1 ip4:37.27.252.223 ~all
TXT  mail._domainkey   v=DKIM1; h=sha256; k=rsa; s=email; p=MIIBIjAN...
TXT  _dmarc            v=DMARC1; p=none; rua=mailto:noreply@edelbrandfreunde.at
```

---

## Dateistruktur

```
saleor-production/
├── docker-compose.yml          # Alle Container
├── Caddyfile                   # Reverse Proxy + TLS
├── CLAUDE.md                   # Regeln für Claude Code
├── README.md                   # Diese Datei
│
├── storefront-custom/          # Source Code (in Git)
│   ├── src/                    # Next.js + React
│   ├── public/                 # Statische Assets + Videos
│   └── package.json            # Dependencies
│
├── postfix-data/dkim/          # DKIM Keys (nicht in Git)
│
├── .env                        # DB/Redis Passwörter (nicht in Git)
├── .env.api                    # Saleor Config + Secrets (nicht in Git)
├── rsa_private.pem             # JWT Signing Key (nicht in Git)
│
└── storefront/                 # Live-Build (nicht in Git)
    └── .next/standalone/       # Produktions-Build
```

---

## Troubleshooting

### Storefront zeigt 502

```bash
sudo systemctl status saleor-storefront     # Läuft der Service?
journalctl -u saleor-storefront --no-pager -n 20  # Fehler?
docker compose exec caddy wget -qO- http://host.docker.internal:3000/  # Caddy → Storefront?
```

### Bilder werden nicht angezeigt

```bash
# Caddy muss das Media-Volume gemountet haben
docker compose exec caddy ls /srv/media/   # Dateien da?
curl -sI https://api.edelbrandfreunde.at/media/  # HTTP 200?
```

### Produkte nicht sichtbar

1. Produkt dem Channel `oe` zugewiesen? (Dashboard → Products → Availability)
2. Produkt publiziert? (Published = Ja)
3. Preis und Bestand gesetzt?
4. ISR-Cache abgelaufen? (Warte 5 min oder baue neu)

### Build-Fehler "Property does not exist on type"

```bash
# GraphQL Types müssen nach Fragment-Änderungen neu generiert werden
cd ~/saleor-production/storefront
NEXT_PUBLIC_SALEOR_API_URL=https://api.edelbrandfreunde.at/graphql/ pnpm run generate
```

### "Cannot find module server.js"

Der Service wurde restartet während der Build noch lief. Einfach nochmal:
```bash
sudo systemctl restart saleor-storefront
```

---

## Sicherheit

| Maßnahme | Status | Hinweise |
|----------|--------|----------|
| SSH nur mit Key, kein Root-Login | ✅ Aktiv | `MaxAuthTries 3`, `KbdInteractiveAuthentication no` |
| Fail2Ban (`[sshd]` Jail) | ✅ Aktiv | 3 Versuche → 1h Ban, nftables-Backend |
| UFW Firewall | ✅ Aktiv | Nur 22, 80, 443 ein; Port 3000 nur ab Docker-Bridges |
| HSTS + CSP + Security Headers | ✅ Aktiv | Caddyfile (Storefront + API + Admin) |
| Caddy Basic Auth (Admin Dashboard) | ✅ Aktiv | User `brennmeister` (default `admin` rotiert), Passwort in `.admin-credentials` |
| Docker `no-new-privileges` | ✅ Alle Container | + `cap_drop: ALL` für Postfix |
| Resource Limits (RAM, CPU, PIDs) | ✅ Alle Container | |
| Postfix-Image gepinnt | ✅ `boky/postfix:5.1.0` | Updates bewusst per `docker compose pull` |
| Secrets nicht in Git | ✅ `.gitignore` | `.env`, `.env.api`, `*.pem`, `.admin-credentials`, DKIM-Keys |
| Postfix Relay-Restrictions | ✅ Konfiguriert | `permit_mynetworks,reject_unauth_destination` + Rate-Limits |
| DKIM + SPF + DMARC | ⚠️ Schlüssel da, DNS-Records fehlen | Hetzner Cloud: A-Record `mail.` + Reverse-DNS, dann SPF/DKIM/DMARC TXT |
| Checkout Cookie `httpOnly` | ✅ Aktiv | `secure: true`, `sameSite: lax` |
| GraphQL Playground UI deaktiviert | ✅ `PLAYGROUND_ENABLED=False` | GET `/graphql/` → 405 |
| **App-Level Rate-Limits** | ✅ Aktiv | `/api/auth/register` 5/60s, `/api/auth/reset-password` 3/5min, `/api/auth/set-password` 5/60s — siehe `src/lib/rate-limit.ts` |
| **Tägliche Backups** | ✅ Aktiv (Cron 03:30) | DB + Media in `~/backups/`, 7 Tage Retention — siehe `backup.sh` |

### Rate-Limits
Config in `storefront-custom/src/lib/rate-limit.ts`. Sliding-Window per IP:

| Endpoint | Limit | Fenster | Begründung |
|----------|------:|--------:|-----------|
| `/api/auth/register` | 5 | 60 s | Anti-Spam, Anti-DoS |
| `/api/auth/reset-password` | 3 | 5 min | Email-Bomb-Prevention (jeder Call schickt eine E-Mail) |
| `/api/auth/set-password` | 5 | 60 s | Brute-Force der Reset-Token verhindern |

Bei Limit-Trigger: HTTP 429 mit `Retry-After`-Header. IP wird aus `X-Forwarded-For` (Caddy) extrahiert.

### Backups
Daily 03:30 via Cron, retention 7 Tage:
- DB: `~/backups/db/saleor-{ISO}.dump` (PostgreSQL custom format, gzip-9)
- Media: `~/backups/media/media-{ISO}.tgz`
- Log: `~/backups/backup.log`

Restore (siehe Header von `backup.sh`):
```bash
docker exec -i saleor-production-db-1 pg_restore -U saleor -d saleor --clean --if-exists < backup.dump
tar xzf media.tgz -C /var/lib/docker/volumes/saleor-production_saleor-media/_data/
```

⚠️ Off-site-Backup (Hetzner Storage Box / S3) noch nicht eingerichtet — bei Server-Loss sind die Backups weg.

### UFW Setup-Skript
Das aktive UFW-Regelwerk liegt als reproducible Skript im Repo unter `setup-ufw.sh`.
Bei Server-Wechsel oder Re-Install:

```bash
sudo bash /home/webshopadmin/saleor-production/setup-ufw.sh
```

Das Skript ist idempotent (zwei Mal ausführen schadet nicht) und lässt SSH **vor** dem Enable explizit zu — kein Lockout-Risiko.

---

## Noch offen

### 🔴 Go-Live Blocker

| # | Was | Wo zu tun? |
|---|-----|------------|
| 1 | **Zahlungsanbieter (Stripe)** Integration | Saleor Dashboard → Configuration → Plugins, dann Storefront Checkout |
| 2 | **Mail-Versand operational machen** — Port 25 gesperrt, brauchen Relay | Hetzner Support-Ticket für Port-25-Unblock ODER Brevo/Mailgun als Smart-Host |
| 3 | **DNS-Records für Mail**: A-Record `mail.edelbrandfreunde.at`, Reverse-DNS (PTR), SPF, DKIM, DMARC | Hetzner Cloud Console + Domain-Provider |
| 4 | **Altersverifikation 18+ Checkbox** im Checkout (NÖ JG §18) | ✅ **Erledigt** (in `storefront-custom/src/checkout/`) |
| 5 | **Impressum / Datenschutz / Widerruf ausfüllen** — `[BITTE AUSFÜLLEN]` Platzhalter ersetzen | Saleor Dashboard → Content → Pages |
| 6 | **Saleor-Admin-Passwort rotieren** (`TempAdmin2026!` ist temporär) | Dashboard → Account-Icon → Account |

### 🟡 Security — Defense in Depth

| # | Was | Hinweise |
|---|-----|----------|
| 7 | **GraphQL Introspection per POST blockieren** (Phase B) | Aktuell deaktiviert nur die Playground-UI. POST `__schema` Queries gehen noch durch. Bräuchte Saleor-Source-Patch oder Custom-Image. |
| 8 | **Off-site-Backups** | Hetzner Storage Box (~3,80 €/Monat 1 TB) per `rclone`/`rsync` täglich — aktuell liegen Backups nur lokal |
| 9 | **Restore-Drill** | Mind. einmal Backup in Test-DB einspielen — sonst weiß man nicht, ob er funktioniert |
| 10 | **Admin-IP-Whitelist** (optional) | Caddy `@allowed_ips` für `admin.` falls du nur von Heim-IP zugreifst |
| 11 | **Rate-Limits per Redis-Backend** | Aktuell In-Memory, OK für Single-Process. Bei Horizontal-Scaling Pflicht. |
