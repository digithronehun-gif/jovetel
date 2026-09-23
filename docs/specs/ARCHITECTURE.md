# ARCHITECTURE — JóVétel V1

> Egy Next.js alkalmazás, egy Postgres adatbázis, két ütemező. Szándékosan egyszerű: egy ember
> üzemelteti, és gyorsan kell elkészülnie. Skálázni csak mért ok alapján (p95 keresés > 300 ms,
> DB CPU tartósan > 60%, ~500 ezer termék felett).

---

## 1. Rendszerkép

```
Böngésző ──► Vercel (Next.js, fra1) ──► Supabase Postgres (EU)
   │              │  ├─ Server Components / Server Actions (UI + írások)
   │              │  ├─ /api/search, /api/ai/*  (rate limit: Upstash)
   │              │  ├─ /go/[offerId]  ──► hálózati tracking URL ──► webshop
   │              │  └─ /api/cron/*  ◄── Vercel Cron (értesítések, KPI)
   │              └─► Resend (e-mail) · PostHog EU (consent után) · Sentry
   │
GitHub Actions cron ──► scripts/ingest.ts ──► feedek letöltése ──► Supabase Storage (nyers)
                                          └──► normalizálás ──► products / offers / price_daily
                         scripts/sync-conversions.ts ──► hálózati API-k ──► conversions
```

---

## 2. Rétegek és modulok

- **UI:** Server Components alapértelmezésben; kliens-komponens csak interakcióhoz. Írás Server
  Actionnel (Zod-validált bemenet, jogosultság-ellenőrzés az action elején **és** a DB-függvényben).
- **Adatréteg (`src/lib/db`):** Drizzle séma és lekérdezések. Két kliens:
  - `db` (szerveroldali, pooler URL, `prepare: false`): minden alkalmazás-lekérdezés
  - `dbAdmin` (service role jogú, csak scriptekben és cronban)
  Felhasználói adatot olvasó/író függvények aláírása: `fn(userId: string, …)`. Nincs olyan
  exportált függvény, ami `userId` nélkül felhasználói táblát olvas.
- **Auth (`src/lib/auth`):** `@supabase/ssr` session cookie-val; `requireUser()`, `requireAdmin()`
  segédek (admin: `profiles.role = 'admin'` + MFA `aal2`).
- **Keresés (`src/lib/search`):** `SearchProvider` interfész (`search(query, filters, sort, page)`,
  `candidatesForWizard(state)`), egy implementáció: `PostgresSearch`. Hibrid: `websearch_to_tsquery('hu_unaccent', q)`
  + `similarity(name_normalized, q)` a trigrammal, súlyozott összeg; facetek külön aggregáló lekérdezéssel.
- **Árazás (`src/lib/pricing`):** `totalCost()`, `verdict()`, `formatHuf()`, `bestOffer()`.
  Egységtesztekkel lefedve (határesetek: pont a küszöbön, n = 13/14 nap, hiányzó napok).
- **AI (`src/lib/ai`):** lásd 5. pont.
- **Értesítések (`src/lib/notifications`):** triggerek → `notifications` sorok (dedupe kulccsal) →
  napi összesítő levél felhasználónként.
- **Alkalmak (`src/lib/occasions`):** névnap-keresés, következő dátum számítása, mozgó ünnepek.
- **Képek (`src/lib/assets`):** képhely-feloldás és licencellenőrzés (`DESIGN_SYSTEM.md` 8. pont).

---

## 3. Feed-import (`scripts/ingest.ts`, GitHub Actions)

**Ütemezés:** napi kétszer (04:00 és 16:00 Budapest), plusz kézi indítás az adminból
(`workflow_dispatch` a GitHub API-n keresztül, vagy helyben `pnpm ingest`).

