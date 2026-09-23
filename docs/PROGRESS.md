# Haladásnapló

> A Claude Code vezeti. Ez a munka memóriája: megszakadás után innen folytatódik.
> A tulajdonos innen követi, hol tart a fejlesztés.

## Aktuális állapot
- **Jelenlegi fázis:** F3 — Feed-import és napi árgyűjtő (🔨)
- **Utolsó frissítés:** 2026-09-23
- **Mérföldkő / teendő a tulajdonosnak:** lásd lent, **1. mérföldkő: a landing élesíthető waitlist módban**

> ## 🚩 MÉRFÖLDKŐ 1 — a landing élesíthető waitlist módban (F2 kész, 2026-09-23)
>
> A nyilvános landing, a várólista (double opt-in), a jogi oldalak és a süti-hozzájárulás kész és mérve.
> Ha most szeretnéd élesíteni, ezek a lépések, sorrendben. Ami nálad van, azt nem tudom helyetted megtenni.
>
> **1. Supabase prod projekt** (ha még nincs; OPEN_QUESTIONS #11)
> - supabase.com → New project: `jovetel-prod`, régió **Frankfurt (eu-central-1)**, erős DB-jelszó.
> - Project Settings → Database: a **Transaction pooler** (6543-as port) címe lesz a `DATABASE_URL`,
>   a közvetlen (5432) cím a `DIRECT_DATABASE_URL`.
> - A saját gépeden, a repó gyökerében: `DIRECT_DATABASE_URL="<közvetlen cím>" pnpm db:migrate`
>   (létrehozza a táblákat; a seedet élesben **ne** futtasd).
> - SQL Editorban egyszer: `alter database postgres set app.environment = 'production';`
>   (ez védi a prod adatbázist a seedtől és a visszavonástól).
>
> **2. Domain és e-mail** (OPEN_QUESTIONS #1, #7)
> - Domain (pl. `jovetel.hu`) megvásárlása, ha még nincs.
> - resend.com → Domains → Add domain (javaslat: `mail.<domain>` aldomain) → a megadott **SPF, DKIM**
>   rekordok felvétele a DNS-be, plusz egy **DMARC** rekord (`_dmarc`, kezdésnek `v=DMARC1; p=none; rua=mailto:<te címed>`).
>   Ha „Verified”: API Keys → új kulcs (Sending access, csak erre a domainre).
>
> **3. Cloudflare Turnstile** (kötelező: élesben kulcs nélkül a várólista **elutasít**, így nem nyílik spam-kapu)
> - dash.cloudflare.com → Turnstile → Add site: a domained, mód: *Managed* → Site key + Secret key.
>
> **4. Upstash Redis** (rate limit; nélküle csak példányonkénti memória-korlát van, ami serverlessen gyenge)
> - upstash.com → Redis → Create database, régió **eu-central-1 (Frankfurt)** → REST URL + REST token.
>
> **5. PostHog EU** (nem kötelező; hozzájárulás nélkül úgysem tölt be)
> - eu.posthog.com → új projekt → Project API key.
>
> **6. Vercel Pro projekt** (kereskedelmi használathoz a Pro kötelező)
> - vercel.com → Add New → Project → a GitHub-repó importálása; Framework: Next.js (a `vercel.json` a `fra1`
>   régiót már rögzíti). Build parancs marad: `pnpm build`.
> - Settings → Environment Variables, **Production** környezetbe:
>
>   | Változó | Érték |
>   |---|---|
>   | `NEXT_PUBLIC_SITE_URL` | `https://<domain>` (a megerősítő levél linkje ebből készül) |
>   | `APP_ENV` | `production` |
>   | `LAUNCH_MODE` | `waitlist` |
>   | `ALLOW_DEV_IMAGES` | **döntés kell** (lásd lent) |
>   | `DATABASE_URL` | a pooler címe (6543) |
>   | `DIRECT_DATABASE_URL` | a közvetlen cím (5432) |
>   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API |
>   | `RESEND_API_KEY` | a 2. lépésből |
>   | `EMAIL_FROM` | pl. `JóVétel <hello@mail.<domain>>` (a hitelesített domainről) |
>   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | a 3. lépésből |
>   | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | a 4. lépésből |
>   | `IP_HASH_SALT` | hosszú véletlen szöveg (pl. `openssl rand -base64 32`); később ne változtasd |
>   | `NEXT_PUBLIC_POSTHOG_KEY` (opcionális) | az 5. lépésből; `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com` |
>
> - Settings → Domains → a domain hozzáadása, a kiírt DNS-rekord (A / CNAME) beállítása a domain-szolgáltatónál.
> - Deploy. Ellenőrzés: `https://<domain>/api/health` → 200; iratkozz fel a saját címeddel, és kattints a levélben.
>
> **Döntés: `ALLOW_DEV_IMAGES`.** A landing képei most mind a Pinterest-moodboardból valók (`moodboard-dev-only`).
> `ALLOW_DEV_IMAGES` nélkül a production build **szándékosan leáll** (7. vasszabály), és kiírja a 42 cserélendő
> képhelyet (`pnpm check:assets`). Két út: (a) saját / AI-generált / licencelt képek a landing képhelyeire
> (OPEN_QUESTIONS #10), vagy (b) tudatosan `ALLOW_DEV_IMAGES=true`, a képjogi kockázatot te vállalod.
>
> **Élesítés előtt kitöltendő:** a jogi oldalakon 18 `[KITÖLTENDŐ]` mező (cégadatok, OPEN_QUESTIONS #2), és az
> ügyvédi átnézés (a szövegek tervezetek). Amíg ez nincs meg, javaslom, hogy a domaint ne hirdesd.

## Indulás (2026-09-22)

**Forrásokat átolvastam:** `CLAUDE.md`, `START_PROMPT.md`, a `docs/specs/*` mind az öt fájlja,
`LAUNCH_CHECKLIST.md`, `KONCEPCIO.md`, `assets.manifest.json` (38 kép, 42 képhely).
A feltöltött `YourShop – App design.html` a régi mockup: a `KONCEPCIO.md` szerint a moodboard győz
(nincs AI MATCH %, nincs sötétkék paletta, nincs szikra-ikon), ezért csak háttérként néztem meg.
A két RAR (Egyéb, Szépségápolás) a moodboard eredeti JPG-i; a WebP-változatuk már a
`public/brand/moodboard/`-ban van, ezért a JPG-ket nem teszem a repóba.

**Környezet, amiben dolgozom (felhős munkamenet):**
- Node 22, pnpm 10, PostgreSQL 16 (helyi szerver), Chromium a Playwrighthoz.
- **Docker-képek letöltése itt nem engedélyezett**, ezért a `supabase start` (Docker) nem fut.
  Helyette saját, Docker nélküli helyi stacket építek, ami a Supabase CLI portjait és demó
  kulcsait utánozza: Postgres 16 (54322), GoTrue = Supabase Auth bináris (a GitHub-kiadásból),
  egy kis átjáró a `/auth/v1` útvonalhoz (54321) és Mailpit levélfogó (54324).
  A tulajdonos gépén ugyanez a Supabase CLI-vel is megy (`supabase start`), a kapcsolati adatok
  azonosak. Részletek: `README.md` → Helyi fejlesztés.

**Rögzített verziók (pontos pin):** Next.js 16.3.6 (a legfrissebb stabil 16.x, ≥ 16.3.3) ·
React 19.3.0 · TypeScript 6.0.3 (a 7.x-et a typescript-eslint még nem támogatja) ·
Tailwind 4.3.3 · Playwright 1.56.1 (a gépen lévő Chromium-buildhez illeszkedik).

## Fázisok

| Fázis | Tartalom | Állapot | Git tag | Mért számok |
|---|---|---|---|---|
| F0 | Projekt-alap és design rendszer | ✅ | `fazis-00` (c34eb0b) | 61 unit teszt · build zöld · ő/ű: 1 font/mondat |
| F1 | Adatbázis, seed, névnaptár | ✅ | `fazis-01` (0583ac7) | 41 DB-teszt · névkeresés p95 20,7 ms / 50 000 termék |
| F2 | Landing, várólista, jogi oldalak, hozzájárulás | ✅ | `fazis-02` (9c69ba8) | Lighthouse mobil 96/100/100/100 (h2) · 90/100/100/100 (h1) · 21 e2e |
| F3 | Feed-import és napi árgyűjtő | ⏳ | | |
| F4 | Keresés, kategóriák, útmutatók | ⏳ | | |
| F5 | Termékoldal, teljes költség, ártörténet, „Valódi akció?” | ⏳ | | |
| F6 | Követett kattintás, jelölés, konverziók | ⏳ | | |
| F7 | Belépés, onboarding, beállítások | ⏳ | | |
| F8 | App-keret, listák, megosztás, foglalás, árfigyelő | ⏳ | | |
| F9 | Szeretteim, alkalmak, értesítési motor | ⏳ | | |
| F10 | Ajándék-varázsló és AI réteg | ⏳ | | |
| F11 | „Neked most” és Szépségpolc | ⏳ | | |
| F12 | Admin, SEO, analitika | ⏳ | | |
| F13 | Indulás előtti átvizsgálás | ⏳ | | |

Jelölés: ⏳ vár · 🔨 folyamatban · ✅ kész · ⚠️ kész, eltéréssel · ⛔ elakadt (a tulajdonos döntése kell)

## Fázisnapló

<!-- Fázisonként: terv (5–10 sor) · mi készült el · mért számok · eltérés a spectől és miért · nyitott kérdések -->

### F0 — Projekt-alap és design rendszer

**Terv:**
1. Next.js 16.3.6 a repo gyökerében (`/app` + `/src`), TypeScript strict, pnpm, pontos verziók.
2. Eszközlánc: ESLint (flat config, `eslint-config-next`) saját szabályokkal (tilos a literál hex a
   komponensekben, tilos a `dangerouslySetInnerHTML`, tilos a képfájlra hivatkozás), Prettier,
   Vitest, Playwright, az összes `CLAUDE.md` 6. pont szerinti pnpm script, `.env.example`, CI.
3. Design tokenek CSS változóként (világos + sötét, `prefers-color-scheme` és `data-theme`),
   Tailwind v4 `@theme` a tokenekre kötve, tipográfiai skála utility-ként; betűk `next/font`-tal,
   `latin` + `latin-ext`.
4. Aláíró elemek (`LightLeak`, `LeafShadow`, `RayIcon`, szóvédjegy, J monogram), favicon, app-ikon.
5. Alap komponensek (Radix-primitívekre, shadcn-stílusban) + `PriceBlock`, `VerdictBadge`,
   `WhyTag`, `Disclosure`, `AiLabel`.
6. Képhely-rendszer (`getSlotImage`, `getSlotImages`, `assertLicensedForProduction`, típusos
   `SlotId`), `pnpm check:assets`, a build a 7. vasszabály szerint áll le.
7. Formázók (`formatHuf`, `formatDate`, `formatRelative`, `slugify`) tesztekkel; `/styleguide`.
8. Mérés: képernyőképek 390/1440 × világos/sötét, ő/ű-próba mindkét betűtípussal.

**Kockázat:** a Google Fonts letöltése build közben hálózatfüggő; ha a proxy tiltaná, helyi
fontfájl kellene (`next/font/local`). A shadcn CLI regisztere lehet, hogy nem érhető el, ezért a
komponenseket shadcn-mintára kézzel írom (Radix + cva + tailwind-merge), `components.json`-nal.

**Kész (2026-09-22):**
- Next.js 16.3.6 (App Router, Turbopack), TypeScript 6.0.3 strict (`noUncheckedIndexedAccess` is), pnpm, pontos pinek.
- Eszközlánc: ESLint flat config (`eslint-config-next` + saját szabályok), Prettier, Vitest (`unit` és `db`
  projekt), Playwright 1.56.1, GitHub Actions CI (lint, typecheck, test, check:assets, build, audit), Dependabot.
- Tokenek: `src/styles/tokens.css` (világos/sötét, `data-theme` elemszinten is), Tailwind v4 `@theme` a tokenekre;
  az alap Tailwind-paletta ki van kapcsolva, így komponensben csak tokenszín írható.
- Aláíró elemek: szóvédjegy és J monogram a Bodoni Moda körvonalaiból (generátor: `scripts/brand/`),
  `RayIcon`, `LightLeak`, `LeafShadow`; favicon (témakövető SVG), apple-icon, PWA-ikonok.
- 22 alap + 5 domain komponens; képhely-rendszer; formázók; `/styleguide`; modul-README-k.

**Mért számok:**
- `pnpm verify` zöld: lint 0 hiba, typecheck 0 hiba, **61 unit teszt** (formázók, képhelyek, paletta ↔ tokens.css,
  WCAG-kontraszt mindkét módban, szabály-szkenner a teljes kódon, styleguide 404 production-ben).
- `pnpm build` zöld `ALLOW_DEV_IMAGES=true` mellett; **flag nélkül a build 1-es kóddal leáll** és listázza
  mind a 42 fejlesztési képhelyet (7. vasszabály).
- ő/ű-próba: e2e a Chrome DevTools Protocollal (`CSS.getPlatformFontsForNode`): a „Tűzőgép, őszi fűszál: ŐŰ őű.”
  mondatot álló és dőlt Bodoni Moda-ban, illetve Manrope-ban is **pontosan 1 betűtípus** rajzolja → nincs fallback.
- `formatHuf(24990) === "24\u00A0990\u00A0Ft"` (teszt).
- Kontraszt (mért): ink/paper 14,16 · muted/paper 5,85 · amber-deep/paper 4,59 · fehér/amber-deep 5,15 ·
  deal 5,08 · usual 5,36 · pricier 5,19; sötétben mind ≥ 7,0 (kivéve ink-subtle 4,87).
- Képernyőképek: `/styleguide` 390 és 1440 px, világos és sötét — megnézve. Javítva utána: a `RayIcon` jobban
  kitölti a 24-es rácsot; a 48 óránál régebbi ár külön sorba került; a lépésjelző nyelvtana („az 5-ből”).

**Eltérés a spectől és miért:**
- A `next/font` CSS-változói `--font-bodoni` / `--font-manrope` (nem `--font-display` / `--font-sans`), mert a
  Tailwind-token azonos néven önmagára hivatkozna. A `DESIGN_SYSTEM.md` 3. pontja frissítve.
- Új tokenek: `--on-accent` (a kiemelt gomb szövege; sötétben sötét, mert a fehér 1,9 : 1 lenne), `--on-ink`,
  `--overlay`. A `DESIGN_SYSTEM.md` 2. pontja frissítve.
- `pnpm test` csak a unit teszteket futtatja (gyors, infrastruktúra nélkül — ez megy a `verify`-ba); az
  adatbázis-tesztek külön: `pnpm test:db` (futó helyi DB kell), a CI mindkettőt futtatja.
- Az `AiLabel` szövege a `CLAUDE.md` 10. pontja szerinti („…mindig az adatbázisból mutatjuk”), mert az a
  precedenciában a `DESIGN_SYSTEM.md` előtt áll.
- A `next dev` alapból hozzáírna egy blokkot a `CLAUDE.md`-hez; `agentRules: false`-szal kikapcsoltam.
- A shadcn CLI helyett a komponensek kézzel, shadcn-mintára készültek (Radix + cva + tailwind-merge), a
  `components.json` megvan a későbbi shadcn-bővítéshez.

**Nyitott kérdés:** nincs új.

### F1 — Adatbázis, seed, névnaptár

**Terv:**
1. Docker nélküli helyi stack (`pnpm local:up`): Postgres 16 az 54322-es porton, GoTrue (Supabase Auth
   bináris, pinelt verzió) + kis átjáró a `/auth/v1` útvonalhoz (54321), Mailpit (54324). Ugyanazok a
   portok és demó kulcsok, mint a Supabase CLI-nél, így a tulajdonos gépén a `supabase start` is jó.
2. Kézzel írt SQL-migrációk fel/le párban (`src/lib/db/migrations`), saját futtatóval (`pnpm db:migrate`,
   `db:rollback`); a Drizzle séma TS-ben tükrözi, egy teszt ellenőrzi az eltérést (drift).
3. Kiterjesztések az `extensions` sémában (Supabase-kompatibilis), `hu_unaccent`, `f_unaccent`, minden tábla a
   `DATA_MODEL.md` szerint, `price_daily` havi partíciókkal, RLS minden felhasználói táblán.
4. `db` / `dbAdmin` kliens, lekérdező réteg váza `userId` első paraméterrel.
5. Névnaptár: MEK (OSZK) névnaptár fő-jelöléssel + a magyar Wikipedia két listája; a forrás és a mért
   egyezés a seed fejlécében.
6. Seed (`[DEMO]` kereskedők, 300 termék, 45 nap ártörténet), production-ben nem fut.
7. Mérés: migráció fel–le–fel, ékezet/szótő-keresés, 50 000 terméken p95, két felhasználó izolációja, névnapok.

**Kockázat:** a magyar Snowball-szótövező ékezetmentesített szón fut (unaccent → stem), ez eltérhet a
várttól; ha a „cipők → cipő” nem megy, kiegészítő (simple + trigram) keresés kell.

**Kész (2026-09-22):**
- Helyi stack Docker nélkül (`pnpm local:up`): Postgres 16 + GoTrue v2.179.0 + Mailpit, a Supabase CLI portjaival;
  `supabase/config.toml` a Dockeres CLI-hez. README: helyi fejlesztés és a valódi Supabase bekötése.
- 7 kétirányú SQL-migráció (32 tábla, ~40 index, 19 havi `price_daily` partíció, RLS mindenütt), Drizzle séma
  drift-teszttel, `db`/`dbAdmin` kliens, `queries/user/*` (userId első paraméter, gépileg ellenőrizve).
- Névnaptár: MEK (OSZK) + magyar Wikipedia (két lista), 7810 sor / 2941 név, `scripts/db/build-namedays.ts`
  reprodukálja (SHA-256 a fájlban). `lib/occasions`: névnap-javaslat és választó.
- Seed: 33 kategória, 3 hálózat, 3 `[DEMO]` kereskedő, 300 termék, 592 ajánlat, 24 624 ártörténet-sor, admin,
  3 útmutató-váz — 1,9 mp alatt, idempotens, production-ben nem fut.

**Mért számok (`pnpm test:db`, 41 teszt zöld; `pnpm verify` 74 unit teszt zöld):**
- Migráció: mind a 7 fel → mind vissza (0 tábla marad) → újra fel, azonos táblakészlettel; lépésenként is.
- Keresés: „parfum” → „parfüm” és „parfümök” ✓ · „cipők” → „cipő” ✓ · „szerum” ↔ „szérum” ✓ · „parfümök” ≡ „parfum” ✓.
- **Névkeresés 50 000 generált terméken: 200 lekérdezés, p50 = 10,5 ms, p95 = 20,7 ms** (cél < 50 ms), 0 üres találat.
  Az első mérés p95 = 674 ms volt (seq scan + trigram minden jelöltre); javítás: SSD tervező-beállítás,
  kétlépcsős rangsor (`ts_rank` előszűrés → `ts_rank_cd` + `word_similarity`), trigram csak visszaesésként.
- Izoláció: A nem látja/írja/törli B szerettét a lekérdező rétegen át; RLS alatt (`authenticated`) csak a saját
  sor látszik, más nevében beszúrni nem lehet; `anon` semmilyen felhasználói adatot nem lát.
- Névnapok: István aug. 20. · Katalin nov. 25. · Anna júl. 26. · László jún. 27. · Péter jún. 29. · Erzsébet nov. 19. ·
  Miklós dec. 6. · János jún. 24. · József márc. 19. · Márton nov. 11. · András nov. 30. · Luca dec. 13. · Éva dec. 24. —
  mind szerepel, és mind megjelenik a választóban; ékezet- és kisbetű-független (`eva`, `EVA`, `istvan`).

**Eltérés a spectől és miért:** a `DATA_MODEL.md` új 7. pontja sorolja fel (denormalizált keresési mezők, két
keresési konfiguráció, részleges egyediség a foglalásnál, `anon_id` a süti-hozzájárulásnál stb.).
Jánosnál a MEK fő napja jún. 26. és dec. 27., a jún. 24. „naptári” nap — ezért a teszt azt méri, hogy a nap
szerepel és a választóban megjelenik (OPEN_QUESTIONS #12).

**Nyitott kérdések:** #11 (Supabase projektek), #12 (névnap-alapértelmezés), #13 (tracking-domainek).
**Megjegyzés:** a git tagek a munkamenet proxyja miatt nem pusholhatók (csak a kijelölt branch); helyben
megvannak, és a táblázatban a commit-hash is szerepel. Pótlás bárhol: `git tag fazis-01 <hash> && git push --tags`.

### F2 — Landing, várólista, jogi oldalak, hozzájárulás

**Terv:**
1. Közös keret: fejléc (mobilon menü-lappal), lábléc a jelöléssel, 404 (`hiba.404`), metaadatok, OG-kép a
   szóvédjeggyel, `vercel.json` (fra1), CSP nonce-szal a `proxy.ts`-ben.
2. Landing a PRODUCT_SPEC 3. pontja szerint, szekciónként; minden kép képhelyről; a hero-ban lassan vándorló
   `LightLeak` és a cím sorainak lépcsőzött belépője. Mini-demók valódi komponensekkel (`LovedOneCard`,
   `ProductCard` kompakt, `PriceHistoryChart`, `ShelfItem`), „Példa” jelöléssel, hogy a minta-ár ne tűnjön valódinak.
3. `LAUNCH_MODE`: waitlist módban a „Kezdjük el” a várólista-űrlapra visz.
4. Várólista: Server Action + Zod + Turnstile + rate limit (Upstash, helyben memória) + double opt-in levél
   (React Email `WaitlistConfirm`; Resend, helyben SMTP a Mailpitbe) + `/varolista/megerosites`.
5. Jogi oldalak valódi szerkezettel, `[KITÖLTENDŐ]` cégadatokkal; `/igy-rangsorolunk` a rangsor-súlyok
   konfigurációs fájljából (ugyanazt használja majd a keresés).
6. Süti-sáv három kategóriával, naplózás a `consents` táblába; PostHog csak analitika-hozzájárulás után töltődik.
7. Mérés: e2e (feliratkozás a megerősítésig, nincs PostHog-kérés hozzájárulás előtt, a hero első képernyője),
   Lighthouse mobil a 4 kategóriában, képernyőképek.

**Kockázat:** a nonce-os CSP miatt minden oldal dinamikusan renderelődik; a landing Lighthouse-pontszámát ez
(TTFB) befolyásolhatja — mérni fogom. A Recharts nagy csomag: a landingen csak láthatóvá váláskor töltődik be.

**Kész (2026-09-23):**
- Landing a PRODUCT_SPEC 3. pontja szerint (hero, három ígéret, négy mini-demó valódi komponensekkel, AI-szekció,
  bizalom, GYIK, záró CTA), minden kép képhelyről. Hero: vándorló `LightLeak`, a cím sorainak lépcsőzött belépője.
- `LAUNCH_MODE`: waitlist módban minden „Kezdjük el” a `#varolista` űrlapra visz.
- Várólista: Server Action + Zod + mézesbödön + rate limit (5/óra IP) + Turnstile (élesben kulcs nélkül elutasít) +
  double opt-in levél (React Email `WaitlistConfirm`; Resend, helyben SMTP → Mailpit) + `/varolista/megerosites`
  (7 napos token, csak hash-ként tárolva; a megerősítéskor kerül a marketing-hozzájárulás a `consents` táblába).
- Jogi oldalak valódi szerkezettel, 18 `[KITÖLTENDŐ]` mezővel; `/igy-rangsorolunk` a `RANKING_WEIGHTS`
  konfigurációból (ugyanazt használja majd a keresés); `/rolunk`.
- Süti-sáv (szükséges / analitika / marketing), naplózás a `consents` táblába (csak hozzáfűzés); PostHog csak
  analitika-hozzájárulás után töltődik be (dinamikus import). A `jv_anon` süti is csak döntéskor jön létre.
- Fejléc (mobilon menü-lap, igény szerint töltődik), lábléc a jelöléssel, 404 (`hiba.404`), metaadatok, OG-kép
  (Bodoni-körvonalakból, futásidejű font nélkül), `vercel.json` (`fra1`), CSP nonce-szal a `proxy.ts`-ben.
- Mérőeszköz: `pnpm perf:proxy` (helyi HTTP/2 + brotli a `next start` elé) és `pnpm perf:lighthouse <url>`
  (több futás, medián).

**Mért számok (production build, `next start`, helyi stack):**
- **Lighthouse mobil, 5 futás mediánja, `/`:**
  HTTP/2 + brotli (ahogy a Vercel szolgál ki): **teljesítmény 96 · akadálymentesség 100 · bevált gyakorlatok 100 ·
  SEO 100** (LCP 2,7 s, TBT 45 ms, CLS 0). Közvetlen HTTP/1.1 `next start`: **90 · 100 · 100 · 100** (LCP 3,6 s).
  `/adatvedelem` (h2, 3 futás): 97 · 100 · 100 · 100. A `/varolista/megerosites` SEO-ja 63, mert szándékosan
  `noindex` (a többi kategória 97 · 100 · 100).
- **e2e: 21/21 zöld** a production buildön (`E2E_BASE_URL`, PostHog-próbakulccsal):
  a feliratkozás végigmegy a megerősítésig (levél a Mailpitből, a link megnyitása, „Megerősítem” → `?kesz=1`;
  a második kattintás idempotens, a hamis token `?hiba=invalid`); hozzájárulás előtt **0** PostHog-kérés és nincs
  `ph_*`/`jv_anon` süti, „Mindet elfogadom” után a PostHog betölt; „Csak a szükségesek” után sincs kérés;
  390×844-en a cím, az alcím, mindkét gomb és a kép a nézetben van, és a süti-sáv egyiket sem takarja
  (`elementFromPoint`); a landing egyik belső linkje sem vezet 404-re; 390 px-en 10 oldal közül egyik sem lóg ki
  vízszintesen; mobilmenü (Escape, fókusz-visszaadás); minden ár demókeretben, „Példa” jelöléssel.
- Unit: 100 teszt (új: CSP/PostHog-konfiguráció, `ROUTE_READY`, ártengely, demó-konzisztencia). `pnpm verify` zöld.
- Landing JS (gzip): 13 csomag, ~208 KB, ebből ~115 KB a React + Next futtatókörnyezet.
- Képernyőképek: `/`, `/adatvedelem`, `/igy-rangsorolunk`, `/varolista/megerosites`, 404 × 390/1440 × világos/sötét
  (`tests/.artifacts/screens/f2/`), átnézve. Javítva közben: a mini-demó vízszintes ötletsora kitolta a rácsot
  (538 px széles oldal 390-en → `grid-cols-1`, e2e-teszt őrzi); a radar-demóban a „10 nap múlva” mellett rögzített
  „november 25.” állt (most a mai naphoz számolt dátum); az ártengelyen „12,9e” osztás (most kerek lépésköz).

**Eltérés a spectől és miért:**
- *Még el nem készült útvonalra nem linkelünk* (`src/lib/launch.ts` → `ROUTE_READY`, teszt ellenőrzi, hogy egyezik az
  `app/` tartalmával): a hero második gombja („Ajándékötlet regisztráció nélkül” → `/ajandek`) az F10-ig
  „Nézd meg, hogyan működik” (→ `#hogyan`), az AI-chipek addig nem linkek, a Belépés gomb és a 404 „Keresés” gombja
  addig rejtve. A fázisok a saját kapcsolójukat állítják át.
- A radar-demó kártyáján nincs keresztnév (a spec példája „Anya · Katalin”): a névnap dátuma a mai naphoz számolt
  (+10 nap), és így nem állítunk hamis név–dátum párt.
- A `ToastProvider` nem a gyökér-layoutban van (a nyilvános oldalakon nincs rá szükség, 13 KB); az F8 app-kerete kapja.
- A Lighthouse-kritériumot két módon mértem: a helyi `next start` HTTP/1.1-en szolgál ki (6 kapcsolat/hoszt), ami
  a Lighthouse szimulációjában torzít; a Vercel HTTP/2-t és brotlit ad. Mindkét mérés ≥ 90.

**Nyitott kérdések:** #1 (domain), #2 (cégadatok: 18 mező), #7 (küldő domain), #10 (képek), #11 (Supabase prod).
**Következő:** F3 — feed-import és napi árgyűjtő (határidő az élesítésre: 2026. október 28.).
