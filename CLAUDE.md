# CLAUDE.md — Projekt-Regeln und Lektionen

## Projekt-Übersicht
Self-hosted Saleor E-Commerce für edelbrandfreunde.at (österreichische Edelbrände).
- Saleor API 3.20 + Dashboard 3.20 (Docker)
- Next.js Storefront (systemd Service, Port 3000)
- Caddy Reverse Proxy (Docker, Auto-TLS)
- PostgreSQL 16 + Redis 7 (Docker)

## Sprache
- Der Webshop ist auf **Deutsch** (de-AT). Alle UI-Strings müssen auf Deutsch sein.
- Code-Kommentare und Variablennamen bleiben auf Englisch.
- `replace_all` bei Übersetzungen NIEMALS verwenden — es überschreibt auch Variablennamen, CSS-Properties und Interface-Names (z.B. "Color" → "Farbe" hat `backgroundColor` zu `backgroundFarbe` gemacht).

## Build-Prozess

### Channel-Slug
- **IMMER** `NEXT_PUBLIC_DEFAULT_CHANNEL=oe` verwenden, NIEMALS `default-channel`.
- Beim Build IMMER explizit setzen: `NEXT_PUBLIC_DEFAULT_CHANNEL=oe npx next build`
- Falscher Channel-Slug führt dazu, dass die Seite auf `/default-channel` statt `/oe` redirected.

### Build-Befehl (vollständig)
```bash
cd ~/saleor-production/storefront
rm -rf .next
NEXT_OUTPUT=standalone \
NEXT_PUBLIC_SALEOR_API_URL=https://api.edelbrandfreunde.at/graphql/ \
NEXT_PUBLIC_DEFAULT_CHANNEL=oe \
npx next build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
# Dann: sudo systemctl restart saleor-storefront
```

### Build-Verzeichnis
- Build MUSS im `storefront/` Verzeichnis ausgeführt werden, NICHT im Root `saleor-production/`.
- Falsches Verzeichnis gibt: "Couldn't find any `pages` or `app` directory"

### Next.js 16 Einschränkungen
- `export const dynamic = "force-dynamic"` ist NICHT kompatibel mit `cacheComponents`. Verwende stattdessen `<Suspense>` Boundaries um dynamische Daten.
- `useLayoutEffect` ist problematisch für SSR/Hydration. Bevorzuge `useEffect` mit `mounted` State-Pattern.
- `next-view-transitions` Library ist INKOMPATIBEL mit `cacheComponents: true`. Die `<ViewTransitions>` Wrapper-Komponente bricht den Partial Prerender für ALLE dynamischen Seiten. Nicht verwenden bis Next.js native View Transitions einbaut.
- Page Transitions werden über direkte DOM-Manipulation auf `<main>` gemacht (`page-transition.tsx`), nicht über die View Transitions API.

### Restart erfordert sudo
- `sudo systemctl restart saleor-storefront` — erfordert Terminal-Passwort.
- Claude kann das nicht automatisch ausführen. User muss es manuell machen.

## Hydration & SSR Fehler

### NIEMALS `visibility: hidden` vom Server rendern
- Client Components die Animationen steuern dürfen NIEMALS `visibility: hidden` oder `opacity: 0` im Server-Render setzen.
- Wenn JavaScript nicht lädt oder langsam ist (besonders Safari), bleibt der Content **für immer unsichtbar**.
- **Richtig**: Server rendert Content sichtbar. GSAP/JS versteckt und animiert erst nach Client-Mount (`useEffect`).
- **Falsch**: `style={prefersReduced ? {} : { visibility: "hidden" }}` im JSX Return.

### Vercel SpeedInsights entfernt
- `@vercel/speed-insights` verursacht auf Self-Hosted Servern einen 404 (`/_vercel/speed-insights/script.js`).
- Das löst **React Error #418 (Hydration Mismatch)** aus → komplette Seite lädt nicht.
- Die Komponente wurde aus `layout.tsx` entfernt. NIEMALS wieder hinzufügen.

### KEINE Block-Elemente in `<a>` Links wrappen
- `<div>`, `<h3>`, `<p>` innerhalb von `<a>` verursacht **HierarchyRequestError** in Safari.
- Safari's HTML-Parser korrigiert ungültige Verschachtelungen anders als React erwartet → Hydration Mismatch → Seite lädt nicht beim ersten Aufruf (erst nach Reload).
- **Richtig**: Link als unsichtbarer Overlay (`<a class="absolute inset-0 z-10">`) innerhalb eines `<div>` Containers.
- **Falsch**: `<LinkWithChannel><div><h3>...</h3><p>...</p></div></LinkWithChannel>`
- Betrifft vor allem Karten-Komponenten (Kategorien, Produkte) wo ein ganzer Block klickbar sein soll.

### KEINE unterschiedlichen DOM-Bäume in Client Components rendern
- Client Components die je nach State (z.B. `prefersReduced`) **komplett unterschiedliches JSX** rendern, verursachen Hydration Mismatches.
- **Richtig**: Immer die gleiche DOM-Struktur rendern, nur Styles/Klassen per State toggling ändern.
- **Falsch**: `if (prefersReduced) return <p>...</p>; return <div><span>...</span></div>;` (MarqueeBanner hatte das).

