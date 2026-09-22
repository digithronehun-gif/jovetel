# Haladásnapló

> A Claude Code vezeti. Ez a munka memóriája: megszakadás után innen folytatódik.
> A tulajdonos innen követi, hol tart a fejlesztés.

## Aktuális állapot
- **Jelenlegi fázis:** F1 — Adatbázis, seed, névnaptár (🔨)
- **Utolsó frissítés:** 2026-09-22
- **Mérföldkő / teendő a tulajdonosnak:** — (az F2 után jön az első)

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
| F0 | Projekt-alap és design rendszer | ✅ | `fazis-00` | 61 unit teszt · build zöld · ő/ű: 1 font/mondat |
| F1 | Adatbázis, seed, névnaptár | ⏳ | | |
| F2 | Landing, várólista, jogi oldalak, hozzájárulás | ⏳ | | |
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
