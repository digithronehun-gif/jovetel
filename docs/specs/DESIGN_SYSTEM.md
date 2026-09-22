# DESIGN_SYSTEM — „Napfény”

> A JóVétel vizuális nyelve. Minden komponens innen veszi a döntéseit.
> A `/styleguide` oldal ennek az élő megjelenítése: minden token és komponens minden állapotban.

---

## 1. Koncepció

A moodboard közös nevezője a **fény**: szórt napfény, levélárnyék a bőrön, borostyán fénysáv
az arcon, esti fényfüzér a kertben. Ebből három döntés következik:

1. **Az AI szimbóluma a fénysugár**, nem szikra. Az AI „rávilágít” a jó vételre. Ez összeköti a
   szlogent, a képi világot és a funkciót.
2. **Meleg alapok, egy hideg ellenpont.** Homok, eszpresszó, borostyán, és ellenpontként égkék
   (az „Egyéb” moodboard egéből). Ettől lesz felismerhető, és nem a megszokott „krém + terrakotta”.
3. **Editorial, nem SaaS.** Magazinszerű tipográfia, bő tér, nagy képek keretben. Az
   alkalmazásfelület is nyugodt: kevés keret, kevés árnyék, világos hierarchia.

**Kerülendő:** sötétkék + elektromos kék paletta, ✦ szikra/„sparkles” ikon, lila–kék átmenet,
„AI MATCH %” jelvény, nehéz bal oldali SaaS-menü, mindenhol ugyanaz a kártya-árnyék, emoji mint ikon.

---

## 2. Színtokenek

A tokenek CSS változók a `:root`-on (világos) és a sötét módban újradefiniálva
(`@media (prefers-color-scheme: dark)` és `[data-theme="dark"]`). A Tailwind konfiguráció ezekre
a változókra hivatkozik (`bg-paper`, `text-ink`…). **Komponensben literál hex tilos.**

| Token | Világos | Sötét | Használat |
|---|---|---|---|
| `--paper` | `#F6F1EA` | `#17120F` | Oldal-háttér |
| `--surface` | `#FFFCF7` | `#211A15` | Kártyák, panelek, lapok |
| `--stone` | `#EAE0D2` | `#2B231D` | Csendes kitöltés, chip-háttér, skeleton |
| `--line` | `#DDD0BE` | `#3A3028` | Elválasztók, keretek |
| `--ink` | `#2A201A` | `#F3EBE0` | Elsődleges szöveg, elsődleges gomb háttere |
| `--ink-muted` | `#6B5A4C` | `#B9A999` | Másodlagos szöveg |
| `--ink-subtle` | `#8A7A6C` | `#8F8072` | Placeholder, ikon, nagy méretű segédszöveg (min. 18 px) |
| `--amber` | `#D9822B` | `#E8994A` | **Csak dekoráció:** fénysáv, ikon-kitöltés, kiemelő pont. **Szövegre tilos** (2,6:1) |
| `--amber-deep` | `#A8581A` | `#F0AE68` | Kiemelt szöveg, link, másodlagos gomb, fókuszgyűrű |
| `--peach` | `#F0C3A4` | `#4A3226` | Meleg kitöltés (kiemelt kártya, AI-válasz háttér) |
| `--sky` | `#A9CFE0` | `#2D4A57` | Hideg ellenpont kitöltés (bizalom, info, „Így rangsorolunk”) |
| `--sky-deep` | `#2F6C87` | `#9CC8DC` | Szöveg hideg akcentussal |

**Szemantikus tokenek (a „Valódi akció?” ítélethez és állapotokhoz):**

| Token | Világos szöveg / háttér | Sötét szöveg / háttér | Jelentés |
|---|---|---|---|
| `--deal` / `--deal-bg` | `#3F6B3A` / `#E3EBD9` | `#A9CC98` / `#22301F` | Valódi akció, siker |
| `--usual` / `--usual-bg` | `#6B5A4C` / `#EFE7DB` | `#CDBFB0` / `#2B231D` | Szokásos ár, semleges |
| `--pricier` / `--pricier-bg` | `#9C3F2C` / `#F5DFD6` | `#F0A08C` / `#3A231C` | Most drágább, hiba |