### `NEXT_PUBLIC_STOREFRONT_URL` muss gesetzt sein
- Ohne diese Variable rendern Meta-Tags (og:image, twitter:image) mit `http://localhost:3000/` → Hydration Mismatch.
- In `.env`: `NEXT_PUBLIC_STOREFRONT_URL=https://shop.edelbrandfreunde.at`
- Beim Build: `NEXT_PUBLIC_STOREFRONT_URL=https://shop.edelbrandfreunde.at npx next build`

### useState Initializer und window
- `useState(() => window.matchMedia(...))` ist ok für Client Components.
- Aber: Server rendert `false`, Client könnte `true` rendern → Hydration Mismatch.
- Verwende den shared Hook `useReducedMotion()` aus `@/hooks/use-reduced-motion.ts`.

## CMS-Integration

### Alle Texte kommen aus dem Saleor Dashboard
- Content → Pages: `landing-hero`, `landing-sortiment`, `landing-bestseller`, `landing-qualitaet`, `landing-destillation`, `landing-about`
- Catalog → Categories: Kategorie-Namen und Beschreibungen
- Catalog → Collections → "Featured Products": Bestseller-Produkte
- Content → Navigation: `navbar`, `footer`
- **NIEMALS** editierbaren Text hardcoden.

### Newlines in CMS-Text
- `parseEditorJSToText()` verbindet Absätze mit `\n` (nicht Leerzeichen).
- Elemente die diesen Text anzeigen brauchen `whitespace-pre-line` CSS-Klasse.

### EditorJS Content Parsing
- `parseEditorJSToHtml()` → Array von sanitierten HTML-Strings (für `dangerouslySetInnerHTML`)
- `parseEditorJSToText()` → Plain text mit `\n` für Absätze
- XSS-Sanitierung passiert automatisch via `xss` Library.

## Sicherheit

### Secrets NIEMALS committen
- `.env`, `.env.api`, `*.pem` sind in `.gitignore`.
- `storefront-custom/.env` ist ebenfalls excluded.
- Nur `.env.example` Dateien mit Platzhaltern committen.

### redirectUrl Validierung
- `register/route.ts` und `reset-password/route.ts` validieren `redirectUrl` gegen eine Whitelist.
- Ohne Validierung: Open Redirect Vulnerability via Phishing-Emails.

### JWT nicht im Response Body
- `set-password/route.ts` gibt den JWT Token NUR als httpOnly Cookie zurück.
- NIEMALS den Token auch im JSON Response Body mitsenden.

### Query-String Secrets entfernt
- `api-auth.ts` akzeptiert Secrets NUR via `Authorization: Bearer` Header.
- Query-String `?secret=` wurde entfernt (Secrets in Logs/Referer-Headers sichtbar).

## Storefront Code

### Storefront-Custom
- `storefront-custom/` enthält den kompletten angepassten Source Code (committet in Git).
- `storefront/` ist der Live-Build (separater Git-Clone, excluded von Git).
- Wiederherstellen: `cp -r storefront-custom storefront && pnpm install && next build`

### GSAP
- GSAP + ScrollTrigger ist installiert (`gsap` npm Package).
- Plugin-Registration in `src/lib/gsap.ts`.
- ScrollTrigger muss importiert werden damit das Plugin registriert wird (auch wenn die Variable nicht direkt verwendet wird).

### Animation Components
- `RevealOnScroll` — GSAP ScrollTrigger, Varianten: fade-up, fade-scale, fade-blur, scrub-up
- `HeroEntrance` — GSAP Timeline für Hero-Entrance-Sequenz
- `ProductCarousel` — Horizontaler Scroll mit Snap
- `QualityCounter` — Animated counting numbers
- `MarqueeBanner` — Infinite horizontal ticker
- `PageTransition` — Claude.ai-style Dissolve (manipuliert `<main>` direkt, rendert kein DOM)

### Tailwind Custom Tokens
- `text-hero`: `clamp(3rem, 8vw, 10rem)` — fluid Hero-Schriftgröße
- `text-section`: `clamp(2rem, 5vw, 5rem)` — fluid Section-H2-Schriftgröße
- Font-Families: `font-sans` (Geist), `font-display` (Cormorant Garamond)

## Docker

### Resource Limits gesetzt
- Alle Container haben Memory/CPU Limits und `no-new-privileges:true`.
- Log-Rotation: `max-size: 10m, max-file: 5` auf allen Containern.

### Caddyfile
- `X-XSS-Protection` Header wurde entfernt (deprecated, kann XSS-Filter-Bypass verursachen).
- CSP: `unsafe-eval` wurde entfernt. `unsafe-inline` für Scripts bleibt (Next.js benötigt es).
- API-Domain hat eigene restriktive CSP: `default-src 'none'; frame-ancestors 'none'`.
