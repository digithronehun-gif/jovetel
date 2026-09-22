# JóVétel — Koncepció v2: a személyes vásárlási társ

> Megjegyzés: a felületen és a kampányokban semleges, tényszerű nyelvet használunk a kereskedőkről (ők a partnereink). Részletek: CLAUDE.md 6. vasszabály.

*2026-09-22 · A „build-strategia-es-claude-code-promptok” dokumentum pozicionálását és ütemezését felülírja; a technikai vasszabályok változatlanok.*

---

## Egy mondatban

Nem AI-kereső és nem árösszehasonlító, hanem **ingyenes tagság egy vásárlási társhoz, ami emlékszik rád**: ismeri a bőrödet, a szeretteidet és a dátumaikat, figyeli az árakat, és szól, amikor vásárolnod kell. Mindezt magyar boltok valódi áraival. Első vertikum: szépségápolás és ajándék.

---

## Mit változtatnék és miért

### 1. Pozicionálás: tanácsadó, akinek memóriája van, nem árösszehasonlító

- A „hol a legolcsóbb?” kérdés az Árukeresőé (~10 M látogatás/hó). Ott nem nyerünk.
- A „mit vegyek?” kérdésre a Google AI Mode és a ChatGPT ingyen, magyarul válaszol.
- Van viszont valami, amit egyik sem tud: **emlékezni rád**. A ChatGPT nem szól tíz nappal anyukád névnapja előtt három, most is raktáron lévő, 15 ezer forint alatti ötlettel magyar boltokból.
- Affiliate-oldalról is ez a jobb pozíció. A PDF szerint a Notino a Google/Bing CSS-t (árösszehasonlítást) csak előzetes írásos engedéllyel engedi, a Lookfantastic pedig tartalompartnernek 5%-ot fizet, más partnertípusnak 1%-ot. **A tartalom- és tanácsadó-kiadó magasabb jutaléksávba kerül, mint az árösszehasonlító.**
- Az árösszehasonlítás ettől még megmarad, csak támogató funkcióként: minden termékoldalon több bolt, teljes költség szerint.

### 2. A gazdaságtan: a regisztrált tag a termék

A PDF base modellje szerint egy névtelen látogató 12 hónapos értéke **kb. 11 Ft**.

Egy regisztrált tag, aki évente 1–2 jóváhagyott rendelést indít nálunk (18 000 Ft kosár × 6,5% jutalék × 85% jóváhagyás): **kb. 1 000–2 000 Ft/év** [BECSLÉS].

**Ez 90–180-szoros különbség.** 50 000 aktív tag nagyjából 50–100 M Ft/év, vagyis annyi, amennyit a PDF 1 millió havi látogatásra számol (~99 M Ft). Ötvenezer embert megtartani sokkal reálisabb, mint egymillió látogatót havonta idehozni.

**Következmény:** minden funkció két kérdésre felel. Hoz-e regisztrációt? És ad-e okot a visszatérésre?

**North Star mutató: aktív vásárlási szándékok száma.** Ide tartozik minden árfigyelő, elmentett szerettünk dátummal, polcon lévő termék utántöltési dátummal és kívánságlista-tétel. Mindegyik egy jövőbeli vásárlási alkalom, amikor mi szólunk először.

### 3. AI: kevesebb csevegés, több vezetett folyamat

- Üres chatablaknál a felhasználó nem tudja, mit írjon, nekünk pedig minden kör pénzbe kerül. A PDF konzervatív szcenáriójában az AI a bevétel kb. 64%-át elviszi.
- Az elsődleges belépés az **Ajándék-varázsló** (Kinek? → Alkalom → Keret → Érdeklődés, chipekkel) és a **Bőrprofil** legyen. Egy vezetett folyamat egy olcsó LLM-hívás, és az is cache-elhető.
- A chat megmarad, de másodlagos felület.
- **Az „AI MATCH 94%” jelvény menjen ki.** Álpontosság: egy AI által kitalált szám, amit a felhasználó nem ellenőrizhet, jogilag is gyenge pont. Helyette **„Miért neked”** címkék jönnek, determinisztikusan az adatbázisból: „Zsíros bőrre” · „Illatmentes” · „A kereteden belül” · „30 napja nem volt ilyen olcsó”. Ezt nem lehet hallucinálni, és ingyen van.