Ellenőrzött kontrasztarányok (WCAG AA ≥ 4,5 : 1 szövegre): ink/paper 14,2 · muted/paper 5,9 ·
amber-deep/paper 4,6 · fehér/amber-deep 5,2 · deal 5,1 · usual 5,4 · pricier 5,2 (sötétben mind ≥ 7).

**Gombok:**
- Elsődleges: háttér `--ink`, szöveg `--paper`. Hover: enyhe borostyán fény a gomb alján (`box-shadow: 0 6px 20px -8px var(--amber)`).
- Másodlagos: keret `--line`, szöveg `--ink`, háttér `--surface`.
- Kiemelt (ritkán, pl. „Megnézem a boltban”): háttér `--amber-deep`, szöveg fehér.
- Szöveges: `--amber-deep`, aláhúzás hoverre.

---

## 3. Tipográfia

| Szerep | Betűtípus | Használat |
|---|---|---|
| Display | **Bodoni Moda** (400–700, dőlt is) | Főcímek, szekciócímek, nagy számok a landingen. **Csak ≥ 28 px.** |
| Szöveg és UI | **Manrope** (400–700) | Minden más: szöveg, gomb, űrlap, ár |

```ts
// app/fonts.ts — a latin-ext KÖTELEZŐ, a latin készletből hiányzik az ő és ű
import { Bodoni_Moda, Manrope } from 'next/font/google'
export const display = Bodoni_Moda({ subsets: ['latin', 'latin-ext'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' })
export const sans = Manrope({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' })
```

**Próbamondat minden betűtípus-változtatás után:** „Tűzőgép, őszi fűszál: ŐŰ őű.” (a `/styleguide` tetején).

**Skála (rem, 16 px alap), mobil → desktop:**
| Token | Mobil | Desktop | Font | Súly / sorköz |
|---|---|---|---|---|
| `display-xl` | 2.5 | 4.5 | Display | 400, 1.02, `-0.02em` |
| `display-l` | 2.0 | 3.25 | Display | 400, 1.05 |
| `display-m` | 1.75 | 2.25 | Display | 500, 1.1 |
| `title` | 1.25 | 1.5 | Sans | 700, 1.25 |
| `body-l` | 1.0625 | 1.125 | Sans | 400, 1.6 |
| `body` | 1.0 | 1.0 | Sans | 400, 1.55 |
| `small` | 0.875 | 0.875 | Sans | 500, 1.45 |
| `eyebrow` | 0.75 | 0.8125 | Sans | 700, nagybetű, `0.14em` betűköz |
| `price-l` | 1.75 | 2.0 | Sans | 700, `tabular-nums` |
| `price` | 1.0625 | 1.125 | Sans | 700, `tabular-nums` |

**Szabályok:**
- A display címekben **egy** dőlt kiemelés lehet (a hangsúlyos szó), ez a márka tipográfiai gesztusa:
  „**Rávilágítunk** *a jó vételre.*”
- Árak mindig Manrope 700 + `font-variant-numeric: tabular-nums`, ezres tagolás nem törő szóközzel.
- Szöveg szélessége max. 65 karakter; címeken `text-wrap: balance`.

---

## 4. Tér, forma, árnyék

