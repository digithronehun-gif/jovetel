# JóVétel — a teljes alkalmazás felépítése

Te vagy a JóVétel vezető fejlesztője. A feladatod a teljes alkalmazás felépítése ebben a repóban,
az alábbi 14 fázisban, **sorrendben és folyamatosan, a saját tempódban**. A végén egy élesítésre
kész alkalmazás álljon itt: nyilvános landing oldal, regisztráció és onboarding, és a személyes
irányítópult, ahol a felhasználó mindent elér.

---

## 1. Források — olvasd el, mielőtt bármit írsz

| Fájl | Mi van benne |
|---|---|
| `CLAUDE.md` | A szabályzat és a **hét vasszabály**. Ütközés esetén ez győz. |
| `docs/specs/PRODUCT_SPEC.md` | Minden képernyő, végleges magyar szövegekkel; algoritmusok; értesítések |
| `docs/specs/DESIGN_SYSTEM.md` | A „Napfény” vizuális nyelv: tokenek, betűk, komponensek, képhelyek, mozgás |
| `docs/specs/DATA_MODEL.md` | Táblák, mezők, kényszerek, RLS, seed |
| `docs/specs/ARCHITECTURE.md` | Stack, modulok, feed-import, `/go`, AI gateway, e-mail, jobok, környezeti változók |
| `docs/specs/OPEN_QUESTIONS.md` | Nyitott kérdések a tulajdonosnak (ide írsz, ha valami hiányzik) |
| `docs/LAUNCH_CHECKLIST.md` | Élesítés előtti ellenőrzőlista (az F13-ban dolgozod fel) |
| `docs/KONCEPCIO.md` | Üzleti háttér: miért így építjük |
| `src/content/brand/assets.manifest.json` | 38 kép, 42 képhely: a képek egyetlen forrása |

Az első alkalommal olvasd el mindet teljesen. Utána fázisonként csak a fázisnál megjelölt részeket
olvasd újra, hogy kíméld a kontextust.

---

## 2. Hogyan dolgozz

### Folyamatos haladás
Fázisról fázisra haladj, **nem kell jóváhagyásra várnod** a fázisok között. A tulajdonos a
`docs/PROGRESS.md`-ből és a commitokból követi, hol tartasz, és bármikor közbeszólhat.

### Minden fázis menete
1. Olvasd el a fázisnál megjelölt spec-részeket.
2. Írj rövid tervet a `docs/PROGRESS.md` adott fázisához (5–10 sor: mit építesz, milyen sorrendben, milyen kockázattal).
3. Implementálj kis, logikai lépésekben; minden lépés egy commit, magyar nyelvű, beszédes üzenettel.
4. Írd meg a teszteket (unit az új logikára, e2e a felhasználói folyamatokra).
5. Mérd meg a fázis „Kész, ha” kritériumait. Mérj, ne becsülj.
6. UI esetén készíts Playwright-képernyőképet 390 px és 1440 px szélességben, világos és sötét
   módban. **Nézd meg őket**, és javítsd, ami nem felel meg a `DESIGN_SYSTEM.md`-nek.
7. `pnpm verify` legyen zöld.
8. Frissítsd a `docs/PROGRESS.md`-t: kész / mért számok / eltérés a spectől és miért / nyitott kérdések.
9. Tegyél rá git taget: `git tag fazis-XX` (pl. `fazis-03`), hogy vissza lehessen térni.
10. Lépj tovább a következő fázisra.

### Mikor állj meg és kérdezz (csak ekkor)
- **Vasszabály-ütközés:** egy feladat csak úgy teljesíthető, hogy megsértesz egy vasszabályt.
- **Költséges vagy visszafordíthatatlan döntés:** fizetős szolgáltatás bekapcsolása, production
  adatbázis módosítása, domain, bármi, ami a tulajdonos nevében kötelezettséget vállal.
- **Elakadás:** egy fázis „Kész, ha” kritériuma 3 javítási kör után sem teljesül. Ilyenkor írd le
  pontosan, mi a helyzet, mit próbáltál, és mi a javaslatod.

