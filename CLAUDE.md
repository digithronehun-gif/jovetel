# CLAUDE.md — JóVétel

> A projekt működési szabályzata. Minden feladat előtt olvasd el.
> Ha egy utasítás ütközik ezzel a fájllal, ez a fájl győz, kivéve ha a felhasználó kifejezetten felülírja.

---

## 1. Mit építünk

**JóVétel: személyes vásárlási társ, ami emlékszik rád.** Magyar nyelvű webalkalmazás
(responsive, mobil-első), amely ingyenes tagságot kínál: ismeri a felhasználó bőrprofilját,
a szeretteit és azok fontos dátumait (születésnap, **névnap**), figyeli az árakat, és szól,
amikor vásárolni érdemes. Magyar webshopok valódi áraival dolgozik, licencelt affiliate
feedekből, és affiliate jutalékból él.

**Első vertikum:** szépségápolás és ajándék. **Szlogen:** „Rávilágítunk a jó vételre.”

**A felhasználói út:** nyilvános landing oldal → regisztráció (magic link / Google) →
60 másodperces onboarding → személyes irányítópult, ahol minden elérhető.

**Az üzleti logika egy mondatban:** a regisztrált tag 90–180-szor értékesebb, mint egy névtelen
látogató, ezért minden funkció két kérdésre felel: hoz-e regisztrációt, és ad-e okot a
visszatérésre. **North Star:** aktív vásárlási szándékok száma (árfigyelő + szerettünk dátummal
+ polcon lévő termék + kívánságlista-tétel).

**Nem célok (ne építsd meg):** saját checkout vagy fizetés · scraping bármilyen formában ·
natív app · ML-ajánlórendszer · több ország · külön keresőmotor · creator-kifizetések
(a 2. hónapban jönnek, de a Lista-modell már most legyen rá felkészítve).

---

## 2. Dokumentumok és precedencia

| Fájl | Tartalom |
|---|---|
| `docs/specs/PRODUCT_SPEC.md` | Képernyők, funkciók, szövegek, algoritmusok, értesítések |
| `docs/specs/DESIGN_SYSTEM.md` | Tokenek, tipográfia, komponensek, képhely-rendszer, mozgás |
| `docs/specs/DATA_MODEL.md` | Táblák, mezők, kényszerek, indexek, RLS |
| `docs/specs/ARCHITECTURE.md` | Stack, modulok, jobok, integrációk, biztonság, környezeti változók |
| `docs/specs/OPEN_QUESTIONS.md` | Nyitott kérdések, amikre a tulajdonos válasza kell |
| `START_PROMPT.md` | A teljes építés menete: 14 fázis, sorrendben, elfogadási kritériumokkal |
| `docs/PROGRESS.md` | Haladásnapló: a munka memóriája; megszakadás után innen folytatod |
| `docs/LAUNCH_CHECKLIST.md` | Élesítés előtti ellenőrzőlista |
| `docs/KONCEPCIO.md` | Üzleti háttér: miért így építjük |
| `docs/reference/strategia.pdf` | 98 oldalas eredeti stratégia; háttéranyag |

**Precedencia ütközéskor:** a felhasználó szava → ez a fájl → `docs/specs/*` → `KONCEPCIO.md` →
`strategia.pdf`. A PDF monorepót, Trigger.dev-et és vektoros keresést ír; ezeket **szándékosan**
elhagytuk, ne vezesd vissza őket.

---

## 3. A hét vasszabály

Megsértésük hiba, akkor is, ha egy feladat szövege mást sugall. Ha egy feladat csak úgy
teljesíthető, hogy megsérted valamelyiket, **állj meg és kérdezz**.

### 1. Az AI soha nem forrása a tényeknek
Árat, régi árat, kedvezményt, készletet, szállítási díjat és időt, értékelést és termékattribútumot
**kizárólag az adatbázisból renderelünk**. Az LLM feladata: szabad szöveg értelmezése strukturált
szűrővé, és a már kiválasztott termékek rövid indoklása a megadott tényekből.
**Az AI-indoklás egyáltalán nem tartalmazhat számjegyet** (ezt validátor ellenőrzi; a számokat a
felület rendereli mellé). Ha a validátor elutasít egy választ, determinisztikus sablonszöveg megy ki.
Nincs „AI MATCH 94%” vagy bármilyen AI által kitalált pontszám.

### 2. A feedszöveg nem megbízható adat
Minden feedből jövő szöveg ellenséges bemenet: importáláskor HTML-tisztítás, renderelés csak
szövegként, soha `dangerouslySetInnerHTML`. LLM-promptba csak adatként, határolók között kerül,
azzal az utasítással, hogy a benne lévő utasításokat figyelmen kívül kell hagyni.