- **Térköz-skála (px):** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128. Oldalsó margó: mobil 16, tablet 24, desktop 32.
- **Tartalomszélesség:** landing 1200 px; app 1080 px; szöveges oldalak 680 px.
- **Töréspontok:** 390 (alap) · 640 · 900 · 1200.
- **Lekerekítés:** `--r-sm 10px` (chip, input) · `--r-md 16px` (gomb, kis kártya) · `--r-lg 24px` (kártya, kép) · `--r-xl 32px` (hero kép, lap). Gomb: teljesen lekerekített (pill).
- **Árnyék (meleg árnyalatú, takarékosan):**
  - `--shadow-soft: 0 1px 2px rgb(42 32 26 / .06), 0 8px 24px -12px rgb(42 32 26 / .18)` — kiemelt kártya
  - `--shadow-lift: 0 18px 48px -20px rgb(120 70 30 / .35)` — lebegő elem (lap, modal)
  - Alap kártyán **nincs** árnyék, csak `--surface` háttér és `--line` keret. Az árnyék az emelést jelzi, nem dísz.

---

## 5. Aláíró elemek

### 5.1 Fénysáv (`<LightLeak />`)
Lágy, átlós borostyán–barack radiális fény, ami a hero képen és az AI-válaszok háttere mögött
jelenik meg. Implementáció: két egymásra tett `radial-gradient` (`--amber` 35% → átlátszó,
`--peach` 25% → átlátszó) `mix-blend-mode: soft-light`-tal a képen, `multiply`-jal a papíron.
Mozgás: 18 másodperces, nagyon lassú eltolás és halványulás (`transform`, `opacity`).
`prefers-reduced-motion` esetén statikus.

### 5.2 Levélárnyék (`<LeafShadow />`)
Finom, elmosott levélárnyék-textúra (SVG maszk, 6–10% átlátszóság) a landing szekcióinak
hátterén és az üres állapotokon. A moodboard „napfény átszűrődik a leveleken” élménye.
Egyetlen SVG, generálva (nem kép); sötét módban 4%.

### 5.3 Fénysugár ikon (`<RayIcon />`)
Az AI jele: egy kis félkör (napkorong) három kifelé mutató sugárral, 1,5 px vonalvastagság,
`--amber` kitöltés a korongon. Méretek: 16 / 20 / 24 px. Egyedi SVG komponens. Minden
AI-funkció (varázsló, tanácsadó, indoklás) ezt használja.

### 5.4 Szóvédjegy (logó)
„JóVétel” Bodoni Moda 500-ban, ahol az **„ó” ékezete egy borostyán fénysugár** (a `RayIcon`
egyetlen sugara, dőlten). Két változat: teljes szóvédjegy és „J” monogram fénysugárral (favicon,
app-ikon, értesítés-ikon). SVG-ként készül, `currentColor` + `--amber` a sugárra.

---

## 6. Komponensek

Mind a `components/ui` (alap) vagy `components/app` (domain) mappában, mind szerepel a `/styleguide`-on
összes állapotával (alap, hover, fókusz, letiltott, töltés, hiba, üres).