### Ami NEM ok a megállásra
Hiányzó API-kulcs, még jóvá nem hagyott affiliate-program, ismeretlen feed-formátum, hiányzó
cégadat. Ilyenkor: helyi megoldás (helyi Supabase, Resend teszt mód) vagy valósághű fixture,
jól látható `TODO(owner)` a kódban, bejegyzés az `OPEN_QUESTIONS.md`-be, és **haladj tovább**.

### Mérföldkövek
Két ponton írj a kimenetbe és a `PROGRESS.md` tetejére egy jól látható **MÉRFÖLDKŐ** blokkot
azzal, hogy mit kell a tulajdonosnak most tennie, aztán folytasd a munkát:
- **F2 után:** a landing élesíthető waitlist módban (Vercel, domain, környezeti változók lépésről lépésre).
- **F3 után:** az árgyűjtőt élesben kell indítani (GitHub Actions secrets, első valódi feed).
  **Határidő: 2026. október 28.**, mert a Black Friday-hez (november 27.) 30 nap saját ártörténet kell.
  Ezért az F0–F3 fázisokat a lehető leggyorsabban, egymás után végezd el.

### Kontextus és folytatás
A `docs/PROGRESS.md` a memóriád. Ha a munkamenet megszakad, tömörít vagy újraindul, a
`CLAUDE.md` és a `docs/PROGRESS.md` alapján folytasd onnan, ahol abbahagytad. Ne kezdj újra
kész fázist.

### Független átnézés
Az F3, F6, F9 és F12 végén nézd át az addigi kódot a hét vasszabály szerint (ha tudsz, egy
külön subagenttel, ami nem látta a munkát): ár csak `PriceBlock`-ból, `Disclosure` minden affiliate
gomb mellett, felhasználói tábla csak `userId`-val, kép csak képhelyről, nincs literál hex szín,
nincs AI által írt szám. A talált hibákat javítsd, mielőtt továbblépsz.

---

## 3. A 14 fázis

### F0 — Projekt-alap és design rendszer
**Olvasd:** `CLAUDE.md` · `DESIGN_SYSTEM.md` (teljesen) · `ARCHITECTURE.md` 1., 2., 10., 11. pont

**Építsd:**
- Next.js projekt a repo gyökerében (App Router, TypeScript strict, pnpm) a `CLAUDE.md` 4. pontja
  szerinti, pontosan pinelt verzióval; Tailwind, shadcn/ui, lucide-react, motion. A meglévő
  `docs/`, `public/brand/`, `src/content/brand/`, `.claude/` mappákat és a gyökérben lévő `.md`
  fájlokat **ne írd felül**.
- Mappastruktúra a `CLAUDE.md` 5. pontja szerint, modulonként rövid README-vel. ESLint, Prettier,
  Vitest, Playwright, a `CLAUDE.md` 6. pontjának összes pnpm scriptje, `.env.example` az
  `ARCHITECTURE.md` 10. pontja szerint, GitHub Actions CI (lint, typecheck, test, build).
- Design tokenek CSS változóként világos és sötét módra, a Tailwind a tokenekre kötve. Betűk
  `next/font`-tal, **`subsets: ['latin','latin-ext']`** (a `latin`-ból hiányzik az ő és ű).
- Aláíró elemek: `LightLeak`, `LeafShadow`, `RayIcon`, JóVétel szóvédjegy és J monogram (SVG),
  favicon és app-ikon.
- Az összes alap komponens minden állapottal; a domain komponensekből most a `PriceBlock`,
  `VerdictBadge`, `WhyTag`, `Disclosure`, `AiLabel`.
- Képhely-rendszer (`src/lib/assets`: `getSlotImage`, `getSlotImages`, `assertLicensedForProduction`)
  típusos `SlotId`-vel, `pnpm check:assets`, a production build a 7. vasszabály szerint.