### 4. Fókusz: szépségápolás és ajándék, következetesen

- A mockupban Sony fejhallgató, Apple Watch és Nike szerepel: tech és sneaker, ahol 0,5–4% a jutalék és az Árukereső a hazai pálya. Ki kell cserélni szépségápolási és ajándéktermékekre.
- A mockupban MediaMarkt- és Zalando-logó is látszik, pedig a PDF szerint **nincs magyar affiliate-programjuk**. Olyan bolt logója, ahová nem tudunk követett linket adni, félrevezető, és védjegyhasználati kockázat is.
- A mockup termékoldalán kitalált nevű vélemények vannak („Kata S., Ellenőrzött vásárló”). Élesben kizárólag licencelt forrásból, forrásmegjelöléssel jelenhet meg vélemény.
- Az „Egyéb” moodboard (divat, otthon, kert, utazás) nem külön vertikum az induláskor, hanem az **ajándék-kategória képi világa**: Bonami, Modivo, Libri termékek ajándéklistákon.

### 5. Időzítés: a Black Friday-hez kell igazodni

- Black Friday 2026: **november 27.** A „Valódi akció?” ítélethez 30 napos saját ártörténet kell, ezért az árgyűjtőnek **legkésőbb október 28-án** futnia kell.
- Az építés folyamatos, fázisonként halad (`START_PROMPT.md`). A cél, hogy a Black Friday előtt legyen idő SEO- és tartalomfelfutásra, és karácsony előtt működjön a teljes app.
- **Az árgyűjtő a 4. fázis (F3)**, jóval a felhasználói felület előtt. Az adat csendben gyűlik, amíg a többi épül.
- A PDF 30 napos validációja párhuzamosan fut: a landing várólistával már az F2 után élesíthető, a küszöbszámokat (waitlist ≥300 stb.) élesben mérjük.

### 6. Márka és design

- **„YourShop – Smarter Shopping. Together.”** generikus, angol, nem védjegyezhető, és semmit nem mond egy magyar vásárlónak. **„JóVétel”** magyar, jelent valamit, és emlékezetes. Szlogenjavaslat: *„Rávilágítunk a jó vételre.”*
- A mockup sötétkék–elektromos kék palettája és a ✦ szikra ikon az általános „AI-app” vizuális nyelv. A moodboardod egészen más: meleg, napfényes, editorial, prémium. **A moodboard győz.**

---

## A hat funkció, ami erőssé teszi