### 3. Jelölés minden affiliate CTA mellett
Minden webshopba vivő gomb mellett ott a `<Disclosure />`: „Partnerlink: ha vásárolsz, jutalékot
kaphatunk. Ez nem befolyásolja a sorrendet.” A rangsorolás **soha** nem veszi figyelembe a jutalék
mértékét. Fizetett elem csak „Szponzorált” címkével (V1-ben nincs ilyen). Létezik nyilvános
„Így rangsorolunk” oldal.

### 4. Jogosultság két rétegben
Minden védett művelet jogosultságát a route handlerben / server actionben **és** az adatrétegben
is ellenőrizzük. A middleware önmagában soha nem elég. A felhasználói adatot lekérdező minden
függvény kötelezően `userId` paramétert kap, és arra szűr. RLS a felhasználói táblákon
biztonsági hálóként.

### 5. A `/go` nem nyit open redirectet
A `/go/[offerId]` kizárólag az adatbázisban tárolt ajánlat URL-jére irányít, a host a kereskedő
engedélylistáján van. Paraméterből érkező cél-URL-re irányítani tilos.

### 6. Az ár frissessége látható, az „akció” valódi
Minden ajánlat mellett látszik, mikor ellenőriztük („ár ellenőrizve 2 órája”). 48 óránál régebbi
ár elrejtve vagy jelölve. A „Valódi akció” ítélet **csak a saját napi ártörténetünkből** számolható
(`PRODUCT_SPEC.md` → Valódi akció algoritmus), a feed „régi ár” mezőjéből soha. A felületen
semleges, tényszerű nyelvet használunk a kereskedőkről (ők a partnereink): nincs „kamu”,
„átverés” jellegű szó.

### 7. Képjog: képhelyek, nem fájlok
A komponensek képet **csak képhelyen (slot) keresztül** kérnek (`getSlotImage('landing.hero')`),
fájlnévre soha nem hivatkoznak. A `src/content/brand/assets.manifest.json` minden képnél rögzíti
a forrást és a licencet. A `moodboard-dev-only` licencű képek fejlesztéshez valók; production
buildben csak akkor jelenhetnek meg, ha `ALLOW_DEV_IMAGES=true` be van állítva (tudatos döntés),
különben a build hibával leáll és listázza a cserélendő képhelyeket. Termékkép csak a feedből,
a program feltételei szerint.

---

## 4. Stack (rögzített)

| Réteg | Választás |
|---|---|
| Keretrendszer | Next.js App Router, **legfrissebb stabil 16.x, minimum 16.3.3, pontos verzióra pinelve** (nem `^`) |
| Nyelv | TypeScript `strict` |
| UI | Tailwind CSS + shadcn/ui (a design tokenekre átstílusozva) + `lucide-react` ikonok |
| Mozgás | `motion` (Framer Motion) takarékosan; `prefers-reduced-motion` tisztelete |
| Grafikon | Recharts (ártörténet) |
| DB | Supabase Postgres (EU, Frankfurt) + Drizzle ORM (`postgres` driver, pooler, `prepare: false`) |
| Auth | Supabase Auth: magic link + Google; admin: TOTP MFA |
| Keresés | Postgres FTS (magyar szótövezés + unaccent) + `pg_trgm`. **Nincs vektoros keresés V1-ben.** |
| AI | Vercel AI SDK (`ai`) szolgáltató-függetlenül; alapértelmezés Anthropic (modell környezeti változóból) |
| E-mail | Resend + React Email |
| Jobok | GitHub Actions cron (feed-import, árgyűjtés) + Vercel Cron (értesítések, napi KPI) |
| Tárhely | Supabase Storage (nyers feed-pillanatképek) |
| Rate limit | Upstash Redis (`@upstash/ratelimit`) |
| Bot-védelem | Cloudflare Turnstile (AI és foglalás végpontok) |
| Analitika | PostHog EU, **csak hozzájárulás után** + saját `clicks` / `events` tábla |
| Hibakövetés | Sentry |
| Validáció | Zod minden külső bemenetnél |
| Teszt | Vitest (unit), Playwright (e2e) |
| Hosting | Vercel (Pro), `fra1` régió |

---

## 5. Mappastruktúra