**Alap:** `Button` (primary, secondary, accent, ghost, link; sm/md/lg; ikonnal; loading) ·
`IconButton` · `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `RadioCards` (nagy
választókártyák az onboardinghoz) · `Chip` (választható, eltávolítható) · `Tag` · `Badge` ·
`Tabs` · `Sheet` (mobil alsó lap) / `Dialog` · `Toast` · `Tooltip` · `Skeleton` · `Avatar`
(monogram: kezdőbetű Bodoni Moda-ban, `--peach` háttéren) · `Stepper` · `Slider` (keret-sávokkal) ·
`EmptyState` (képhely + cím + szöveg + gomb) · `SectionHeader` (eyebrow + display cím + bevezető).

**Domain:**
| Komponens | Tartalom és szabály |
|---|---|
| `ProductCard` | kép (4:5, `--stone` háttér, `object-fit: contain`), márka (small, muted), név (max. 2 sor), `PriceBlock`, `VerdictBadge` (ha van), max. 3 `WhyTag`, szív (listára). Változatok: rács, sor, kompakt. |
| `PriceBlock` | teljes ár (price-l / price), bontás („+ 990 Ft szállítás”), bolt neve, „ár ellenőrizve 2 órája”. **Az ár csak ebből a komponensből jelenhet meg.** |
| `OfferRow` | bolt · ár · szállítás · teljes ár · szállítási idő · készlet · [Megnézem a boltban] · `Disclosure` |
| `VerdictBadge` | Valódi akció / Szokásos ár / Most drágább / Gyűjtjük (szemantikus tokenek, ikon + szöveg, soha csak szín) |
| `PriceHistoryChart` | Recharts vonal, 30/90 nap, `--ink` vonal, `--amber` pont a jelenlegi áron, halvány rács, tooltip dátummal és árral, a min30 szaggatott vonallal jelölve |
| `WhyTag` | kis chip `--peach` háttérrel, `RayIcon` nélkül (determinisztikus, nem AI) |
| `AiExplanation` | `RayIcon` + 1–2 mondat, `--peach` 40%-os háttér `LightLeak`-kel, alatta `AiLabel` |
| `AiLabel` | „Mesterséges intelligenciával beszélsz. Az árakat és a készletet az adatbázisból mutatjuk.” |
| `Disclosure` | „Partnerlink: ha vásárolsz, jutalékot kaphatunk. Ez nem befolyásolja a sorrendet.” small, muted, link az „Így rangsorolunk” oldalra |
| `LovedOneCard` | Avatar, becenév (title), kapcsolat, következő alkalom + visszaszámláló pill („10 nap”), keret |
| `OccasionTimeline` | függőleges idővonal, hónapok szerint csoportosítva, a mai nap jelölve |
| `ShelfItem` | termékkép, név, kiszerelés, folyamatjelző (`--amber` → `--pricier` az utolsó 10 napban), „kb. 12 nap múlva fogy el”, műveletek |
| `ListCard` | borító (2×2 termékkép-kollázs vagy képhely), cím, tételszám, alkalom, megosztás állapota |
| `ReserveButton` | Lefoglalom / Lefoglaltad (visszavonás) / Már valaki megveszi (letiltva) |
| `WizardStep` | kérdés (display-m), chipek, képhely-kép a címzett/alkalom kártyákon |
| `NotificationCard` | a „Neked most” kártyái: ikon, cím, egy sor kontextus, fő művelet |
| `BottomTabBar` / `SideRail` | 5 fül; az aktív fülnél `--amber` pont az ikon fölött, nem teljes kitöltés |

---

## 7. Elrendezési minták

**Landing:** editorial, váltakozó kép–szöveg sávok. Mivel a jelenlegi képek 736 px szélesek,
**nincs teljes szélességű fotós hero**: a kép keretezett panel (`--r-xl`), legfeljebb 560 px
széles desktopon, a szöveg mellette. A szekciók közötti ritmus: 96 px desktop, 64 px mobil.
A hero első képernyőjén látszik a cím, az alcím, mindkét gomb és a kép egy része.

**App:** nyugodt, egyoszlopos mobilon; desktopon a tartalom 1080 px, a „Neked most” két oszlop
(bal: kártyafolyam, jobb: közelgő alkalmak idővonala). Keret és árnyék csak ott, ahol az elemnek
el kell válnia.

**Onboarding és belépés:** osztott képernyő desktopon (kép balra 45%, űrlap jobbra), mobilon kép
nélkül vagy kis fejléc-képpel.

---

## 8. Képhelyek (a 7. vasszabály megvalósítása)

**Forrás:** `src/content/brand/assets.manifest.json`: `assets` (minden kép: id, src, méret,
tájolás, magyar alt-szöveg, domináns szín, elmosott előnézet, forrás, licenc) és `slots`
(képhely → képazonosítók rangsorolt listája).

**API (`src/lib/assets`):**
```ts
getSlotImage(slot: SlotId, opts?: { orientation?: 'portrait' | 'landscape' }): BrandImage
getSlotImages(slot: SlotId, count: number): BrandImage[]
assertLicensedForProduction(): void // build közben fut
```
- A képhely a listája **első** olyan elemét adja vissza, amelynek licence az aktuális környezetben
  engedélyezett (production: `own` | `licensed` | `partner` érvényes `validUntil`-lal; fejlesztésben
  és `ALLOW_DEV_IMAGES=true` mellett a `moodboard-dev-only` is).
- Megjelenítés mindig `next/image`-dzsel: `placeholder="blur"` a manifest `blurDataURL`-jével, a
  konténer háttere a `dominantColor`, `sizes` pontosan megadva, `alt` a manifestből.
- **Méretkorlát:** a jelenlegi képek 736 px szélesek, ezért legfeljebb ~560 CSS px szélesen
  jelenjenek meg (retina kijelzőn is éles). Nagyobb helyre csak új, nagyobb felbontású kép kerülhet.

**Csere (saját, licencelt vagy partnerkép):** új elem a manifestbe `source`, `license`, opcionálisan
`partnerProgramId` és `validUntil` mezővel, és az azonosítója a képhely listájának elejére kerül.
Kódot nem kell módosítani. A partnerprogramok kampányképei (bannerek) lejárati dátummal érkeznek;
lejárt kép automatikusan kiesik.

**`pnpm check:assets`:** kiírja, melyik képhely használ még `moodboard-dev-only` képet, és hol.
Production buildben hibával leáll, ha van ilyen, és nincs `ALLOW_DEV_IMAGES=true`.

**Képi irány új képekhez:** szépségápolás: közeli, fénylő bőr, szórt napfény, levélárnyék, meleg
tónusok. Ajándék és otthon: esti meleg fény, textúrák, emberi jelenlét. Termékfotó: meleg
homok (`--stone`) háttéren, egységes kivágással. Kerülendő: hideg kék stúdiófény, steril fehér háttér.

---

## 9. Mozgás

- Időtartamok: 150 ms (hover, fókusz) · 250 ms (lap, dialog) · 400 ms (oldalelem belépése).
  Görbe: `cubic-bezier(.2,.7,.2,1)`.
- **Egy összehangolt pillanat oldalanként**, nem szórt effektek: a landing heróján a fénysáv lassú
  vándorlása és a cím sorainak 60 ms-os lépcsőzött megjelenése; az app „Neked most” kártyáinak
  finom felúszása első betöltéskor.
- Minden elem nyugalmi állapotban is látható (nem `opacity: 0`-ról indul görgetésre várva).
- `prefers-reduced-motion: reduce` → minden animáció kikapcsolva, a fénysáv statikus.

---

## 10. Ikonok

`lucide-react`, 1,5 px vonalvastagság, 20 px alap. Egyedi: `RayIcon` (AI), szóvédjegy és monogram.
Bolt-logó csak a program engedélyével; alapértelmezésben a bolt neve szövegként jelenik meg.

---

## 11. Akadálymentesség

WCAG 2.2 AA: szövegkontraszt ≥ 4,5 : 1 · fókuszgyűrű mindenhol (2 px `--amber-deep`, 2 px eltolással) ·
érintési cél ≥ 44 × 44 px · állapot soha nem csak színnel (ikon + szöveg) · minden képen
magyar `alt` · űrlapmezőknek látható címke · hibaüzenet a mező alatt, `aria-describedby`-jal ·
billentyűzettel minden elérhető, a lapok és dialógusok fókuszcsapdával · `lang="hu"`.

---

## 12. A `/styleguide` oldal tartalma

Próbamondat (ő/ű) · színtokenek világos és sötét módban, kontrasztarányokkal · tipográfiai skála ·
térköz, lekerekítés, árnyék · aláíró elemek (fénysáv, levélárnyék, `RayIcon`, szóvédjegy) · minden
komponens minden állapotban · képhelyek rácsa a licenc jelölésével · egy teljes `ProductCard` →
`OfferRow` → `PriceHistoryChart` minta valósághű adattal. Production-ben 404.
