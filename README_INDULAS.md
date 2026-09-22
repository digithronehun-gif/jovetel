# JóVétel — Indulás

Ez a mappa a JóVétel alkalmazás indulócsomagja. A Claude Code **egyetlen promptból** építi fel a
teljes appot, 14 fázisban, folyamatosan, a saját tempójában.

## Mi van benne

| Fájl / mappa | Mi ez |
|---|---|
| **`START_PROMPT.md`** | **A fő prompt.** Ezzel indítod a teljes építést |
| `CLAUDE.md` | A projekt szabályzata: a Claude Code minden lépésnél ebből indul |
| `docs/PROGRESS.md` | Haladásnapló: itt követed, hol tart; megszakadás után innen folytatja |
| `docs/SEGEDPROMPTOK.md` | Rövid promptok: folytatás, hibajavítás, módosítás, képcsere, új partner |
| `docs/specs/` | Termék, design, adatmodell, architektúra, nyitott kérdések |
| `docs/LAUNCH_CHECKLIST.md` | Élesítés előtti ellenőrzőlista |
| `docs/KONCEPCIO.md` | Az üzleti koncepció (miért így építjük) |
| `docs/reference/strategia.pdf` | Az eredeti 98 oldalas stratégia |
| `public/brand/moodboard/` | A 38 moodboard kép WebP-ben, webre optimalizálva |
| `src/content/brand/assets.manifest.json` | Képhely-térkép: melyik kép hova kerül, milyen licenccel |
| `.claude/settings.json` | Jogosultságok, hogy a Claude Code ne kérdezzen rá minden parancsra |

## Indítás

1. Telepítsd: **Node.js 22+**, **pnpm** (`npm i -g pnpm`), **Claude Code**.
2. Csomagold ki a mappát, nyiss benne terminált, és indítsd:
   ```
   git init
   claude
   ```
3. Az első indításkor a Claude Code megkérdezi, megbízol-e a mappában: **igen**. Ettől lépnek
   életbe a `.claude/settings.json` engedélyei (a pnpm, git commit stb. kérdés nélkül fut, a fájlszerkesztés
   automatikusan elfogadott; a `git push`, a törlés és a `vercel` parancs továbbra is rákérdez).
4. Írd be ezt az egy sort:
   ```
   Olvasd el a START_PROMPT.md-t, és hajtsd végre.
   ```
   (Vagy másold be a `START_PROMPT.md` teljes tartalmát. Ugyanaz az eredmény.)

Innentől a Claude Code fázisról fázisra halad, és csak akkor áll meg, ha a döntésed kell.
A `docs/PROGRESS.md`-ben látod, hol tart. Ha a munkamenet megszakad, a `docs/SEGEDPROMPTOK.md`
„Folytatás” promptjával ott folytatja, ahol abbahagyta.

## Két pont, ahol te jössz (a Claude Code szól)

- **F2 után:** a landing élesíthető várólistával. Ekkor kell a Vercel, a domain és a kulcsok.
- **F3 után:** az árgyűjtőt élesben kell indítani. **Határidő: október 28.** A Black Friday
  (november 27.) előtt 30 nap saját ártörténet kell a „Valódi akció?” ítélethez.

A Claude Code ezeken a pontokon sem áll le, a következő fázissal folytatja.

## Fiókok, amik kellenek (nem kell előre, a Claude Code szól, mikor melyik)

1. **GitHub** — a kódnak
2. **Supabase** — adatbázis és belépés; két projekt (`jovetel-dev`, `jovetel-prod`), régió: **Frankfurt**
3. **Vercel** — hosting; kereskedelmi használathoz **Pro csomag** kell (kb. 20 USD/hó)
4. **Resend** — e-mail; a saját domaineden DNS-beállítással
5. **Upstash** — Redis a rate limithez
6. **Cloudflare** — Turnstile kulcsok (bot-védelem)
7. **PostHog** — EU régió
8. **Sentry** — hibakövetés
9. **Anthropic Console** — API-kulcs az AI-hoz (más szolgáltatóra is váltható)
10. **Affiliate hálózatok** — Awin, CJ, Dognet, Admitad publisher-fiókok

Amíg egy szolgáltatás nincs bekötve, a Claude Code helyi megoldással vagy valósághű mintaadattal
dolgozik tovább. A kulcsokat a `.env.local` fájlba te írod be. A Claude Code ezt a fájlt
szándékosan nem olvashatja.

## A képekről

A képeidet egy **képhely-rendszerbe** szerveztem (42 képhely: landing, kategóriák, onboarding,
ajándék-címzettek, alkalmak). A kód soha nem fájlnévre, hanem képhelyre hivatkozik. Ha jönnek a
partnerprogramok képei vagy saját képek, egy helyen cserélhetők, kódmódosítás nélkül
(`docs/SEGEDPROMPTOK.md` → „Képek cseréje”).

- A képek 736 px szélesek, ezért a design keretezett, osztott elrendezést használ, nem teljes
  szélességű fotót.
- Pinterest-képek, tehát szerzői jogvédettek. Fejlesztéshez és bemutatóhoz jók. Nyilvános
  élesítéskor a build megáll, hacsak le nem cseréled őket, vagy tudatosan be nem állítod az
  `ALLOW_DEV_IMAGES=true` értéket.