- Magyar formázók: `formatHuf`, `formatDate`, `formatRelative`, `slugify`, tesztekkel.
- `/styleguide` a `DESIGN_SYSTEM.md` 12. pontja szerint (production-ben 404).

**Kész, ha:** `pnpm verify` és `pnpm build` zöld · a „Tűzőgép, őszi fűszál: ŐŰ őű.” mondat mindkét
betűtípussal hibátlan a képernyőképen (az ő/ű nem más fontból jön) · `formatHuf(24990) === "24 990 Ft"`
nem törő szóközökkel · a `/styleguide` képernyőképei rendben vannak mind a négy változatban.

---

### F1 — Adatbázis, seed, névnaptár
**Olvasd:** `DATA_MODEL.md` (teljesen) · `ARCHITECTURE.md` 2. pont

**Építsd:**
- Supabase-kapcsolat (`db` és `dbAdmin` kliens), Drizzle, migrációk. Ha nincs még Supabase projekt,
  helyi Supabase (CLI), és a README-be írd le, hogyan kell a valódit bekötni.
- Kiterjesztések, `hu_unaccent` keresési konfiguráció, `f_unaccent` wrapper.
- Minden tábla a `DATA_MODEL.md` szerint: kényszerek, indexek, generált `search_vector`, `price_daily`
  havi particionálással, RLS a felhasználói táblákon.
- Lekérdező réteg váza: minden felhasználói adatot érintő függvény `userId` paraméterrel.
- A teljes magyar névnaptár a `namedays` táblába, minden név összes napjával és `is_primary`
  jelöléssel, **megbízható, nyilvános adatkészletből** (a forrást írd a seed fájl fejlécébe).
  Emlékezetből ne generáld; ha nem találsz megbízható forrást, ez az egyik ok a megállásra.
- Seed a `DATA_MODEL.md` 6. pontja szerint (`[DEMO]` kereskedők, 45 nap szintetikus ártörténet).
  A seed production környezetben ne fusson le.

**Kész, ha:** a migráció fel és vissza is lefut · „parfum” megtalálja a „parfüm”-öt, „cipők” a „cipő”-t,
„szerum” a „szérum”-ot · 50 000 generált terméken a névkeresés p95 < 50 ms · teszt bizonyítja, hogy
két felhasználó nem látja egymás adatait · névnap-tesztek: István – aug. 20., Katalin – nov. 25.,
Anna – júl. 26., László – jún. 27., Péter – jún. 29., Erzsébet – nov. 19., Miklós – dec. 6.,
János – jún. 24., József – márc. 19., Márton – nov. 11., András – nov. 30., Luca – dec. 13., Éva – dec. 24.

---

### F2 — Landing, várólista, jogi oldalak, hozzájárulás
**Olvasd:** `PRODUCT_SPEC.md` 2., 3., 11. pont · `DESIGN_SYSTEM.md` 5., 7., 8., 9. pont

**Építsd:**
- Landing (`/`) a `PRODUCT_SPEC.md` 3. pontja szerint, szekcióról szekcióra, a megadott szövegekkel.
  Minden kép képhelyről. A heróban lassan mozgó `LightLeak`, egy összehangolt belépő animáció.
  A mini-demók valódi komponensek minta-adattal, nem képek.
- `LAUNCH_MODE` (waitlist | live) kezelése.
- Várólista: Server Action, Zod, Turnstile, rate limit, double opt-in megerősítő e-mail (Resend,
  `WaitlistConfirm`), `/varolista/megerosites`.
- Jogi oldalak valódi szerkezettel: `/adatvedelem`, `/aszf`, `/impresszum`, `/affiliate-tajekoztato`,
  `/cookie`, `/igy-rangsorolunk` (a `PRODUCT_SPEC.md` 7.2 súlyai alapján). A cégadatok helyén
  `[KITÖLTENDŐ]`, és vidd fel őket az `OPEN_QUESTIONS.md`-be.
- Süti- és hozzájárulás-sáv (szükséges, analitika, marketing), naplózva a `consents` táblába.
  PostHog csak analitika-hozzájárulás után töltődik be.