| # | Funkció | Mit csinál | Miért erős | Munka |
|---|---|---|---|---|
| 1 | **Ajándék-radar („Szeretteim”)** | Elmented a szeretteidet (becenév + dátumok + érdeklődés + keret). A névnapot a keresztnévből automatikusan felveszi („Anyu – Katalin” → nov. 25.). 10 nappal előtte e-mail 3 raktáron lévő ötlettel. **Ajándék-előzmény:** „tavaly ezt adtad neki”, így nem lesz ismétlés. | Évi 2–3 magas szándékú alkalom szerettenként. A névnap tipikusan magyar: globális szereplő nem építi meg. | 3–4 nap |
| 2 | **Szépségpolc + utántöltés-emlékeztető** | A használt termékeidet felteszed a polcodra. A kiszerelésből és a kategória átlagos fogyásából becsüljük, mikor fogy el („30 ml szérum ≈ 10 hét”), és előtte szólunk a legjobb aktuális árral. Egy kikattintás utáni következő látogatáskor megkérdezzük: *„Megvetted? Tedd a polcodra.”* | A beauty az egyetlen kategória, ahol a vásárlás magától ismétlődik. Ez ismétlődő jutalékbevétel. | 2–3 nap |
| 3 | **Megosztható kívánságlista + „Lefoglalom”** | Listát készítesz („Karácsonyra ezt szeretném”), linkkel megosztod. A családtag látja a legjobb aktuális árakat, és **titokban lefoglalhat** egy tételt. A lista gazdája nem látja, ki mit foglalt, a többi látogató viszont látja, hogy „már valaki megveszi”. | Beépített virális hurok: minden megosztott lista vásárlási szándékkal érkező látogatókat hoz. A foglaláshoz regisztráció kell, így az ajándékozó is tag lesz. | 2–3 nap |
| 4 | **„Valódi akció?” ítélet + árfigyelő** | Minden terméknél 30 napos ártörténet és egyértelmű ítélet: *Valódi akció* / *Szokásos ár* / *Most drágább*. Árfigyelő célárral. | A bizalom kézzelfogható bizonyítéka és a Black Friday-kampány motorja. Megosztható tartalom is („Valódi ez a Black Friday-akció?”). | 2 nap (ha az adat gyűlik) |
| 5 | **Vezetett AI tanácsadó** | Ajándék-varázsló és bőrprofil chipekkel. Az AI kizárólag a kereső által adott jelöltek közül rendez, és rövid indoklást ír az adatbázis tényeiből. Szabad chat másodlagos felületként. | A tanácsadói ígéret olcsón, kontrolláltan, hallucináció nélkül. | 4–5 nap |
| 6 | **„Neked most” irányítópult** | A belépés utáni kezdőlap: közelgő alkalmak, áresések a figyelt termékeiden, fogyóban lévő polctermékek, új ajánlatok a profilodhoz. | Ez a „miért jöjjek vissza” képernyő: minden mentett szándék itt ér össze. | 2 nap |

**Egy okos architekturális döntés:** a **Lista** legyen egyetlen adatmodell-primitív, ami három dolgot szolgál ki: kívánságlista, szerkesztői ajándékútmutató és (a 2. hónapban) creator-kollekció. Ha az első hónapban jól épül meg, a 2. hónap creator-programja olcsó bővítés lesz, nem új rendszer.

---

## A felhasználói út

### 1. Landing oldal (nyilvános)
- **Hero:** nagy, napfényes editorial kép, szlogen, egy mondat ígéret, két gomb: *„Kezdjük — ingyenes”* és *„Ajándékötlet regisztráció nélkül”*.
- **Három ígéret:** Valódi árak (30 napos ártörténet) · Emlékszik rád (profil, szeretteid, polcod) · Nem a jutalék rangsorol.
- **Élő bemutatók:** Ajándék-radar névnappal; „Valódi akció?” grafikon; megosztott kívánságlista foglalással.
- **Bizalom:** „Így rangsorolunk”, affiliate-tájékoztató, AI-jelölés. GYIK és záró CTA.
- **Indulás előtti mód:** ugyanez a landing waitlist-űrlappal (kapcsolóval váltható).

**Fontos:** a tartalom ne legyen regisztráció mögé zárva. Termékoldal, keresés, ajándékútmutató és varázsló regisztráció nélkül is működik (SEO és alacsony súrlódás). A regisztráció **az érték pillanatában** jön: „Szólj, ha olcsóbb lesz”, „Emlékeztess anyu névnapjára”, „Mentsd el a listát”.

### 2. Regisztráció és 60 másodperces onboarding
Belépés magic linkkel vagy Google-lel, utána öt képernyő, mindegyik kihagyható:
1. Mire használnád? (Szépségápolás / Ajándékozás / Mindkettő)
2. Bőrprofil: bőrtípus, fő gond, kerülendő összetevők
3. Kényelmes árkeret sávokban
4. Kiknek szoktál ajándékot venni? 1–3 szerettünk becenévvel és keresztnévvel (a névnap automatikusan bekerül)
5. Értesítések: szolgáltatási üzenetek (árfigyelő, emlékeztető) és marketing-hírlevél **külön** hozzájárulással

