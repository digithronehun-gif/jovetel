# JóVétel

**Személyes vásárlási társ, ami emlékszik rád.** Magyar nyelvű webalkalmazás (Next.js 16, Supabase,
Tailwind), ami magyar webshopok valódi áraival dolgozik, licencelt affiliate feedekből.
Szlogen: *„Rávilágítunk a jó vételre.”*

- A szabályzat és a hét vasszabály: [`CLAUDE.md`](CLAUDE.md)
- Az építés menete (14 fázis): [`START_PROMPT.md`](START_PROMPT.md) · haladás: [`docs/PROGRESS.md`](docs/PROGRESS.md)
- Specifikációk: [`docs/specs/`](docs/specs) · nyitott kérdések: [`docs/specs/OPEN_QUESTIONS.md`](docs/specs/OPEN_QUESTIONS.md)
- Az indulócsomag leírása a tulajdonosnak: [`README_INDULAS.md`](README_INDULAS.md)

## Követelmények

- Node.js ≥ 22.12, pnpm 10 (`corepack enable` vagy `npm i -g pnpm`)
- Helyi adatbázishoz: **vagy** Supabase CLI + Docker (`supabase start`), **vagy** Docker nélkül
  PostgreSQL 16 + a `pnpm local:up` script (lásd lent)

## Parancsok

```bash
pnpm install
pnpm dev                 # fejlesztői szerver: http://localhost:3000
pnpm build               # production build (előtte check:assets --enforce, 7. vasszabály)
pnpm verify              # lint + typecheck + unit tesztek — minden feladat végén
pnpm test:db             # adatbázis-tesztek (futó helyi DB kell)
pnpm test:e2e            # Playwright e2e
pnpm check:assets        # mely képhelyek használnak még moodboard-dev-only képet, és hol
pnpm env:check           # mely környezeti változók vannak beállítva (érték nélkül)
pnpm screenshots -- /styleguide   # képernyőkép 390/1440 px × világos/sötét
```

A teljes lista a `package.json`-ban és a `CLAUDE.md` 6. pontjában.

## Helyi fejlesztés (adatbázis és belépés)

**A) Supabase CLI + Docker (ajánlott a saját gépeden):**
```bash
supabase start                     # Postgres :54322, API :54321, Studio :54323, levelek :54324
pnpm db:migrate && pnpm db:seed    # sémák + fejlesztői minta-adat
pnpm dev
```
A `.env.local`-ba a `supabase start` által kiírt `anon key` és `service_role key` kerül, a `DATABASE_URL` pedig
`postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

**B) Docker nélkül (Linux, pl. felhős fejlesztői környezet):**
```bash
pnpm local:up        # Postgres 16 + GoTrue (Supabase Auth) + Mailpit, ugyanazokon a portokon
pnpm db:migrate && pnpm db:seed
pnpm dev:local       # a .local/stack.env változóival indul
pnpm local:down
```
Ez PostgreSQL 16 szervert igényel a gépen (`postgresql-16`); a GoTrue és a Mailpit binárisát a script tölti le.

**Tesztek:** `pnpm test:db` egy friss `jovetel_test` adatbázist hoz létre a helyi szerveren (vagy a
`TEST_DATABASE_ADMIN_URL`-en), és azon futtatja a migrációkat.

### A valódi Supabase bekötése
1. Két projekt a Supabase-ben, **Frankfurt (eu-central-1)** régióban: `jovetel-dev` és `jovetel-prod`.
2. Project Settings → Database: a **Connection pooling** (Transaction, 6543-as port) címe a `DATABASE_URL`,
   a közvetlen (5432) cím a `DIRECT_DATABASE_URL`. API → `NEXT_PUBLIC_SUPABASE_URL`, `anon`, `service_role` kulcs.
3. Migráció a saját gépedről: `DIRECT_DATABASE_URL=… pnpm db:migrate` (az automatikus, deploy előtti
   migráció GitHub Actionben később készül el; addig kézzel, minden séma-változás után).
4. **A prod adatbázis megjelölése** (a seed ezt is ellenőrzi, és nem fut rajta):
   `alter database postgres set app.environment = 'production';`
5. Auth → URL Configuration: Site URL és Redirect URLs (`https://<domain>/auth/callback`); Auth → Email Templates:
   a magyar sablon a `supabase/templates/magic-link.html`; Auth → SMTP: a Resend SMTP-adatai.

## Képek és a production build

A `public/brand/moodboard/` képei Pinterest-moodboardból származnak (`moodboard-dev-only` licenc).
Production buildben csak akkor jelenhetnek meg, ha **tudatosan** beállítod: `ALLOW_DEV_IMAGES=true`.
Enélkül a `pnpm build` hibával leáll, és kiírja a cserélendő képhelyeket. Csere: `docs/SEGEDPROMPTOK.md`
→ „Képek cseréje”.

## Szerkezet

```
app/            útvonalak (App Router), a CLAUDE.md 5. pontja szerint
src/lib/        modulok (db, ingestion, search, pricing, ai, notifications, occasions, assets, auth, analytics)
src/components/ ui/ (alap), app/ (domain), brand/ (aláíró elemek)
src/styles/     design tokenek (tokens.css) — az egyetlen hely, ahol literál szín állhat
emails/         React Email sablonok
scripts/        ingest, check-assets, seed, helyi stack
tests/          unit, db, e2e, fixtures, eval
```

## Ismert hiányosságok

A fázisok végén frissül; a teljes lista az F13 után kerül ide.