- Fejléc, lábléc, 404 (képhely: `hiba.404`), metaadatok, OG-kép a szóvédjeggyel, `vercel.json` (fra1).

**Kész, ha:** Lighthouse mobil ≥ 90 mind a négy kategóriában · e2e: a feliratkozás végigmegy a
megerősítésig · e2e: hozzájárulás előtt nincs PostHog hálózati kérés · a hero első képernyőjén látszik
a cím, az alcím, mindkét gomb és a kép · képernyőképek rendben.
→ **MÉRFÖLDKŐ:** élesítési lépések a tulajdonosnak.

---

### F3 — Feed-import és napi árgyűjtő
**Olvasd:** `CLAUDE.md` 2. és 6. vasszabály · `ARCHITECTURE.md` 3. és 7. pont · `DATA_MODEL.md` 2. pont

**Építsd:**
- `FeedAdapter` interfész; adapterek: `generic-csv`, `generic-xml`, `awin`, `cj`, `dognet`, `admitad`,
  `manual`. Kulcs nélkül valósághű fixture-ökön fussanak (`tests/fixtures/feeds/`): helyes sorok,
  hibás kódolás, hiányzó mező, negatív ár, HTML és prompt-injection szöveg a leírásban.
- A pipeline mind a 9 lépése, streaming feldolgozással, idempotenciával, minőségi kapuval.
- Kiszerelés-kinyerő, kategória-leképezés, szabályalapú címkézés (`product_tags`, `source=rule`).
- `scripts/ingest.ts` (`--feed`, `--all`, `--fixtures`), GitHub Actions workflow (04:00 és 16:00
  Budapest, UTC-re átszámolva, kommenttel), riasztó e-mail blokkolt futásnál.
- `/admin/feedek` (feedek, futások, hibaminta, [Futtatás most]), `requireAdmin()` védelemmel.

**Kész, ha:** 50 000 soros import < 10 perc, stabil memóriával · változatlan feed újrafuttatása 0 írás ·
hibás sorok nem állítják meg a futást · 60% alatti tételszám → `blocked`, nincs publikálás, riasztás kimegy ·
a feedben lévő HTML és script a DB-ben tisztított szöveg · `price_daily` két eltérő árú futás után helyes.
→ **MÉRFÖLDKŐ:** az árgyűjtő élesítése (határidő: október 28.).
→ **Független átnézés.**

---

### F4 — Keresés, kategóriák, útmutatók
**Olvasd:** `PRODUCT_SPEC.md` 5.2, 7.1, 7.2, 9. pont · `ARCHITECTURE.md` 2. pont (Keresés)

**Építsd:**
- `SearchProvider` + `PostgresSearch`: hibrid FTS + trigram rangsor, szűrők (ár teljes költséggel,
  márka, kategória, bolt, készleten, valódi akció, bőrtípus, mentes címkék), facetek számokkal,
  rendezések, lapozás. A súlyok konfigurációs fájlban; **a jutalék nem szerepelhet**.
- `/kereses` (szűrők mobilon alsó lapban, URL-ben tárolt állapot, üres állapot a spec szerint),
  a `ProductCard` összes változata.
- `/kategoria/[...path]` képhelyes fejléccel; kategória-áttekintő.
- `/utmutatok`, `/utmutatok/[slug]` (lists `type=editorial`) + `/admin/utmutatok` szerkesztő.
- `GET /api/search` rate limittel.

**Kész, ha:** 50 magyar tesztlekérdezés (elírásokkal, ékezet nélkül; `tests/fixtures/search-queries.json`)
≥ 80%-ánál a várt termék a top 5-ben · p95 < 300 ms 50 000 terméken · képernyőképek rendben.

---

### F5 — Termékoldal, teljes költség, ártörténet, „Valódi akció?”
**Olvasd:** `CLAUDE.md` 1., 3., 6. vasszabály · `PRODUCT_SPEC.md` 5.3, 7.1, 7.3, 7.4 · `DESIGN_SYSTEM.md` 6. pont