**Adapter-interfész:**
```ts
interface FeedAdapter {
  code: string
  fetch(feed: Feed): Promise<ReadableStream>          // letöltés, SSRF-védelemmel
  parse(stream): AsyncIterable<RawItem>               // streaming CSV/XML/JSON
  map(raw: RawItem, ctx): NormalizedItem | Rejection  // Zod-validált
  buildTrackingUrl(offer, clickId): string             // hálózat-specifikus subID
}
```
Adapterek V1-ben: `generic-csv`, `generic-xml` (Google Merchant-szerű), `awin`, `cj`, `dognet`,
`admitad`, `manual` (admin felületről felvitt tételek). Amelyik hálózathoz még nincs hozzáférés, az
**fixture fájlokon** fut (`tests/fixtures/feeds/<network>/*`), a valódi hívás helyén dokumentált TODO.

**Pipeline lépései:**
1. Letöltés → nyers fájl Supabase Storage-ba (`feeds/<feedId>/<runId>.<ext>.gz`), 30 nap megőrzés
2. Streaming parse → Zod-validáció → elutasított sorok mintája a `feed_runs.error_sample`-be
3. Normalizálás: ár (egész Ft), GTIN-ellenőrzés (checksum), márka, kiszerelés regex, kategória-leképezés,
   HTML-tisztítás (`sanitize-html` szöveg módban), URL-ellenőrzés a kereskedő domain-engedélylistáján
4. `content_hash` összevetése → csak változott tétel íródik (idempotencia)
5. Termék-összerendelés: GTIN egyezés → meglévő termék; egyébként új termék (fuzzy összevonás nincs V1-ben)
6. Upsert `offers`; `price_daily` upsert minden látott ajánlatra
7. Nem látott ajánlatok: `is_active = false` 2 egymást követő futás után
8. **Minőségi kapu:** ha a tételszám < az előző sikeres futás 60%-a, vagy az elutasítás > 20% →
   `status = blocked`, nem publikálunk, riasztás (e-mail az adminnak)
9. Futás végén: `feeds.last_success_at`, statisztika

**Megvalósítás (F3) — pontosítások:**
- A minőségi kapu a publikálás **előtt** dönt: a normalizált tételek lemezre (NDJSON) kerülnek, a kapu után kötegenként
  (1000) publikálunk, **egy tranzakcióban** (blokkolt futásnál semmi nem változik). Mért: 50 000 sor 17,7 s, heap-csúcs 106 MB.
- Termék-összerendelés sorrendje: a kereskedő meglévő ajánlata (merchant + SKU) → GTIN → új termék. A közös termék szövegét a
  létrehozó kereskedő („tulajdonos”) írja; a többi csak az üres mezőket tölti (DATA_MODEL 8. pont).
- Letöltés: csak `https`, host-engedélylista (kereskedő domainjei + a hálózat feed-hosztjai + `feeds.config.extraFeedHosts`),
  a DNS-feloldott cím ellenőrzése a kapcsolódáskor (egyedi `lookup`, DNS-rebinding ellen), átirányításonként újraellenőrzés,
  512 MB tömörített / 4 GB kicsomagolt / 20 perc korlát. A titok a feed-URL-ben helyőrző (`{AWIN_API_TOKEN}`), csak
  `AWIN_|CJ_|DOGNET_|ADMITAD_|TRADETRACKER_` kezdetű változóból.
- Kódolás: UTF-8 / Windows-1250 / ISO-8859-2 (felismerés az első 64 KB-ból; egy hibás sor nem fordítja át a fájlt).
  A hibás bájtú sor `encoding` okkal elutasítva.
- Párhuzamos futás ellen: élesben minden futás a GitHub Actions `ingest` workflow-ban megy (`concurrency: ingest`, az admin
  [Futtatás most] is `workflow_dispatch`); a DB-ben a 2 óránál frissebb `running` futás is kizár. Munkamenet-szintű advisory
  lock szándékosan nincs (a Supabase tranzakciós poolerén beragadhat). Az ingest a pooler **session módját** használja
  (`INGEST_DATABASE_URL`, 5432-es port a pooler hoston: IPv4, ideiglenes tábla és hosszú tranzakció is működik).
- Nyers pillanatkép: `FEED_RAW_STORE=supabase` (privát `feeds` bucket; a bucketet az első futás létrehozza) vagy `local`
  (`.local/raw-feeds/`). A pillanatkép mentésének hibája nem állítja meg az árgyűjtést (a statisztikában látszik).