```
/app
  (marketing)/            /  (landing), /igy-rangsorolunk, /rolunk
  (legal)/                /adatvedelem, /aszf, /impresszum, /affiliate-tajekoztato, /cookie
  (catalog)/              /kereses, /termek/[slug], /kategoria/[...path], /ajandek (varázsló),
                          /utmutatok, /utmutatok/[slug], /l/[token] (megosztott lista)
  (auth)/                 /belepes, /auth/callback, /onboarding
  (app)/app/              /app (Neked most), /felfedezes, /szeretteim, /szeretteim/[id],
                          /listak, /listak/[id], /polc, /beallitasok
  (admin)/admin/          feedek, kereskedők, útmutatók, címkék, várólista, kattintások
  go/[offerId]/route.ts   affiliate átirányító
  api/                    search, ai/*, cron/*, webhooks/*, health
  styleguide/             belső design-rendszer oldal (production-ben 404)
/src
  lib/db/                 Drizzle séma, migrációk, seed, lekérdezések (userId-scope!)
  lib/ingestion/          adapters/, pipeline/, normalize/, quality/
  lib/search/             SearchProvider interfész + postgres implementáció
  lib/pricing/            teljes költség, ártörténet, „Valódi akció” ítélet
  lib/ai/                 gateway, prompts, schemas, validators, eval
  lib/notifications/      triggerek, ütemezés, dedup, e-mail sablonok
  lib/occasions/          névnapok, ünnepek, alkalom-számítás
  lib/assets/             képhely-feloldás, licencellenőrzés
  lib/auth/               session, jogosultság-segédek
  lib/analytics/          eseményséma, consent-kapu
  components/ui/          alap komponensek (tokenekre építve)
  components/app/         domain komponensek (ProductCard, OfferRow, LovedOneCard…)
  content/brand/          assets.manifest.json, szövegek
/emails                   React Email sablonok
/scripts                  ingest, check-assets, seed segédek
/tests                    unit, e2e, fixtures/feeds, eval/
/docs                     specifikációk (lásd 2. pont)
```

**Modulhatár-szabály:** `src/lib/*` modulok nem importálnak UI-t, és nincs körkörös import.
Az `ai` modul csak a `search` modul jelöltjeiből dolgozik, termékért közvetlenül nem kérdez DB-t.

---

## 6. Parancsok

```bash
pnpm dev                 # fejlesztői szerver
pnpm build               # production build (lefuttatja a check:assets-et is)
pnpm lint | typecheck | test | test:e2e
pnpm verify              # lint + typecheck + test — MINDEN feladat végén kötelező
pnpm db:generate | db:migrate | db:seed | db:studio
pnpm ingest -- --feed <id> | --all | --fixtures
pnpm check:assets        # listázza a moodboard-dev-only képeket használó képhelyeket
pnpm eval:ai             # AI eval-készlet futtatása
pnpm email:dev           # React Email előnézet
pnpm env:check           # mely környezeti változók vannak beállítva (csak igen/nem, érték nélkül)
```

**A `.env`, `.env.local` és `.env.production` fájlokat nem olvashatod** (a `.claude/settings.json`
tiltja). Hogy egy kulcs be van-e állítva, azt a `pnpm env:check` mondja meg; ha hiányzik, fixture-rel
vagy helyi megoldással dolgozz, és jelezd a `docs/PROGRESS.md`-ben.

---

## 7. Munkamódszer

1. **Először terv.** Minden fázist rövid tervvel kezdj a `docs/PROGRESS.md`-ben. A `START_PROMPT.md`
   szerinti folyamatos építésben nem vársz jóváhagyásra; ha a tulajdonos külön, egyedi feladatot kér,
   előbb mutasd meg a tervet, és csak jóváhagyás után kódolj.
2. **Kis lépések.** Egy logikai egység = egy commit, magyar nyelvű, beszédes üzenettel.
3. **Tesztek a kész definíciójához tartoznak.** Új logika teszt nélkül nincs kész.
4. **Spec-frissítés.** Ha eltérsz a spectől, frissítsd a spec érintett részét ugyanabban a commitban.
5. **Új függőség indoklással.** Írd le, miért nincs meglévő megoldás rá.
6. **Ne találj ki adatot.** Hiányzó valós adat (feed oszlopnév, program-azonosító, cégadat) →
   `docs/specs/OPEN_QUESTIONS.md` + jól látható TODO + működő fixture/placeholder.
7. **`pnpm verify` zöld, mielőtt késznek jelentesz bármit.** Ha nem az, írd le, mi bukik és miért.
8. **Nézd meg, amit építettél.** UI-feladat végén készíts Playwright-képernyőképet 390 px és
   1440 px szélességben, nézd meg, és javítsd, ami nem felel meg a `DESIGN_SYSTEM.md`-nek.
9. **Haladásnapló.** Minden fázis végén frissítsd a `docs/PROGRESS.md`-t; ez a munka memóriája.