**Építsd:**
- `src/lib/pricing`: `totalCost`, `bestOffer`, `verdict` (a 7.3 pontosan), `formatHuf`, tesztek
  minden határesetre (küszöbön lévő ár, 13 és 14 napnyi adat, hiányzó napok, feed-kedvezmény
  valódi ítélet nélkül, készlethiány).
- `/termek/[slug]` a 5.3 szerint: galéria, `PriceBlock`, `VerdictBadge`, `PriceHistoryChart`
  (30/90 nap, boltonként, min30 szaggatott vonallal), `OfferRow` lista teljes ár szerint, `WhyTag`-ek,
  leírás, kapcsolódó termékek.
- A műveleti gombok (Szólj, ha olcsóbb lesz · Listára · Polcra teszem) a helyükön; vendégnél belépésre
  visznek `returnTo` + `pendingAction` paraméterrel (a végrehajtás az F7–F8-ban készül el).
- 48 óránál régebbi ár: „nem friss” jelölés, kimarad a legjobb ajánlatból.
- JSON-LD csak valós mezőkből; `is_indexable` szabály; ISR 1 óra + célzott revalidáció az ingest után.

**Kész, ha:** a pricing tesztek a spec minden ágát lefedik · a legjobb teljes ár 20 kézi tesztesetben
helyes · mobil LCP < 2,5 s · teszt bizonyítja, hogy minden „Ft” szöveg `PriceBlock`-on belül van ·
képernyőképek rendben.

---

### F6 — Követett kattintás, jelölés, konverziók
**Olvasd:** `CLAUDE.md` 3. és 5. vasszabály · `ARCHITECTURE.md` 3. (Konverzió-szinkron) és 4. pont · `DATA_MODEL.md` 4. pont

**Építsd:**
- `/go/[offerId]` az `ARCHITECTURE.md` 4. pontja szerint (click_id, adapteres cél-URL, host-ellenőrzés,
  nem blokkoló naplózás, botszűrés, rate limit, 302 no-store).
- Minden adapter `buildTrackingUrl`-je a hálózat subID-formátumával és hosszkorlátjával; ahol nem
  ellenőrzött, fixture + `OPEN_QUESTIONS` bejegyzés.
- `placement` és `ref` minden „Megnézem a boltban” gombon, whitelistelt értékekkel.
- `scripts/sync-conversions.ts` + GitHub Actions (05:00), fixture-tesztekkel minden hálózatra.
- `/igy-rangsorolunk` véglegesítve; `/admin/kattintasok` (napi kattintás, bolt szerint, konverziók, EPC).

**Kész, ha:** open redirect tesztcsomag (abszolút URL, protokoll-relatív, kódolt, láncolt, idegen host
a feedben) mind elutasítva · redirect p95 < 150 ms 500 kérés/perc mellett · subID hálózatonként helyes ·
szintetikus konverzió helyesen párosul · e2e: minden oldaltípuson minden affiliate gomb mellett ott a `Disclosure`.
→ **Független átnézés.**

---

### F7 — Belépés, onboarding, beállítások
**Olvasd:** `CLAUDE.md` 4. vasszabály és 10. pont · `PRODUCT_SPEC.md` 4., 5.8 · `ARCHITECTURE.md` 2. (Auth), 6. pont

**Építsd:**
- Supabase Auth (magic link + Google, `@supabase/ssr`), `/auth/callback`, `requireUser()`,
  `requireAdmin()` (MFA `aal2`), magyar auth e-mailek.
- `/belepes` a 4.1 szerint; `returnTo` + `pendingAction`: belépés után a félbehagyott művelet
  (árfigyelő, listára, polcra, foglalás) automatikusan lefut, toast jelez vissza.
- `/onboarding` a 4.2 szerint: 5 lépés, kihagyható, feltételes 2. lépés, élő névnap-javaslat a
  keresztnévből, választó több névnapnál, mentés lépésenként.