A végén azonnal a „Neked most” irányítópult jön, már kitöltve.

### 3. Az irányítópult („Az én JóVételem”)
Mobilon alsó fülsor, desktopon keskeny oldalsín (nem nehéz SaaS-oldalsáv):
- **Neked most:** a személyre szabott kezdőlap
- **Felfedezés:** keresés, Ajándék-varázsló, AI tanácsadó
- **Szeretteim:** ajándék-radar, dátumok, ajándék-előzmény
- **Listáim:** kívánságlisták, megosztás, foglalások
- **Polcom:** szépségpolc, utántöltés, árfigyelők
- **Beállítások:** profil, értesítések, hozzájárulások, adatexport és fióktörlés (GDPR)

---

## Design irány (a moodboardból)

**Koncepció: „Napfény”.** A moodboard közös nevezője a fény: meleg, szórt napfény, levélárnyék a bőrön, borostyán fénysáv az arcon, esti fényfüzér a kertben. Az AI szimbóluma ezért **fénysugár, nem szikra**: az AI „rávilágít” a jó vételre. Ez összeköti a szlogent, a képi világot és a funkciót.

**Paletta:**

| Szerep | Szín | Hex |
|---|---|---|
| Alap (papír) | Meleg homok-fehér | `#F6F1EA` |
| Felület | Kő | `#EAE0D2` |
| Szöveg | Eszpresszó (a sötétkék helyett) | `#2A201A` |
| Fő akcentus | Napfény-borostyán | `#D9822B` |
| Meleg kiegészítő | Barackfény | `#F0C3A4` |
| Hideg ellenpont | Égkék (az „Egyéb” moodboard egéből) | `#A9CFE0` |

Az égkék ellenpont tudatos döntés. A „krém + szerif + terrakotta” kombináció mára az AI-generált design egyik kliséje. A hideg ellenpont (napfény és égbolt) frissebbé és felismerhetőbbé teszi a márkát. Sötét módban meleg szénfekete alap (`#1B1613`) és ugyanez a borostyán akcentus.

**Tipográfia:** editorial display szerif a címekhez (pl. Bodoni Moda vagy Cormorant: divatmagazin-hangulat), letisztult groteszk a szövegtörzshöz (pl. Manrope). **Magyar buktató:** sok betűtípus hibásan rajzolja az „ő” és „ű” betűt (másik fontból pótolja), ezért minden jelölt fontot a „Tűzőgép, őszi fűszál” próbamondattal kell tesztelni. Az árak táblázatos számjegyekkel (tabular numerals).

**Képi szabályok:**
- Szépségápolás: közeli, fénylő bőr, szórt napfény, levélárnyék, meleg tónusok.
- Ajándék és otthon: esti meleg fény, textúrák, emberi jelenlét.
- Termékfotó: meleg homokszínű háttéren, egységes kivágással.
- **Jogi megjegyzés:** a moodboard képei Pinterest-letöltések, élesben nem használhatók. A saját márkaképeket AI-generálással (pl. Higgsfield, ami be van kötve) vagy licencelt stockból kell előállítani. Termékkép csak a feed licencfeltételei szerint.

**Felületi szabályok:** nagy lekerekítés (20–28 px), meleg árnyalatú lágy árnyék, bő fehér tér. A landingen editorial felső navigáció; mikro-animációként lassan vándorló fény a hero képen (`prefers-reduced-motion` esetén kikapcsolva).

---

## Építési sorrend

Egyetlen folyamatos építés 14 fázisban, a Claude Code saját tempójában (részletek, elfogadási kritériumok: `START_PROMPT.md`):