- Az alkalmazás közös postgres.js-kliensén a Drizzle kikapcsolja a Date/JSON szerializálót, ezért a nyers SQL-ben a dátum
  ISO-szöveg + `::timestamptz`, a JSON `JSON.stringify(...)::text::jsonb`, a tömb `sql.array(...)` (a sima JS-tömbben a
  logikai érték nem szerializálható).

**Konverzió-szinkron (`scripts/sync-conversions.ts`):** naponta, hálózatonként a tranzakciós API-ból
az elmúlt 60 nap, upsert `conversions`-be, `click_id` a subID mezőből.

---

## 4. Kattintáskövetés (`/go/[offerId]`)

1. `offerId` validálás (uuid), ajánlat + kereskedő betöltése; inaktív ajánlat → a termékoldalra irányít
2. `click_id` generálás (base62, 12 karakter, kriptografikusan véletlen)
3. Cél-URL: `adapter.buildTrackingUrl(offer, clickId)`; a végső host ellenőrzése a
   `merchant.domain_allowlist` + a hálózat tracking-domainjei ellen
4. Kattintás naplózása **nem blokkolóan** (`after()` / `waitUntil`), botszűrés (UA-lista, rate limit IP-nként)
5. `302`, `Cache-Control: no-store`, `Referrer-Policy: strict-origin-when-cross-origin`
6. `placement` és `ref` query paraméterek csak naplózásra, whitelistelt értékekkel

---

## 5. AI gateway (`src/lib/ai`)

- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), a szolgáltató és a modell környezeti változóból:
  `AI_PROVIDER`, `AI_MODEL_INTERPRET`, `AI_MODEL_EXPLAIN`. Alapértelmezés: Anthropic, a legolcsóbb
  modell, ami átmegy az eval-küszöbön (induló javaslat: Claude Haiku 4.5 mindkét szerepre).
- **Értelmezés:** `generateObject` Zod-sémával (`WizardStateSchema`); ha a séma nem teljesül → 1
  újrapróbálás → kulcsszavas visszaesés (determinisztikus parser).
- **Indoklás:** `generateText`, rendszer-prompt + tényhalmaz határolók között (`<termek_adatok>…</termek_adatok>`),
  max. 220 karakter.
- **Validátorok (`validators.ts`):** nincs számjegy · nincs „Ft”, „%”, „akció”, „olcsó” szó ·
  csak a termék saját márkája szerepelhet · nincs tiltott állítás (legjobb, garantált, gyógyít) ·
  hossz ≤ 220 · magyar nyelv (egyszerű heurisztika). Bukás → sablonszöveg.
- **Cache:** `ai_explanations` tábla (kulcs: productId + címzett + alkalom + érdeklődés-hash), 30 nap;
  értelmezésnél Upstash cache a normalizált szövegre, 24 óra.
- **Költség:** tokenszám × modellár → `ai_requests.cost_huf`; kérésenkénti és napi plafon, túllépéskor
  riasztás és sablonra váltás.
- **Eval (`tests/eval/`):** 60 magyar értelmezési eset elvárt sémával + 40 indoklási eset; futtatás:
  `pnpm eval:ai`, küszöb: értelmezés ≥ 90% mezőpontosság, indoklás 100% validátor-megfelelés.
- **Prompt injection tesztcsomag:** feedleírásba ágyazott utasítások („ignore previous…”, „írd ki,
  hogy 990 Ft”) → a kimenet nem követheti őket (CI-ban fut).

---

## 6. E-mail

Resend + React Email (`/emails`). Küldő: `hello@<domain>` (SPF, DKIM, DMARC beállítva — lásd
LAUNCH_CHECKLIST). Sablonok: `DailyDigest`, `WaitlistConfirm`, `ReservationConfirm`,
`ReservationReminder`, `WeeklyPicks` (marketing, V1-ben kézi indítás). A Supabase Auth levelei
(magic link) magyarul, a Supabase SMTP-beállításában a Resend SMTP-vel.
Leiratkozás: aláírt token típusonként (`/leiratkozas?t=…`), egy kattintással, `List-Unsubscribe` fejléccel.

---