- Két külön e-mail hozzájárulás a `consents` táblába, verzióval.
- `/app/beallitasok`: profil, értesítések, adatexport (JSON, minden felhasználói tábla), fióktörlés
  (`DATA_MODEL.md` 5. pont) megerősítéssel.
- Waitlist módban a belépés csak a `BETA_ALLOWLIST` címeinek működik.

**Kész, ha:** e2e: új felhasználó végigmegy (belépés → 5 lépés → `/app`) · e2e: vendég a termékoldalon
„Szólj, ha olcsóbb lesz” → belépés → visszatér, és az árfigyelő létrejött · e2e: fióktörlés után minden
adata törölve (DB-ellenőrzéssel) · „Katalin” → november 25. · képernyőképek rendben.

---

### F8 — App-keret, listák, megosztás, foglalás, árfigyelő
**Olvasd:** `PRODUCT_SPEC.md` 5. (bevezető), 5.5, 5.6, 5.7 (Árfigyelők) · `DATA_MODEL.md` 3. pont (lists, list_items, reservations, price_alerts)

**Építsd:**
- `/app` keret: `BottomTabBar` (mobil), `SideRail` (desktop), felső kereső, profil-menü. A `/app`
  kezdőlap egyelőre egyszerű (az F11-ben készül el), a keret végleges.
- `/app/listak`, `/app/listak/[id]`: létrehozás, szerkesztés, tételek (megjegyzés, prioritás,
  húzással rendezés), borító, alkalom és dátum, láthatóság, megosztási link (másolás, visszavonás,
  újragenerálás), meglepetés-mód.
- `/l/[token]` a 5.6 szerint: noindex, foglalás (belépés `returnTo`-val, Turnstile, rate limit),
  visszavonás, „Már valaki megveszi”, alsó akvizíciós CTA, `ReservationConfirm` e-mail.
- Meglepetés-módban a lista gazdája **semmit** nem lát a foglalásokból; ezt a lekérdező réteg
  biztosítja, nem a UI, és külön teszt igazolja.
- Árfigyelő: létrehozás a termékoldalról (célár-választó), lista a `/app/polc` Árfigyelők fülén,
  szüneteltetés, törlés.

**Kész, ha:** e2e: A listát készít és megoszt → B lefoglal egy tételt → A nem látja → C látja, hogy
„Már valaki megveszi” → B visszavonja → C lefoglalhatja · egyidejű foglalásból csak egy sikerül ·
a `share_token` ≥ 32 karakter, kriptografikus, visszavonás után a régi link 404 · képernyőképek rendben.

---

### F9 — Szeretteim, alkalmak, értesítési motor
**Olvasd:** `PRODUCT_SPEC.md` 5.4, 7.6, 8. pont · `ARCHITECTURE.md` 6., 7. pont · `DATA_MODEL.md` 3. pont (loved_ones, occasions, gift_history, notifications)

**Építsd:**
- `src/lib/occasions`: névnap-keresés (ékezet- és kisbetű-független), `nextDate()` minden
  alkalomtípusra (mozgó ünnepek, szökőnap).
- `/app/szeretteim` (lista + következő 60 nap idővonala), `/app/szeretteim/[id]` az 5.4 szerint:
  automatikus alkalmak, ki/be kapcsolás, emlékeztető-időzítés, ajándék-előzmény (kézi + „Ezt vetted
  neki?” egy `/go` kattintás utáni következő látogatáskor).
- Értesítési motor: triggerek (alkalom, árfigyelő, polc; a polc az F11-ben kap adatot, a trigger
  most készül), `notifications` sorok dedupe kulccsal, **naponta legfeljebb egy összesítő levél**
  felhasználónként a `digest_time` szerint.
- React Email: `DailyDigest`, `ReservationReminder`, a meglévők egységesítése; leiratkozás típusonként
  aláírt tokennel, `List-Unsubscribe` fejléc, `/leiratkozas`.
- Vercel Cron végpontok (`CRON_SECRET`), `vercel.json` ütemezés.
- A levelek ajánlatai a `/go`-n át mennek `placement=email_digest`-tel, az ár mellett dátum és időpont.

