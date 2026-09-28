# Haladásnapló

> A Claude Code vezeti. Ez a munka memóriája: megszakadás után innen folytatódik.
> A tulajdonos innen követi, hol tart a fejlesztés.

## Aktuális állapot
- **Jelenlegi fázis:** F6 — Követett kattintás, jelölés, konverziók (🔨)
- **Utolsó frissítés:** 2026-09-28
- **Mérföldkő / teendő a tulajdonosnak:** **2. mérföldkő: az árgyűjtő élesítése — határidő 2026. október 28.** (lent),
  és az 1. mérföldkő (a landing waitlist módban) továbbra is érvényes.

> ## 🚩 MÉRFÖLDKŐ 2 — az árgyűjtő élesítése (F3 kész) · HATÁRIDŐ: 2026. október 28.
>
> A Black Friday (november 27.) „Valódi akció” ítéletéhez 30 nap saját ártörténet kell, ezért az árgyűjtőnek
> **legkésőbb október 28-án** élesben kell futnia. Az ítélet csak a saját napi árainkból számol (6. vasszabály),
> ezt később nem lehet pótolni.
>
> **1. Előfeltétel:** az 1. mérföldkő 1. lépése (Supabase prod projekt, `pnpm db:migrate`, `app.environment` jelölő).
>
> **2. Legalább egy jóváhagyott partnerprogram, élő feeddel** (OPEN_QUESTIONS #3, #4, #14)
> - Awin: Toolbox → Create-a-Feed → a program kiválasztása, formátum CSV, tömörítés gzip → a letöltési URL.
>   A URL-ben az API-kulcs helyére írd: `{AWIN_API_TOKEN}` (a kulcs soha nem kerül az adatbázisba).
> - Küldd el nekem (vagy tedd a `tests/fixtures/feeds/<hálózat>/` mappába) egy valódi mintafájl első 20 sorát,
>   hogy az oszlopneveket ellenőrizzem.
> - Felvétel: `merchants` sor (`domain_allowlist`: a bolt domainje(i), `status = 'active'`, `is_comparison_allowed`
>   a program feltételei szerint) és `feeds` sor (`adapter`, `url`). Ezt az admin felület F12-ben kapja meg; addig
>   SQL-lel vagy nekem szólva.
>
> **3. GitHub → Settings → Secrets and variables → Actions → New repository secret:**
>
> | Secret | Érték |
> |---|---|
> | `INGEST_DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Session pooler** (5432-es port a `pooler.supabase.com` hoston; IPv4) |
> | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API (a service role kulcs csak itt és a Vercelen szerepelhet) |
> | `NEXT_PUBLIC_SITE_URL` | `https://<domain>` (a riasztó levél linkje) |
> | `RESEND_API_KEY`, `EMAIL_FROM` | mint az 1. mérföldkőben |
> | `ADMIN_ALERT_EMAIL` | ide jön a levél, ha egy feed blokkolt (60% alatti tételszám / 20% feletti hiba) vagy hibás |
> | `AWIN_API_TOKEN`, `AWIN_PUBLISHER_ID` (és a többi hálózaté, ha van) | a hálózati felületről |
> | `CRON_SECRET` | **ugyanaz** az érték, mint a Vercelen (legalább 32 véletlen karakter, pl. `openssl rand -hex 32`): ezzel írja alá az ingest a termékoldalak gyorsítótárának frissítését (F5). Nélküle az ár legfeljebb 1 órás késéssel jelenik meg |
>
> **4. Első futás kézzel:** GitHub → Actions → „Feed-import” → Run workflow. A zöld pipa és az admin felület
> (`/admin/feedek`) „Sikeres” jelvénye után a cron magától fut naponta 04:00-kor és 16:00-kor, 00:05-kor pedig
> csak az ár-statisztika (a napváltáskor frissülő „Valódi akció” ítélethez).
>
> **5. (Opcionális) [Futtatás most] az adminban:** Vercel env: `INGEST_DISPATCH_TOKEN` (GitHub finomhangolt token,
> csak ehhez a repóhoz, *Actions: read and write*), `INGEST_DISPATCH_REPO` (`tulajdonos/repo`) — OPEN_QUESTIONS #17.
>
> **6. Nagy feed esetén** (50 MB fölötti tömörített fájl): Supabase → Storage → Settings → Upload file size limit
> emelése (OPEN_QUESTIONS #16). Ha kimarad, az árgyűjtés akkor is fut, csak a nyers pillanatkép nem mentődik.

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
| F3 | Feed-import és napi árgyűjtő | ✅ | `fazis-03` (acea1bd) | 50 000 sor 17,7 s · újrafuttatás 0 írás · 7 adapter · átnézés: 2 BLOCKER + 7 SHOULD-FIX javítva · 26 e2e |
| F4 | Keresés, kategóriák, útmutatók | ✅ | `fazis-04` (4c65804) | 50/50 top 5 · p95 159 ms / 50 000 termék · 38 e2e |
| F5 | Termékoldal, teljes költség, ártörténet, „Valódi akció?” | ✅ | `fazis-05` (80730af) | 20/20 legjobb ár (TS + SQL) · mobil LCP 1,97 s (h2, 5 futás mediánja) · Lighthouse 98/100/100/100 · 46 e2e |
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

### F3 — Feed-import és napi árgyűjtő

**Terv:**
1. `src/lib/ingestion`: `FeedAdapter` interfész; SSRF-védett letöltés (csak https, host-engedélylista, DNS-feloldás
   utáni privát-IP-tiltás a kapcsolódáskor is, átirányításonként újraellenőrizve, méret- és időkorlát, gzip).
2. Streaming parserek: CSV (`csv-parse`), XML (`saxes`); kódolás-felismerés (UTF-8 / Windows-1250 / ISO-8859-2).
3. Adapterek: `generic-csv`, `generic-xml` (Google Merchant), `awin`, `cj`, `dognet` (Heureka-XML), `admitad` (YML),
   `manual`; kulcs nélkül fixture-ökön (`tests/fixtures/feeds/<hálózat>/`): helyes sor, hibás kódolás, hiányzó mező,
   negatív ár, HTML/script és prompt-injection a leírásban.
4. Normalizálás: egész Ft, GTIN-ellenőrzőszám, márka, kiszerelés-kinyerő, kategória-leképezés (tábla → kulcsszó-szabály),
   HTML-tisztítás (`sanitize-html`, csak szöveg), URL a kereskedő engedélylistáján, szabályalapú címkék (`source=rule`).
5. Pipeline a 9 lépéssel: nyers pillanatkép (Supabase Storage / helyben `.local/`), a normalizált tételek lemezre
   (NDJSON), **minőségi kapu a publikálás előtt**, publikálás egy tranzakcióban kötegekben, `content_hash`
   → változatlan tétel nem íródik, `price_daily` csak eltérésnél ír, 2 kihagyott futás → inaktív.
6. `scripts/ingest.ts` (`--feed`, `--all`, `--fixtures`), GitHub Actions (04:00 és 16:00 Budapest, nyári/téli idő
   szerint is pontosan), riasztó e-mail blokkolt futásnál.
7. `requireAdmin()` (szerepkör + MFA `aal2`, két rétegben) és `/admin/feedek` (feedek, futások, hibaminta,
   [Futtatás most] → GitHub `workflow_dispatch`, helyben közvetlen futtatás), minden admin írás `audit_log`-ba.
8. Mérés: 50 000 soros import ideje és memóriája, újrafuttatás írásszáma (`pg_stat`), blokkolás, tisztítás, ártörténet.

**Új függőségek (indoklás):** `csv-parse` (RFC 4180 streaming: idézett sortörés, BOM, laza idézőjelek a hibás
feedekhez — saját parserrel ezek a hibák a feedekben rendszeresek), `saxes` (streaming, szabványos XML: entitások,
CDATA, névterek; a 100 MB-os XML-feed nem fér memóriába DOM-ként), `sanitize-html` (a spec nevesíti; szöveg módban a
`script`/`style` tartalmát is eldobja), `@supabase/ssr` + `@supabase/supabase-js` (a `requireAdmin()` session-kezelése;
az F7 belépés is erre épül).

**Kész (2026-09-23):**
- `src/lib/ingestion`: SSRF-védett streaming letöltés (`fetch/`), CSV/XML streaming parser kódolás-felismeréssel
  (`parse/`), normalizálók (`normalize/`: ár, GTIN, kiszerelés, szöveg, URL, kategória-szabályok, címkeszabályok),
  minőségi kapu és prompt-injection jelzés (`quality/`), hét adapter (`adapters/`), pipeline (`pipeline/`: nyers
  pillanatkép, lemezes átmeneti tár, kötegelt publikálás egy tranzakcióban).
- Fixture-ök mind a hat hálózati formátumra + kézi feed (`tests/fixtures/feeds/`, generátorral), szándékosan hibás
  sorokkal: hibás kódolás, hiányzó mező, negatív/nulla ár, euró, HTML + `<script>`, prompt-injection, idegen domain,
  rossz GTIN.
- `scripts/ingest.ts` (`--feed`, `--all`, `--fixtures`), riasztó levél (`emails/FeedAlert.tsx`) blokkolt / hibás futásnál.
- `.github/workflows/ingest.yml`: 04:00 és 16:00 Budapest nyári és téli időszámítás szerint (négy UTC-bejegyzés,
  a kiváltó bejegyzés dönt), `concurrency: ingest`, kézi indítás uuid-ellenőrzéssel.
- `requireAdmin()` (Supabase session + `profiles.role = 'admin'` + MFA `aal2`; nem admin → 404, MFA nélkül →
  `/admin/mfa`), az adatréteg a szerepkört a lekérdezésben újra ellenőrzi; `/admin/feedek` (lista) és
  `/admin/feedek/[id]` (futások, hibaminta szövegként, leképezetlen kategóriák, [Futtatás most] → GitHub
  `workflow_dispatch`, helyben közvetlen futás), minden admin írás `audit_log`-ba.

**Mért számok:**
- **50 000 soros import: 17,7 s** (a határ 10 perc); változatlan újrafuttatás 7,8 s, **0 változott tétel**;
  minden ár megváltozik: 14,8 s (csak ajánlat + ártörténet íródik). Heap-csúcs 106 MB, RSS-csúcs 232 MB (a teszt-
  folyamattal együtt) — a memória nem nő a sorokkal arányosan (`pnpm test:db:perf`, `tests/.artifacts/perf/`).
- **Változatlan feed újrafuttatása: 0 írás** a katalógus-táblákban (products, offers, source_items, price_daily,
  product_tags, brands) — soronkénti írásszámláló triggerrel mérve (`tests/db/ingest.test.ts`).
- **Hibás sorok nem állítják meg a futást:** Awin-fixture 26 sor → 22 érvényes, 4 elutasított (encoding,
  invalid_price, missing_field, url_not_allowed), a futás `success`.
- **60% alatti tételszám → `blocked`:** 10 → 5 tétel: `blocked`, a katalógusban 0 írás, `last_item_count` marad 10,
  a riasztó levél kimegy (a script kimenetéből ellenőrizve). 20% feletti elutasítás (2/6) → `blocked`.
- **HTML és script a DB-ben tisztított szöveg:** 0 termék és 0 `source_items.payload` illeszkedik
  `<tag|alert(|onerror|javascript:` mintára; a HTML-es leírás: „Könnyű gél állag.\nKattints”.
- **`price_daily` két eltérő árú futás után helyes:** 10 000 → 9 000 → 9 500 Ft ugyanazon a napon: min 9 000,
  last 9 500; másnap új sor 9 500/9 500; `last_price_change_at` a tényleges árváltozás ideje.
- 2 kihagyott futás után inaktív, utána 0 írás, visszatéréskor újra aktív; ismétlődő SKU elutasítva.
- Tesztek (az átnézési javítások után): unit 232 (+132 az F3-ban), DB 8 fájl / 55 (+14) + 1 teljesítményteszt
  (`PERF=1`), e2e 26 (+5 admin, valódi GoTrue-sessionnel és TOTP-MFA-val, lejárt token frissítésével). `pnpm verify` zöld.
- Képernyőképek: `/admin/feedek`, `/admin/feedek/[id]` × 390/1440 × világos/sötét (`tests/.artifacts/screens/f3/`),
  átnézve; javítva: 390 px-en a táblázat `sr-only` eleme kitolta az oldalt (pozicionált keret, e2e őrzi).

**Eltérés a spectől és miért:** DATA_MODEL 8. pont és ARCHITECTURE 3. pont „Megvalósítás (F3)” — röviden:
az „ár ellenőrizve” a feed `last_success_at`-jéből jön (0 írás az újrafuttatáskor); a közös GTIN-ű termék szövegét a
létrehozó kereskedő írja; advisory lock helyett GitHub concurrency + részleges egyedi index a `running` futásra; az
ingest a pooler session módját használja (`INGEST_DATABASE_URL`). A PostgREST csak olvas (0008 migráció, lent). A címkeszótár a profil szótára (`SKIN_CONCERNS`, `AVOID_INGREDIENTS`).
Az admin MFA-regisztrációs felülete a belépéssel együtt készül (F7); addig `/admin/mfa` tájékoztat.

**Független vasszabály-átnézés (alügynök, 2026-09-23):** 2 BLOCKER, 7 SHOULD-FIX, 8 NIT — mind javítva, teszttel ahol
logika változott. Ellenőrizve és rendben: árak csak `formatHuf`-on át és „Példa” keretben, nincs webshop-link jelölés
nélkül, a rangsor nem nézi a jutalékot, minden `queries/user/*` függvény `userId`-vel szűr, admin kétrétegű, képek csak
képhelyről, nincs literál hex, feedszöveg tisztítva és csak szövegként, nincs URL-paraméteres átirányítás, a régi ár nem
számít az ítéletbe, a letöltés SSRF-védett, titok nem kerül naplóba, PostHog csak hozzájárulás után.

| # | Súly | Megállapítás | Javítás |
|---|---|---|---|
| 1 | BLOCKER | bármely belépett felhasználó adminná tehette magát (`profiles.role` PATCH a PostgREST-en) | 0008: a böngészős szerepkörök csak olvashatnak + szerepkör-védő trigger; DB-teszt |
| 2 | BLOCKER | letöltés közben megszakadó CSV-feed az egész ingest folyamatot leállította | `pipeline()` + `destroy`; a hiba előbb reprodukálva (>64 KB után elakadt), unit teszt |
| 3 | SHOULD | a foglalást a PostgREST-en át Turnstile és rate limit nélkül is be lehetett szúrni | 0008 (írásjog visszavonva); DB-teszt |
| 4 | SHOULD | preview-n a [Futtatás most] webes függvényben futtatta volna az importot | csak `development`-ben fut folyamaton belül, egyébként `workflow_dispatch` |
| 5 | SHOULD | „egy feedre egy futás” ellenőrzés versenyhelyzettel | `feed_runs_one_running_idx` + `on conflict do nothing`; DB-teszt |
| 6 | SHOULD | titok-helyőrző bármely hálózat változójával, bármely engedélyezett hosztra | csak a saját hálózat előtagja, csak a hálózat feed-hosztjára; unit teszt |
| 7 | SHOULD | a moodboard-képek közvetlen URL-en élesben is elérhetők | build-idejű átírás + `images.localPatterns`; unit teszt, DESIGN_SYSTEM 8 |
| 8 | SHOULD | a Supabase-session nem frissült (Server Component nem ír sütit) | frissítés a `proxy.ts`-ben; e2e lejárt tokennel |
| 9 | SHOULD | egy feed hibája leállította a `--all` futást; a sikeres jelölés a tranzakción kívül | feedenkénti `try/catch`; jelölés a publikálás tranzakciójában |
| 10 | NIT | a nyers mentés hibája kezeletlen elutasítás lehetett | korai `.catch`, a forrás hibája mindkét ágat lezárja |
| 11 | NIT | „5 000 Ft alatt” és a grafikon tengelye nem `formatHuf`-fal | `formatHuf` / `formatHufAxis` a `lib/pricing`-ben; unit teszt |
| 12 | NIT | a süti-hozzájárulás írása az app rétegben, `userId` nélkül | `queries/anon/cookieConsents.ts`, session esetén `userId`-vel |
| 13 | NIT | a `dbAdmin` határ csak névkonvenció | ESLint: a felület nem importálhat DB-klienst/sémát; `src/lib`-ben a `dbAdmin` csak az ingest, értesítés, db modulból |
| 14 | NIT | hiányzó privát IPv6-tartományok | `fec0::/10`, `2002::/16`, Teredo, `100::/64`; unit teszt |
| 15 | NIT | a proxy matcher előtagjai perjel nélkül | `api/`, `go/`, `icons/`, `brand/` |
| 16 | NIT | a workflow lépései tagre pinelve, 45 perces időkorlát | commit-SHA pinelés (ingest + CI), 120 perc |
| 17 | NIT | a fixture-őr csak a DB-jelölőt nézte; felülírta a hálózat `tracking_domains`-át | `APP_ENV` is; unió |

**Nyitott kérdések:** #3, #4, #14 (feedek és oszlopnevek), #15 (Dognet), #16 (Storage-korlát), #17 (dispatch token).

### F4 — Keresés, kategóriák, útmutatók

**Terv:**
1. Árazás a `lib/pricing`-ben: `totalCost()` (7.4) és `verdict()` (7.3) egész számos küszöbökkel, határesetes unit
   tesztekkel. Az SQL-párjuk a 0009 migrációban: származtatott `offer_stats` / `product_stats` tábla (teljes ár, legjobb
   ajánlat, ítélet, valódi kedvezmény, címkék) és `refresh_catalog_stats()`, csak eltérésnél ír; paritásteszt a TS és
   az SQL között. Minden ingest végén és a seed után fut.
2. `SearchProvider` + `PostgresSearch`: FTS (ÉS) → kevés találatnál lazított VAGY + trigram (márka + név) visszaesés;
   szűrők (teljes ár, márka, kategória, bolt, készleten, valódi akció, bőrtípus, mentes), diszjunktív facetek
   számokkal egy lekérdezésben, 4 rendezés, lapozás; a súlyok a `weights.ts`-ből, jutalék sehol.
3. URL-állapot Zoddal (`parseSearchState` ↔ `toSearchParams`), `GET /api/search` rate limittel.
4. `/kereses`: mobilon alsó lapos szűrő (`Sheet`), desktopon szűrőoszlop, aktív szűrő-chipek, rendezés, lapozás,
   üres állapot a spec szerint (a legszűkebb szűrő lazítása); `ProductCard` mindhárom változata.
5. `/kategoria` áttekintő és `/kategoria/[...path]` képhelyes fejléccel, morzsamenüvel, alkategória-chipekkel.
6. `/utmutatok`, `/utmutatok/[slug]` (editorial lista; indexelhető csak ≥ 5 tétel és ≥ 150 szó mellett) +
   `/admin/utmutatok` szerkesztő (`requireAdmin`, `audit_log`).
7. Mérés: 50 lekérdezés (`tests/fixtures/search-queries.json`) top 5 ≥ 80%; p95 < 300 ms 50 000 terméken
   szűrőkkel és facetekkel együtt. Kockázat: a facetek a 40 000 termékes főkategórián — ezért előaggregált stats-tábla.

**Kész (2026-09-27):**
- `lib/pricing`: `totalCost()` és `verdict()` / `verdictFromStats()` egész számos küszöbökkel; az SQL-párjuk a 0009
  migrációban (`offer_stats`, `product_stats`, `refresh_catalog_stats()`), minden ingest és a seed végén frissül.
- `lib/search`: `SearchProvider` (`search`, `count`, `suggestRelaxation`) + `PostgresSearch`; URL-állapot Zoddal
  (`q`, `kategoria`, `marka`, `bolt`, `ar_min`, `ar_max`, `keszleten`, `akcio`, `bor`, `mentes`, `rendezes`, `oldal`);
  „Miért neked” címkék (7.1) determinisztikusan; `GET /api/search` rate limittel (120/perc/IP-hash).
- `/kereses`: mobilon alsó lapos szűrő, desktopon szűrőoszlop, aktív szűrő-chipek, 4 rendezés, lapozás, üres állapot a
  legszűkebb szűrő lazításával; minden szűrő link (JavaScript nélkül is működik).
- `/kategoria` áttekintő és `/kategoria/[...path]` képhelyes fejléccel, morzsamenüvel, alkategória-chipekkel.
- `/utmutatok`, `/utmutatok/[slug]` + `/admin/utmutatok` szerkesztő (létrehozás, szöveg, borító-képhely, tételek
  keresésből, megjegyzés, sorrend, közzététel, törlés), minden írás `audit_log`-ba; indexelhetőség automatikusan.
- Fejléc: kereső ikon; „Ajándékötletek” → `/utmutatok` (F10-ig). Lábléc: Kategóriák · Útmutatók · Keresés.

**Mért számok (50 000 generált + 25 egyedi termék, `tests/db/search-quality.test.ts`, `tests/.artifacts/perf/search-50k.json`):**
- **50 tesztlekérdezés (elírással, ékezet nélkül): 50/50 = 100% a várt termék a top 5-ben** (határ: 80%).
- **p95 159 ms** (határ: 300 ms), p50 20 ms, 282 keresés találatokkal és facetekkel együtt. Forgatókönyvenként p95:
  szöveg 111 ms · szöveg + szűrők 119 ms · kategória-böngészés 156 ms · teljes katalógus 177 ms · csak bolt-szűrő a
  teljes katalógusra 311 ms (ez a leglassabb eset; a facetek miatt; ha élesben számít, a facetek gyorsítótárazhatók).
- A javítás menete (mérve): első változat p95 ~520 ms → a termékek széles sorainak olvasása és a kettős
  materializálás megszüntetése, a join csak a kiválasztott 24 sorra → 196 ms → csak az aktív szűrők a feltételben
  (rossz sorbecslés és egyesével olvasó terv helyett) → 159 ms.
- Paritás: 310 ajánlaton (300 véletlen + 10 határeset) az SQL és a TS ítélete, teljes ára, ablaka és kedvezménye egyezik.
- Tesztek: unit 262 (+39), DB 11 fájl / 72 + 1 kihagyott (+17; köztük a keresés szemantikája: `tests/db/search-provider.test.ts`), e2e 38 (+12: keresés, alsó lapos szűrő, rendezés, akció- és
  ársáv-szűrő, üres állapot + lazítás, lapozás, hibás paraméterek, desktop-oszlop és noindex, API, kategóriák,
  390 px túllógás, útmutató-szerkesztő végig a nyilvános oldalig + audit_log, jogosultság). `pnpm verify` zöld.
- Képernyőképek: `/kereses` (szűrővel, üres állapottal), `/kategoria`, `/kategoria/…/arcapolas`, `/utmutatok`,
  `/utmutatok/[slug]`, `/admin/utmutatok`, `/admin/utmutatok/[id]` × 390/1440 × világos/sötét
  (`tests/.artifacts/screens/f4/`), átnézve; javítva: 390 px-en a natív rendezés-választó kitolta az oldalt
  (484 px) → korlátozott szélesség, e2e őrzi; az ártartomány-űrlap a keskeny oszlopban tört → két oszlop.

**Eltérés a spectől és miért:** PRODUCT_SPEC 5.2 és 9. „Megvalósítás (F4)”, ARCHITECTURE 2. pont, DATA_MODEL 9. pont —
röviden: csak friss (≤ 48 órás) árú termék listázódik; kevés találatnál lazított egyezés jelzéssel; a bolt-facet az
ár-/készlet-/akciószűrőt nem ajánlatonként alkalmazza (sebesség); „Legnagyobb valódi kedvezmény” = a 30 napos
mediánhoz mért %, csak valódi akciónál; az útmutató indexelhetősége automatikus; a fejlécbe kereső ikon került.
A keresésben csak `is_comparison_allowed = true` kereskedő ajánlata jelenik meg (az alapérték `false`: élesítéskor a
program feltételei szerint be kell kapcsolni — 2. mérföldkő, 2. lépés). A termékkártyák a `/termek/[slug]`-ra
mutatnak, ami az F5-ben készül el (addig 404); a kártya ezért nem tölt elő.

**Nyitott kérdések:** #3, #4 (feedek: valódi adat nélkül a keresés a [DEMO] katalóguson mérve).
**Következő:** F5 — termékoldal, teljes költség, ártörténet, „Valódi akció?”.

### F5 — Termékoldal, teljes költség, ártörténet, „Valódi akció?”

**Terv:**
1. `lib/pricing`: `bestOffer()` (a `product_stats` SQL-szabályának TS-párja: friss, listázható, készleten lévő előbb,
   legalacsonyabb teljes ár, bolt-minőség) + 20 kézi teszteset egy közös fixture-ben, amit a TS unit teszt és az SQL
   DB-teszt is lefuttat; a `verdict()` hiányzó ágai (készlethiány, hiányzó napok) tesztekkel.
2. Adatréteg: termék, ajánlatok a kereskedő szállítási szabályaival és frissességgel, 90 napos ártörténet, kapcsolódó
   termékek; adat-szintű gyorsítótár 1 órára, célzott tag-érvénytelenítéssel az ingest után (`/api/revalidate`, HMAC +
   időbélyeg). Oldal-szintű ISR helyett, mert a nonce-os CSP dinamikus renderelést kíván.
3. `/termek/[slug]` (PRODUCT_SPEC 5.3): galéria, legjobb ajánlat blokk (teljes ár nagyban, bontás, bolt, szállítási idő,
   frissesség, [Megnézem a boltban] + `Disclosure`), `VerdictBadge` magyarázattal, `PriceHistoryChart` (30/90 nap,
   boltonként, min30), `OfferRow` lista teljes ár szerint (48 óránál régebbi: „nem friss”, a végén), „Miért neked”,
   leírás, jellemzők, kapcsolódó termékek, JSON-LD csak valós mezőkből, indexelési szabály.
4. Műveletek (Szólj, ha olcsóbb lesz −5/−10/−20%/egyéni · Listára · Polcra teszem): vendégnél belépésre visznek
   `returnTo` + `pendingAction` paraméterrel (belépés előtt, waitlist módban a várólistára).
5. Mérés: 20 kézi eset, mobil LCP (Lighthouse), e2e: minden „Ft” szöveg `PriceBlock`-ban (termék-, kereső-, kategória-
   és útmutatóoldalon), képernyőképek. Kockázat: a `/go` az F6-ban készül; addig a bolt-gomb célja még nem él.

**Kész (2026-09-28):**
- `lib/pricing`: `bestOffer()` / `rankOffers()` (friss és listázható ajánlatok; készleten lévő előbb; legalacsonyabb
  teljes ár; bolt-minőség; azonosító) — a `product_stats` SQL-szabályának TS-párja; a `verdict()` hiányzó napos ága tesztelve.
- Adatréteg: `loadProductPage()` / `getProductPage()` (termék, listázható ajánlatok szállítási szabályokkal és
  „ár ellenőrizve” idővel, 90 napos ártörténet, 4 kapcsolódó termék), `unstable_cache` 1 órára, `catalog` és
  `product:{slug}` tag-gel.
- Célzott érvénytelenítés: `POST /api/revalidate` (HMAC-SHA256 + időbélyeg, ±300 s, Zod-dal ellenőrzött tag-lista), az
  ingest a statisztika-frissítés után a megváltozott termékeket küldi; új `--stats-only` mód és 00:05-ös napi futás
  (az éjfél utáni ítélet-váltás miatt).
- `/termek/[slug]`: morzsamenü, feedkép (vagy semleges helykitöltő), márka, név, kiszerelés, „Miért neked”, legjobb
  ajánlat blokk (teljes ár nagyban, bontás, bolt, szállítási idő, frissesség, [Megnézem a boltban] + `Disclosure`,
  `VerdictBadge` magyarázattal), műveletek, ártörténet (30/90 nap, boltonként, 30 napos minimum), összes ajánlat
  (`OfferRow`, teljes ár szerint, a nem friss a végén), leírás, jellemzők, hasonló termékek; JSON-LD csak valós
  mezőkből (React-gyerekként, `<`/`>`/`&` escape-pel); `noindex`, ha nincs friss ajánlat vagy érdemi tartalom; 404.
- Műveletek: „Szólj, ha olcsóbb lesz” (−5/−10/−20%/egyéni célár a teljes árból), „Listára”, „Polcra teszem”;
  vendégnél `loginHref(returnTo, pendingAction)` → élő módban `/belepes?…`, waitlist módban a várólista.
- Keresés: az ársáv-címkék („5 000 Ft alatt”) is `PriceBlock`-os `Price`-szal (a „Ft” szabály miatt).
- Teljesítmény: a célár-választó (Radix Dialog) és a süti-sáv kapcsolói (Radix Switch) csak igény szerint töltődnek
  le (a süti-sáv minden oldalt érint); a `Disclosure` „Így rangsorolunk” linkje aláhúzott (akadálymentesség 96 → 100).

**Mért számok (production build, `next start`, helyi stack):**
- **A legjobb teljes ár 20/20 kézi tesztesetben helyes** a TS-ben (`tests/unit/best-offer.test.ts`) és az SQL-ben
  (`tests/db/best-offer.test.ts`) is, ugyanabból a fixture-ből (`tests/fixtures/best-offer-cases.json`: küszöbön lévő
  ár, 1 Ft-tal alatta, vám, készlethiány, 48/49 órás ár, szüneteltetett és összehasonlítást nem engedő bolt, inaktív
  ajánlat, döntetlen minőség és azonosító szerint).
- **Mobil LCP, Lighthouse 5 futás mediánja, `/termek/[slug]`, HTTP/2 + brotli: 1 972 ms** (határ: 2 500 ms;
  futások: 1 972 · 2 431 · 2 417 · 1 965 · 1 963); **teljesítmény 98 · akadálymentesség 100 · bevált gyakorlatok 100 ·
  SEO 100**, TBT 121 ms, CLS 0. Közvetlen HTTP/1.1: 92 · 100 · 100 · 100, LCP 3 338 ms (az F2-ben leírt okból
  pesszimista: HTTP/1.1-en 6 párhuzamos kapcsolat, tömörítés nélkül). A lazy betöltés előtt ugyanez h2-n 87 pont,
  LCP 2 421 ms, TBT 437 ms volt. A landing (h2, 3 futás) 95 · 100 · 100 · 100, LCP 2,74 s (az F2-vel egyező).
  Az LCP-elem a seed termékeinél a H1 (nincs feedkép); valódi feedképnél a kép `priority`-vel töltődik, de a
  kereskedő CDN-jétől függ.
- **„Ft” csak `PriceBlock`-ban:** e2e bejárja a landingot, 3 keresést (ársávval is), a kategória-, útmutató-,
  termék- és „Így rangsorolunk” oldalt — minden „szám + Ft” szöveg `[data-price-block]`-on belül van.
- Tesztek: unit 302 (+40), DB 12 fájl / 92 + 1 kihagyott (+20), e2e 46 (+8: legjobb ajánlat bontással és ítélettel,
  összes ajánlat sorrendje és a nem friss jelölés, ártörténet-váltó, célár-választó és vendég-cél, JSON-LD, 404 és
  390 px, „Ft” szabály 8 oldalon, süti-beállítások igény szerinti betöltése). `pnpm verify` zöld.
- Képernyőképek: `/termek/sovirag-retinolos-arcszerum-50-ml` (3 bolt, valódi akció) × 390/1440 × világos/sötét,
  teljes oldal és első képernyő (`tests/.artifacts/screens/f5/`), átnézve; javítva: mobilon a helykitöltő kép a
  teljes szélességet elfoglalta, és a legjobb ajánlat a hajtás alá került → keskenyebb kép (3/5).

**Eltérés a spectől és miért:** PRODUCT_SPEC 5.3 „Megvalósítás (F5)” és ARCHITECTURE 2. pont:
- **ISR helyett adat-szintű gyorsítótár** (1 óra + célzott tag-érvénytelenítés): a nonce-os CSP miatt az oldal nem
  lehet statikus. A hatás ugyanaz (a DB-t termékenként óránként legfeljebb egyszer kérdezi, az ingest után azonnal
  frissül), és a „ár ellenőrizve” mindig a renderelés idejéhez számol.
- 00:05-ös statisztika-futás (nem volt a specben): az ítélet ablaka napváltáskor tolódik.
- Indexelési szabály pontosítva (friss ajánlat + `is_indexable` vagy ≥ 120 karakteres leírás); a „Kinek ajánljuk”
  szerkesztői adat nélkül elmarad; a „Polcra teszem” csak szépségápolási terméknél.

**Nyitott kérdések:** nincs új. A bolt-gomb célja (`/go/…`) az F6-ban készül el (addig 404); a termékkártya
szív-művelete az F8-ban.
**Következő:** F6 — követett kattintás (`/go/[offerId]`), subID, konverzió-szinkron, `/admin/kattintasok`, majd
független vasszabály-átnézés.