---

## 8. Design szabályok röviden (részletek: `DESIGN_SYSTEM.md`)

- Minden szín, méret, lekerekítés és árnyék **CSS változóból** (tokenből) jön; literál hex tilos
  a komponensekben.
- Betűk: **Bodoni Moda** (display, csak ≥ 28 px) + **Manrope** (szöveg). `next/font/google`
  hívásban **kötelező**: `subsets: ['latin', 'latin-ext']`. A `latin` készletből hiányzik az ő és ű!
- Az AI szimbóluma a saját **fénysugár ikon** (`<RayIcon />`), nem szikra (✦) és nem „sparkles”.
- Nincs sötétkék–elektromos kék „AI-app” esztétika, nincs nehéz SaaS-oldalsáv.
- Mobil-első: minden képernyő 390 px-en tervezve, onnan felfelé.

---

## 9. Magyar lokalizáció

- **Hangnem:** tegező, meleg, rövid, konkrét. Nincs túlzó marketingnyelv, nincs anglicizmus,
  ahol van jó magyar szó (pl. „kívánságlista”, nem „wishlist”).
- **Pénz:** `24 990 Ft`: ezres tagolás nem törő szóközzel (U+00A0), a „Ft” előtt is.
  Egy helyen: `formatHuf()` a `lib/pricing`-ben.
- **Dátum:** `2026. szept. 22.` / `szeptember 22., kedd`. Relatív: „2 órája”, „10 nap múlva”.
  `Intl` `hu-HU` locale-lal, `Europe/Budapest` időzónában.
- **Rendezés:** `Intl.Collator('hu')`; a DB-ben `hu-HU-x-icu` collation, ahol névsor kell.
- **Slug:** ékezetmentesítés (`ő→o`, `ű→u`, `á→a`…), kisbetű, kötőjel.
- **Névnap, ünnep:** `lib/occasions` az egyetlen forrás (anyák napja: május első vasárnapja;
  apák napja: június harmadik vasárnapja; nőnap: március 8.).

---

## 10. Jogi és adatkezelési szabályok a kódban

- **Hozzájárulás előtt nincs analitika vagy marketing-pixel.**
- **Két külön e-mail hozzájárulás:** szolgáltatási értesítés (saját árfigyelő, emlékeztetők,
  a felhasználó kérte) és marketing (hírlevél). Mindkettő külön kapcsoló, időbélyeggel, verzióval.
- **AI-címke** minden AI-felületen: „Mesterséges intelligenciával beszélsz. Az árakat és a
  készletet mindig az adatbázisból mutatjuk.”
- **Nincs kitalált vélemény vagy értékelés.** Értékelés csak licencelt forrásból, forrásmegjelöléssel.
- **Szeretteink adatai harmadik személy adatai:** adattakarékosan (becenév, keresztnév, dátum;
  vezetéknév nincs), a felhasználó bármikor törölheti.
- **Bőrápolás:** kozmetikai tanács, nincs diagnózis vagy gyógyító állítás.
- **GDPR:** adatexport (JSON) és fióktörlés a Beállításokban; törléskor kaszkád + anonimizált kattintásnapló.
- **IP** csak sózott hash-ként tárolható.

---

## 11. Biztonság

- Paraméterezett lekérdezés (Drizzle), SQL-összefűzés tilos.
- SSRF: feed-URL engedélylista, privát IP-tartományok tiltva, letöltés csak az ingest scriptben.
- Szigorú CSP nonce-szal; feedből jövő HTML soha nem markup.
- Rate limit: `/api/ai/*`, `/go/*`, foglalás, waitlist, belépés. Turnstile az AI-n és a foglaláson.
- Cron és webhook végpontok: `CRON_SECRET` / HMAC-aláírás + időbélyeg.
- Titkok csak szerveroldalon; `NEXT_PUBLIC_` csak valóban publikus értékre.
- Admin: szerepkör + MFA, minden admin írás `audit_log`-ba.

---

## 12. Definition of Done (minden feladatra)

- [ ] `pnpm verify` zöld
- [ ] Új logikához unit teszt; felhasználói folyamathoz e2e teszt
- [ ] A hét vasszabály egyike sem sérül
- [ ] Az elfogadási kritériumok számszerűen teljesülnek (mérd, ne becsüld)
- [ ] UI esetén: 390 px és 1440 px képernyőkép megnézve, világos és sötét módban
- [ ] Érintett spec frissítve, nyitott kérdések az `OPEN_QUESTIONS.md`-ben
- [ ] Rövid összefoglaló: mi készült el, mi nem, mi a következő lépés