**Kész, ha:** e2e: „Katalin” nevű szerettünk → a cron szimulált november 15-i dátummal lefut → egy
`DailyDigest` megy ki az alkalommal és 3 ötlettel · kétszeri cron-futás ugyanazon a napon nem küld két
levelet · hozzájárulás nélkül nem megy ki szolgáltatási levél · `nextDate`: anyák napja 2026 = május 3.,
2027 = május 2.; apák napja 2026 = június 21.; február 29-i születésnap 2027-ben február 28. ·
a levelek előnézete mobil és desktop levelezőben rendben.
→ **Független átnézés.**

---

### F10 — Ajándék-varázsló és AI réteg
**Olvasd:** `CLAUDE.md` 1. és 2. vasszabály · `PRODUCT_SPEC.md` 6., 7.2 · `ARCHITECTURE.md` 5. pont · `DESIGN_SYSTEM.md` 5.1, 5.3

**Építsd:**
- `src/lib/ai`: gateway (Vercel AI SDK, szolgáltató és modell környezeti változóból), `WizardStateSchema`,
  `interpret()` (`generateObject` + kulcsszavas visszaesés), `explain()` a tényhalmazból,
  `validators.ts` (az `ARCHITECTURE.md` 5. pontjának összes szabálya), sablon-fallback, cache,
  költségszámítás és -plafon, `ai_requests` naplózás.
- `search.candidatesForWizard(state)`: determinisztikus jelöltgyűjtés (kategória, címkék, ár ≤ keret
  teljes költséggel, készleten, ajándék-előzmény kizárása), rangsor a 7.2 szerint, három csoport
  (Biztos befutó, Különleges, Kis figyelmesség).
- `/ajandek` (nyilvános) és a `/app/felfedezes` varázsló-belépője a 6.1 szerint, képhelyes címzett-
  és alkalomkártyákkal; belépve a mentett szeretteim is választhatók, és az eredmény elmenthető hozzájuk.
- Szabad szöveges tanácsadó a 6.2 szerint: az értelmezés szerkeszthető chipekként („Így értettem: …”),
  onnan ugyanaz a folyamat.
- `AiExplanation`, `AiLabel`, `RayIcon` minden AI-felületen; rate limit és Turnstile a spec szerint.
- Eval: `tests/eval/interpret.json` (60 eset), `explain.json` (40 eset), prompt-injection csomag,
  `pnpm eval:ai`; az injection csomag a CI-ban minden PR-on fusson.

**Kész, ha:** értelmezés ≥ 90% mezőpontosság · indoklás 100% validátor-megfelelés · injection csomag
100% · egyetlen megjelenített indoklásban sincs számjegy (automatikus ellenőrzés a teljes eval-kimeneten) ·
első eredmények p95 < 1,5 s, indoklásokkal együtt < 4 s · átlagos költség / varázsló-futás forintban
kiírva, a plafon alatt · képernyőképek rendben.

---

### F11 — „Neked most” és Szépségpolc
**Olvasd:** `PRODUCT_SPEC.md` 5.1, 5.7 (Szépségpolc), 7.5

**Építsd:**
- Szépségpolc: `shelf_items`, kiszerelés a termékből (szerkeszthető), kinyitás dátuma, tempó, becsült
  elfogyás (`usage_defaults`), folyamatjelző, [Újra megveszem] a legjobb aktuális árral, [Elfogyott].
  Felvétel termékoldalról, keresésből és a „Megvetted?” kérdésből.
- A polc-trigger bekötése az értesítési motorba (10 nappal az elfogyás előtt).
- `/app` (Neked most): üdvözlés napszak szerint, egymondatos összegzés, max. 8 kártya az 5.1
  prioritási sorrendjében, üres állapot három indítókártyával; desktopon két oszlop (kártyák +
  közelgő alkalmak idővonala).
- „Neked válogattuk”: 4 termék a profilhoz `WhyTag`-ekkel, a már listán/polcon lévők nélkül.
- Első betöltéskor finom kártya-belépés, `prefers-reduced-motion` tisztelettel.