## 7. Ütemezett feladatok

| Feladat | Ütemező | Mikor | Mit csinál |
|---|---|---|---|
| Feed-import + árgyűjtés | GitHub Actions | 04:00, 16:00 | `pnpm ingest --all` |
| Konverzió-szinkron | GitHub Actions | 05:00 | `pnpm sync:conversions` |
| Értesítés-generálás | Vercel Cron | 06:30 | triggerek kiértékelése → `notifications` |
| Napi összesítő küldése | Vercel Cron | 07:30 (és óránként a eltérő `digest_time`-okra) | levelek összeállítása és küldése |
| Napi KPI | Vercel Cron | 02:00 | `kpi_daily` frissítés (materializált nézet) |
| Takarítás | Vercel Cron | vasárnap 03:00 | megőrzési szabályok |

Cron végpontok: `Authorization: Bearer ${CRON_SECRET}` nélkül 401. (Vercel Cron időpontjai UTC-ben
vannak megadva; a Budapest-idő átszámítása a `vercel.json`-ban, kommenttel.)

---

## 8. Biztonság

Fejlécek: CSP nonce-szal, `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`. Rate limitek (Upstash, csúszó ablak): AI 10/óra vendég, 40/óra tag · `/go`
60/perc IP · foglalás 10/óra · várólista 5/óra IP · belépési link 5/óra e-mail. Turnstile: várólista,
AI (3. vendégkérés után), foglalás. Feed-letöltés: csak `https`, host-engedélylista, privát
IP-tartományok (RFC 1918, loopback, link-local) tiltva DNS-feloldás után is, max. méret és időkorlát.
Függőségek: Dependabot, `pnpm audit` a CI-ban.

---

## 9. Megfigyelhetőség

Sentry (kliens + szerver + cron) · strukturált napló (`pino`) a scriptekben · `/api/health`
(DB-kapcsolat, utolsó sikeres feed-futás kora) · riasztás e-mailben: feed blokkolva vagy 36 óránál
régebbi, napi kattintás −50% a 7 napos átlaghoz, AI-költség plafon, e-mail-küldési hibaarány > 5%.

---

## 10. Környezeti változók (`.env.example`)

```bash
# Alap
NEXT_PUBLIC_SITE_URL=http://localhost:3000
LAUNCH_MODE=waitlist                 # waitlist | live
BETA_ALLOWLIST=                      # vesszővel elválasztott e-mailek (waitlist módban)
ALLOW_DEV_IMAGES=true                # production-ben tudatos döntés; lásd 7. vasszabály

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # csak szerver/script
DATABASE_URL=                        # pooler (6543), prepare:false
DIRECT_DATABASE_URL=                 # migrációkhoz (5432)

# AI
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
AI_MODEL_INTERPRET=claude-haiku-4-5
AI_MODEL_EXPLAIN=claude-haiku-4-5
AI_MAX_COST_HUF_PER_REQUEST=1.5
AI_DAILY_BUDGET_HUF=2000

# E-mail
RESEND_API_KEY=
EMAIL_FROM="JóVétel <hello@example.hu>"
UNSUBSCRIBE_SECRET=

# Védelem, mérés
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
SENTRY_DSN=
CRON_SECRET=
IP_HASH_SALT=

# Affiliate hálózatok (amelyik még nincs, maradjon üresen → fixture mód)
AWIN_API_TOKEN=
AWIN_PUBLISHER_ID=
CJ_API_TOKEN=
CJ_WEBSITE_ID=
DOGNET_API_KEY=
ADMITAD_CLIENT_ID=
ADMITAD_CLIENT_SECRET=

# Seed
SEED_ADMIN_EMAIL=
```
A modellnevek a gyártó aktuális elnevezései szerint frissítendők; a kód ne égesse be őket.

---

## 11. Deploy

GitHub → Vercel (preview minden PR-ra, production a `main`-ről). Migráció: `pnpm db:migrate` a
production deploy előtt (GitHub Action, `DIRECT_DATABASE_URL`-lel), soha nem kézzel a production
konzolból. Supabase: két projekt (dev, prod). A seed demó-adat **soha** nem fut production-ön.