| Fázis | Tartalom |
|---|---|
| F0 | Projekt-alap és design rendszer (tokenek, betűk, komponensek, képhelyek, `/styleguide`) |
| F1 | Adatbázis, seed, névnaptár |
| F2 | Landing, várólista, jogi oldalak, hozzájárulás → **élesíthető várólistával** |
| F3 | Feed-import és napi árgyűjtő → **élesben indítandó, legkésőbb október 28.** |
| F4 | Keresés, kategóriák, útmutatók |
| F5 | Termékoldal, teljes költség, ártörténet, „Valódi akció?” |
| F6 | Követett kattintás, jelölés, konverziók |
| F7 | Belépés, onboarding, beállítások |
| F8 | App-keret, listák, megosztás, foglalás, árfigyelő |
| F9 | Szeretteim, alkalmak, értesítési motor |
| F10 | Ajándék-varázsló és AI réteg |
| F11 | „Neked most” és Szépségpolc |
| F12 | Admin, SEO, analitika |
| F13 | Indulás előtti átvizsgálás |

**Amit szándékosan kihagyunk az egyszerűség és a gyorsaság miatt:** vektoros keresés és embeddingek (10–50 ezer terméknél az FTS + trigram elég), fuzzy termékösszevonás (a szépségápolási termékeknek jellemzően van EAN-ja, ez elég), teljes admin-dashboard (Supabase Studio + minimál admin).

**Indulási kampányok:**
- **„Karácsonyi kívánságlista”** (november eleje): a lista + foglalás funkció viszi.
- **„Black Friday: valódi akció?”** (november 20–30.): a „Valódi akció?” ítélet viszi, TikTokra tökéletes formátum.
- **„Mikulás és névnap-naptár”** (december): az ajándék-radar viszi.

---

## 2. hónap: a növekedési motor

1. **Creator-kollekciók (a magyar LTK/ShopMy).** Magyarországon nincs ilyen szolgáltatás. 20 meghívott beauty mikro-creator (5–50 ezer követő) saját kollekciót épít a JóVételen, a bio-linkjük oda mutat, és a jutalékból részesednek. Ez oldja meg a PDF legnagyobb problémáját, az akvizíciót: a forgalmat a creatorok hozzák. A Lista-primitív már megvan, ezért ez bővítés, nem új rendszer. Az első hónapokban a kifizetés kézi, havi [JOGÁSZ: szerződés, számlázás, adó].
2. **„TikTokon láttam” kereső:** bemásolt TikTok-linkből a videó címe/leírása alapján az AI kinyeri a terméknevet, és megmutatja, hol kapható itthon.
3. **Dupe-párok:** 20–30 kézzel kurált „drága → hasonló, olcsóbb” páros szerkesztői tartalomként (a feedekből gyakran hiányzik az összetevőlista, ezért ezt nem algoritmus csinálja).
4. **Web push / PWA** az árfigyelőhöz és az emlékeztetőkhöz.

---

## Kockázatok

| Kockázat | Kezelés |
|---|---|
| Az affiliate-programok nem hagyják jóvá az „épülő” oldalt | A landing (F2) és 10 kurált ajándékútmutató (F4) minél hamarabb éljen. A programok élő, minőségi oldalt akarnak látni. |
| Szeretteink adatai harmadik személy személyes adatai | Adatminimalizálás: becenév + keresztnév + dátum, vezetéknév nincs; egyértelmű tájékoztatás [JOGÁSZ] |
| Bőrápolási tanács egészségügyi állításnak minősülhet | Kozmetikai szint, nincs diagnózis vagy gyógyító állítás; „bőrgyógyászati panasznál fordulj orvoshoz” jelzés |
| A moodboard képei szerzői jogvédettek | Saját AI-generált vagy licencelt képek, termékkép csak feedből |
| E-mail hozzájárulás | A szolgáltatási üzenet (saját árfigyelő, emlékeztető) és a marketing (hírlevél) külön hozzájárulás |
| Az építés elhúzódik | A sorrend úgy van felépítve, hogy a legsürgősebb rész (landing várólistával, árgyűjtő) a legelején készüljön el; a vasszabályok nem vághatók |