**Kész, ha:** 30 ml szérum átlagos tempóval kb. 100 nap, gyorssal kb. 71 nap · e2e: új tag üres
állapotot lát; egy szerettünk + egy árfigyelő + egy polctétel után a kártyák a helyes sorrendben jönnek ·
a `/app` szerveroldali betöltése p95 < 800 ms · képernyőképek rendben.

---

### F12 — Admin, SEO, analitika
**Olvasd:** `PRODUCT_SPEC.md` 9., 10., 11. pont · `ARCHITECTURE.md` 9. pont

**Építsd:**
- `/admin` a 10. pont szerint (a meglévő feedek, útmutatók, kattintások mellé): kereskedők
  (szállítási szabályok, bolt-minőség, domain-engedélylista), termékcímkék (top 500, AI-javaslat szó
  szerinti bizonyítékkal, jóváhagyással), fogyási alapértékek, várólista CSV-export, képhelyek
  licenccel. Minden admin írás az `audit_log`-ba.
- SEO: sitemap-ek lapozva (termék, kategória, útmutató), robots.txt, kanonikus URL-ek,
  `is_indexable` szabályok, OG-képek, strukturált adat minden oldaltípuson.
- Analitika: a 11. pont összes eseménye (PostHog consent után, a kritikusak az `events` táblába is),
  napi KPI materializált nézet, `/admin` összesítő (látogatás, regisztráció, **aktív vásárlási
  szándékok = North Star**, kattintás, EPC).
- `/api/health` és a riasztások az `ARCHITECTURE.md` 9. pontja szerint.

**Kész, ha:** nem-admin egyetlen `/admin` oldalt és admin-actiont sem ér el (route és adatréteg szinten
is tesztelve) · a sitemap 50 000 terméknél is érvényes · a strukturált adat hibamentes · a North Star
az adminban egyezik egy kézi SQL-lekérdezéssel.
→ **Független átnézés.**

---

### F13 — Indulás előtti átvizsgálás
**Olvasd:** `CLAUDE.md` (teljesen) · `LAUNCH_CHECKLIST.md` (teljesen)

**Csináld:**
- A `LAUNCH_CHECKLIST.md` minden **[T]** pontjánál: ✅ kész (bizonyíték: teszt neve, mért szám,
  képernyőkép) vagy ❌ hiányzik (mit kell tenni). A **[Te]** pontokat gyűjtsd ki külön listába.
- Teljes e2e-futás, Lighthouse mobil a fő oldaltípusokon, axe akadálymentességi ellenőrzés,
  biztonsági fejlécek ellenőrzése.
- Vasszabály-audit a teljes kódon (lásd „Független átnézés”), minden talált hiba javítva.
- `pnpm check:assets`: a még moodboard-képet használó képhelyek listája.
- A ❌ technikai pontok javítása; ami nem fér bele, a README „Ismert hiányosságok” részébe.

**Kész, ha:** minden [T] pont ✅, vagy indoklással az „Ismert hiányosságok” listában ·
`pnpm verify`, `pnpm test:e2e`, `pnpm eval:ai` zöld.

---

## 4. Zárás

Az F13 után írj a `docs/PROGRESS.md` tetejére egy **ZÁRÓJELENTÉST**:
1. Mi készült el (fázisonként egy sor, a mért számokkal).
2. Ismert hiányosságok és kockázatok.
3. **A tulajdonos teendői az élesítésig**, sorrendben, lépésről lépésre (fiókok, kulcsok, domain,
   DNS, jogi szövegek, képcsere, partnerprogramok, `LAUNCH_MODE=live`).
4. A következő 5 javasolt fejlesztés (a `PRODUCT_SPEC.md` 12. pontjából és a munka során szerzett
   tapasztalatból).

---

**Kezdd most:** olvasd el a forrásokat, töltsd ki a `docs/PROGRESS.md` indulási részét, és indítsd az F0-t.
