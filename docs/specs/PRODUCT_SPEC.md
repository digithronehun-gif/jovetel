# PRODUCT_SPEC — JóVétel V1

> Mit épít a V1, képernyőről képernyőre. A szövegek végleges kiinduló szövegek, nem helykitöltők.
> Stílus és komponensek: `DESIGN_SYSTEM.md`. Táblák: `DATA_MODEL.md`.

---

## 1. Összefoglaló

**Ígéret:** „Mondd el, kinek és mire keresel. Mi megmutatjuk, mi éri meg valóban, és szólunk,
amikor eljön az ideje.”

**Három pillér:**
1. **Valódi árak:** több magyar bolt, teljes költség (szállítással), saját 30 napos ártörténet.
2. **Emlékszik rád:** bőrprofil, szeretteid dátumokkal, szépségpolc, listák, árfigyelők.
3. **Átlátható:** nem a jutalék rangsorol, minden partnerlink jelölve, az AI nem talál ki árat.

**Fő személyek (persona):**
| Persona | Fő kérdés | Fő funkció |
|---|---|---|
| Ajándékozó (25–54) | „Mit vegyek neki 20 ezerből?” | Ajándék-varázsló, Szeretteim |
| Beauty-vásárló (18–44) | „Melyik illik a bőrömhöz, és hol a legjobb ár?” | Bőrprofil, Szépségpolc, termékoldal |
| Akcióvadász (minden kor) | „Valódi ez az akció?” | Valódi akció ítélet, árfigyelő |
| „TikTokon láttam” (16–34) | „Hol kapom meg itthon?” | Keresés, termékoldal (a „TikTok-link kereső” a 2. hónapban jön) |

**North Star:** aktív vásárlási szándékok száma (aktív árfigyelő + dátummal rendelkező szerettünk +
polcon lévő termék utántöltési dátummal + kívánságlista-tétel).

---

## 2. Oldaltérkép

| Útvonal | Kinek | Leírás |
|---|---|---|
| `/` | mindenki | Landing. Belépett felhasználót `/app`-ra irányít. |
| `/igy-rangsorolunk` | mindenki | A rangsorolás nyilvános leírása |
| `/rolunk` | mindenki | Rövid bemutatkozás |
| `/adatvedelem`, `/aszf`, `/impresszum`, `/affiliate-tajekoztato`, `/cookie` | mindenki | Jogi oldalak |
| `/kereses?q=` | mindenki | Keresés szűrőkkel |
| `/kategoria/[...path]` | mindenki | Kategóriaoldal |
| `/termek/[slug]` | mindenki | Termékoldal |
| `/ajandek` | mindenki | Ajándék-varázsló (belépés nélkül is) |
| `/utmutatok`, `/utmutatok/[slug]` | mindenki | Szerkesztői ajándék- és vásárlási útmutatók |
| `/l/[token]` | link birtokosa | Megosztott lista, foglalással |
| `/belepes` | vendég | Belépés / regisztráció (egy képernyő) |
| `/onboarding` | új tag | 5 lépéses profil |
| `/app` | tag | Neked most (irányítópult kezdőlap) |
| `/app/felfedezes` | tag | Keresés + varázsló + AI tanácsadó személyre szabva |
| `/app/szeretteim`, `/app/szeretteim/[id]` | tag | Ajándék-radar |
| `/app/listak`, `/app/listak/[id]` | tag | Kívánságlisták, foglalások |
| `/app/polc` | tag | Szépségpolc + árfigyelők |
| `/app/beallitasok` | tag | Profil, értesítések, hozzájárulások, adatok |
| `/admin/*` | admin | Üzemeltetés |
| `/go/[offerId]` | mindenki | Követett átirányítás a webshopba |

**Indulási mód:** `LAUNCH_MODE=waitlist|live`. Waitlist módban a landing gombjai a várólista-űrlapra
visznek, az `/app` és `/belepes` csak a `BETA_ALLOWLIST` e-mail címeinek érhető el.
A katalógus (keresés, termékoldal, útmutatók) waitlist módban is nyilvános, hogy a partnerprogramok
jóváhagyásához legyen élő, minőségi tartalom.

**Elv:** tartalom nincs regisztráció mögé zárva. A regisztráció az érték pillanatában jön
(„Szólj, ha olcsóbb lesz”, „Emlékeztess”, „Mentsd el”, „Lefoglalom”), és a belépés után a
felhasználó pontosan oda tér vissza, ahonnan elindult, a félbehagyott művelettel együtt
(`returnTo` + `pendingAction`).

---

## 3. Landing oldal (`/`)

Minden szekció képe képhelyből jön (lásd `DESIGN_SYSTEM.md` → Képhelyek).

### 3.1 Fejléc
Logó (JóVétel szóvédjegy) · Hogyan működik · Ajándékötletek · Így rangsorolunk · [Belépés] · **[Kezdjük el]**
Mobilon: logó + [Kezdjük el] + menü.

### 3.2 Hero — képhely: `landing.hero`
- Felcím (kis, nagybetűs): `SZEMÉLYES VÁSÁRLÁSI TÁRS`
- Főcím (display, dőlt kiemeléssel): **Rávilágítunk** *a jó vételre.*
- Alcím: „Mondd el, kinek és mire keresel. Megmutatjuk, mi éri meg valóban magyar boltokban,
  és szólunk, amikor eljön az ideje.”
- Elsődleges gomb: **Kezdjük el, ingyenes** → `/belepes` (waitlist módban: várólista-űrlap)
- Másodlagos gomb: **Ajándékötlet regisztráció nélkül** → `/ajandek`
- Bizalmi sor: „Ingyenes · Nem a jutalék rangsorol · Magyar boltok valódi árai”
- Elrendezés: osztott (szöveg balra, keretezett kép jobbra, a képen lassan vándorló fénysáv).
  Mobilon a kép a szöveg fölött, 4:5 arányban.

### 3.3 Három ígéret
| Cím | Szöveg |
|---|---|
| Valódi árak | Több magyar bolt egy helyen, szállítással együtt. Saját ártörténetünkből látod, valódi-e az akció. |
| Emlékszik rád | Tudja, milyen a bőröd, kiket ajándékozol és mikor. Nem kell mindig elölről kezdened. |
| Átlátható | Nem a jutalék dönti el a sorrendet. Minden partnerlinket jelölünk, és az AI nem talál ki árat. |

### 3.4 Élő bemutatók (három sáv, váltakozó oldalú kép–szöveg elrendezés)
1. **Ajándék-radar** (`landing.ajandekRadar`)
   Cím: „Anyu névnapja 10 nap múlva. Már van három ötleted.”
   Szöveg: „Mentsd el a szeretteidet. A névnapot a keresztnévből magunk kikeressük, és időben
   szólunk, raktáron lévő ötletekkel a kereteden belül.”
   Mini-demó: egy `LovedOneCard` („Anyu · Katalin · névnap: november 25.”) és 3 ötletkártya.
2. **Valódi akció?** (`landing.valodiAkcio`)
   Cím: „A 30 napos ár nem hazudik.”
   Szöveg: „Minden terméknél látod, hogyan alakult az ára. Ha valóban most a legolcsóbb, megmondjuk.
   Ha nem, azt is.”
   Mini-demó: `PriceHistoryChart` minta-adattal és `VerdictBadge` „Valódi akció”.
3. **Szépségpolc** (`landing.szepsegpolc`)
   Cím: „Mielőtt elfogy, szólunk.”
   Szöveg: „Tedd a polcodra, amit használsz. Kiszámoljuk, nagyjából mikor fogy el, és előtte
   megmutatjuk a legjobb aktuális árat.”
   Mini-demó: `ShelfItem` „C-vitaminos szérum, 30 ml · kb. 3 hét múlva fogy el”.

### 3.5 Kívánságlista (`landing.listak`)
Cím: „Karácsonyi lista, dupla ajándék nélkül.”
Szöveg: „Állítsd össze, oszd meg a családdal. Ők titokban lefoglalhatják, amit megvesznek, te pedig
meglepődhetsz.”

### 3.6 AI tanácsadó (`landing.ai`)
Cím: „Kérdezz úgy, mint egy barátodtól.”
Példa-chipek: „Ajándék a barátnőmnek 15 ezerből, szereti a parfümöket” · „Szérum zsíros bőrre
10 ezer alatt” · „Mit vegyek anyák napjára?”
Kis szöveg: „Mesterséges intelligenciával beszélsz. Az árakat és a készletet mindig az
adatbázisból mutatjuk.”

### 3.7 Bizalom (`landing.bizalom`)
Cím: „Így rangsorolunk.”
Szöveg: „A sorrendet a te szempontjaid döntik el: ár szállítással, elérhetőség, a profilodhoz
illés és a bolt megbízhatósága. A jutalék mértéke nem szempont. Partnerlinkeken keresztül
jutalékot kaphatunk; ezt minden gomb mellett jelöljük.”
Link: „A teljes leírás →” `/igy-rangsorolunk`

### 3.8 GYIK
- Tényleg ingyenes? — „Igen. A boltoktól kaphatunk jutalékot, ha rajtunk keresztül vásárolsz.
  Neked ez semmibe nem kerül, és nem változtat az árakon.”
- Honnan jönnek az árak? — „A boltok hivatalos termékadataiból, naponta többször frissítve.
  Minden árnál látod, mikor ellenőriztük.”
- Mit csináltok az adataimmal? — „Csak arra használjuk, hogy jobb ajánlatot és időben
  emlékeztetőt kapj. Bármikor letöltheted vagy törölheted őket.”
- Honnan tudjátok a névnapot? — „A magyar névnaptárból. Ha egy névnek több napja is van,
  kiválaszthatod, melyiket tartja.”
- Mi az a „Valódi akció”? — „Azt jelenti, hogy a saját ármérésünk szerint az elmúlt 30 napban
  nem volt ennyire olcsó ennél a boltnál.”

### 3.9 Záró CTA (`landing.zaroCta`)
Cím: „Kezdjük el. Egy perc az egész.” · gomb: **Kezdjük el, ingyenes**

### 3.10 Lábléc
Jogi linkek · Affiliate-tájékoztató · „© 2026 JóVétel” · kis szöveg: „Az oldalon partnerlinkek
találhatók. Ha rajtuk keresztül vásárolsz, jutalékot kaphatunk. Ez nem befolyásolja a sorrendet.”

### 3.11 Várólista-űrlap (waitlist mód)
Mezők: e-mail · „Mire használnád?” (Ajándékozás / Szépségápolás / Mindkettő) · marketing-hozzájárulás
checkbox (nem kötelező) · Turnstile. **Double opt-in** megerősítő e-mail. Siker: „Köszönjük!
Küldtünk egy megerősítő levelet.” Mentés `waitlist` táblába `source` (UTM) mezővel.

---

## 4. Belépés és onboarding

### 4.1 `/belepes`
Egyetlen képernyő regisztrációra és belépésre. Bal oldalt kép (`auth.oldalkep`, mobilon rejtve),
jobb oldalt: cím „Lépj be, vagy kezdd el”, **Folytatás Google-lel**, elválasztó, e-mail mező,
**Belépési link küldése**. Siker: „Küldtünk egy linket a(z) {email} címre. Nyisd meg ezen az
eszközön.” Alatta: „A folytatással elfogadod az ÁSZF-et és az adatkezelési tájékoztatót.”
Ha a belépést egy `pendingAction` indította, a cím alatt: „Belépés után elmentjük: {akció}.”

### 4.2 `/onboarding` — 5 lépés, mindegyik kihagyható, felül lépésjelző
Minden lépés oldalképe a saját képhelyéről jön. Gombok: **Tovább** / „Kihagyom”.

1. **Mire használnád?** (`onboarding.cel`) — nagy választókártyák: Ajándékozásra · Szépségápolásra ·
   Mindkettőre. (Ez dönti el, melyik lépés következik; „Ajándékozás” esetén a 2. lépés kimarad.)
2. **A bőröd** (`onboarding.borprofil`) — bőrtípus (Normál, Száraz, Zsíros, Kombinált, Érzékeny,
   Nem tudom) · fő gondok, max. 3 (Pattanások, Pigmentfoltok, Ráncok, Tág pórusok, Szárazság,
   Pirosság, Fakóság) · kerülendő (Illatanyag, Alkohol, Parabének, Szilikonok, Illóolajok).
   Megjegyzés: „Ez kozmetikai ajánláshoz kell. Bőrproblémával fordulj bőrgyógyászhoz.”
3. **Kényelmes keret** (`onboarding.keret`) — sávok: 5 000 Ft alatt · 5–15 ezer · 15–30 ezer ·
   30 ezer felett. Kedvenc boltok (a partnerlistából, opcionális).
4. **Kiket ajándékozol?** (`onboarding.szeretteim`) — 1–3 gyors kártya: becenév („Anyu”) ·
   kapcsolat (Anya, Apa, Pár, Barát(nő), Testvér, Gyerek, Nagyszülő, Kolléga, Egyéb) ·
   keresztnév (opcionális, a névnaphoz) · születésnap (hónap + nap). Keresztnév beírásakor azonnal
   megjelenik: „Névnap: november 25.” Ha több napja van, választó: „Melyiket tartja?”.
5. **Értesítések** (`onboarding.ertesitesek`) — két külön kapcsoló:
   - „Szólj, ha közeleg egy fontos nap, ha lemegy egy figyelt ár, vagy ha fogyóban van valami a
     polcomon.” (szolgáltatási, alapértelmezés: be)
   - „Kérem a heti válogatást ajánlatokkal és ötletekkel.” (marketing, alapértelmezés: ki)

Befejezés → `/app`, első belépéskor üdvözlő sávval: „Kész! Itt fogod látni, mire érdemes most figyelned.”

---

## 5. Az alkalmazás (`/app/*`)

**Keret:** mobilon alsó fülsor (Neked most · Felfedezés · Szeretteim · Listák · Polc), desktopon
keskeny bal oldali sín ugyanezekkel + felül keresőmező és profil-menü (Beállítások, Kilépés).

### 5.1 Neked most (`/app`)
Fejléc: „Jó reggelt, {keresztnév}.” (napszak szerint) + egy mondat összegzés:
„Ma 3 dolog vár rád.” / „Ma nincs teendőd. Nézz körül nyugodtan.”

**Kártyák, prioritás szerint, max. 8:**
1. **Közelgő alkalom** (≤ 14 nap): „Anyu névnapja 10 nap múlva” + 3 ötlet a keretében + [Több ötlet]
2. **Árfigyelő teljesült:** „{termék} {célár} alá ment” + ár + bolt + [Megnézem]
3. **Fogyóban a polcon** (≤ 14 nap): „A {termék} kb. 12 nap múlva elfogy” + legjobb ár + [Újra megveszem]
4. **Lefoglalt ajándék emlékeztető** (a foglalónak): „Te veszed meg: {termék} Katának, {alkalom} {n} nap múlva”
5. **Áresés a listáidon:** a listatételek, amelyek ára a hozzáadás óta ≥ 5%-kal csökkent
6. **Neked válogattuk:** 4 termék a profilhoz (címkék + keret + valódi akció előnyben)

Üres állapot (új tag, nincs adat): három indítókártya: „Ments el valakit” · „Tedd fel az első
termékedet a polcra” · „Próbáld ki az ajándék-varázslót”.

### 5.2 Felfedezés (`/app/felfedezes`, nyilvános párja: `/kereses`, `/ajandek`)
- Nagy keresőmező: „Mit keresel? Pl. szérum zsíros bőrre 10 ezer alatt”
- Alatta két belépő: **Ajándék-varázsló** · **Kérdezd a tanácsadót**
- Kategória-kártyák képhelyekkel (`kategoria.*`)
- Találati lista: szűrők (ár teljes költséggel, márka, kategória, bolt, készleten, valódi akció,
  bőrtípus, „mentes” címkék), rendezés (Legjobb egyezés, Legalacsonyabb teljes ár, Legnagyobb valódi
  kedvezmény, Legújabb). Belépett felhasználónál a profil szűrői előre ajánlva (chipként, kikapcsolható).
- Üres találat: „Erre nem találtunk terméket.” + a legszűkebb szűrő lazításának javaslata +
  „Kérdezd a tanácsadót” gomb.

### 5.3 Termékoldal (`/termek/[slug]`)
- Galéria (feedkép), márka, név, kiszerelés
- **„Miért neked”** címkék (belépve, lásd 7.1)
- **Legjobb ajánlat** blokk: teljes ár (nagy), „szállítással együtt” magyarázat, bolt, szállítási idő,
  „ár ellenőrizve {relatív idő}”, **[Megnézem a boltban]** + `<Disclosure />`
- **VerdictBadge** + **PriceHistoryChart** (30 / 90 nap váltó, boltonként)
- **Összes ajánlat:** `OfferRow` lista teljes ár szerint (bolt, ár, szállítás, teljes ár, szállítási idő,
  készlet, gomb)
- Műveletek: **Szólj, ha olcsóbb lesz** (célár-választó: −5% / −10% / −20% / egyéni) · **Listára** ·
  **Polcra teszem**
- Leírás (feedből, tisztítva), jellemzők (címkék), „Kinek ajánljuk” csak szerkesztői adatból
- Kapcsolódó termékek (ugyanaz a kategória, hasonló ársáv)
- Strukturált adat: Product + AggregateOffer (JSON-LD), csak valós mezőkből

### 5.4 Szeretteim (`/app/szeretteim`)
**Lista nézet:** `LovedOneCard` rácsban: monogram-avatar, becenév, következő alkalom visszaszámlálóval,
keret. Felül: **+ Új szerettünk**. Alatta idővonal: „Következő 60 nap” összes alkalma.

**Részletek (`/app/szeretteim/[id]`):**
- Adatok: becenév*, kapcsolat*, keresztnév, névnap (választott), születésnap (hónap/nap, év opcionális),
  érdeklődés (chipek: Parfüm, Bőrápolás, Smink, Wellness, Könyv, Otthon, Konyha, Kert, Divat,
  Ékszer, Utazás, Sport, Tech kiegészítő, Élmény), keret sáv, privát megjegyzés
- **Alkalmak** (automatikusan létrejönnek, egyenként ki/be kapcsolhatók): születésnap · névnap ·
  karácsony · anyák napja (ha kapcsolat = Anya vagy Nagyszülő) · apák napja (ha Apa) · Valentin-nap
  (ha Pár) · nőnap (opcionális) · egyéni (pl. évforduló)
- Emlékeztető időzítés alkalmanként: 14 / 10 / 7 / 3 nappal előtte (alapértelmezés: 10 és 3)
- **Ötletek neki:** a varázsló eredménye előre kitöltve az ő adataival
- **Ajándék-előzmény:** „2025 karácsony: {termék}”. Új ajánlásnál a már adott termék és annak
  közeli megfelelői kimaradnak. Felvétel: kézzel, vagy egy `/go` kattintás után a következő
  látogatáskor: „Ezt vetted {becenév}nak? [Igen, mentsd] [Nem]”.

### 5.5 Listáim (`/app/listak`)
- Lista típusok: **Kívánságlista** (saját) · **Ajándékötletek** (valakinek, egy szerettünkhöz kötve).
  Az adatmodell az `editorial` és `creator` típust is ismeri (útmutatók, 2. hónap).
- Lista: cím, borítókép (képhely vagy első termék képe), alkalom + dátum (opcionális), láthatóság:
  Privát · Linkkel megosztott.
- Tétel: termék, megjegyzés („M-es méret”, „a rózsaszínt”), prioritás (Nagyon szeretném / Jó lenne),
  hozzáadáskori ár (az áresés-értesítéshez).
- **Megosztás:** „Link másolása” (nem kitalálható `share_token`), a link visszavonható és újragenerálható.
- **Meglepetés-mód** (alapértelmezés: be): a lista gazdája nem látja, mi foglalt és ki foglalta.
  Kikapcsolva látja, hogy foglalt (a foglaló nevét akkor sem).

### 5.6 Megosztott lista (`/l/[token]`, nyilvános, `noindex`)
- Fejléc: „{Lista címe}”, „{megosztó keresztneve} listája”, alkalom visszaszámlálóval
- Tételek: kép, név, megjegyzés, legjobb teljes ár + bolt + [Megnézem a boltban] + `<Disclosure />`
- **[Lefoglalom]:** belépést kér (magic link, visszatérés ugyanide), Turnstile, utána „Lefoglaltad.
  A lista gazdája nem látja. Emlékeztetünk az alkalom előtt.” Mások ezt látják: „Már valaki megveszi”.
  A foglaló visszavonhatja. Egy tételt egyszerre egy ember foglalhat (DB egyediségi kényszer).
- Alul: „Készítsd el a saját listádat →” (akvizíciós hurok)

### 5.7 Polcom (`/app/polc`)
Két fül: **Szépségpolc** · **Árfigyelők**
- **Szépségpolc tétel:** termék, kiszerelés (feedből kinyerve, szerkeszthető), „Kinyitottam”
  dátum (alapértelmezés: ma), becsült elfogyás (lásd 7.4), folyamatjelző, fogyási tempó
  (Lassabban / Átlagosan / Gyorsabban), [Újra megveszem] (legjobb aktuális ár), [Elfogyott]
  (a tételt archiválja, és felajánlja az újravásárlást).
- Felvétel: termékoldalról „Polcra teszem”, keresésből, vagy `/go` kattintás után:
  „Megvetted a {termék}-t? Tedd a polcodra, szólunk, mielőtt elfogy.”
- **Árfigyelő tétel:** termék, célár, jelenlegi legjobb ár, eltérés, mini ártörténet, szüneteltetés,
  törlés. Teljesülés után 14 napig nem küldünk újra ugyanarra a termékre.

### 5.8 Beállítások (`/app/beallitasok`)
Profil (név, bőrprofil, keret, kedvenc boltok) · Értesítések (két hozzájárulás külön, napi
összesítő időpontja: 7:30 alapértelmezés) · Adataim (**Letöltés JSON-ban**, **Fiók törlése**
megerősítő lépéssel, amibe be kell írni: „TÖRLÉS”) · Kilépés.

---

## 6. Ajándék-varázsló és AI tanácsadó

### 6.1 Varázsló (`/ajandek`, belépés nélkül is)
Lépések (chipek, egy képernyőn görgetve mobilon, lépésjelzővel):
1. **Kinek?** Anyukámnak · Apukámnak · A páromnak · Barátnőmnek · Barátomnak · Testvéremnek ·
   Kollégámnak · Magamnak · (belépve: mentett szeretteim is, képhely `cimzett.*`)
2. **Milyen alkalomra?** Születésnap · Névnap · Karácsony · Mikulás · Valentin-nap · Anyák napja ·
   Évforduló · Csak úgy
3. **Mennyit szánsz rá?** csúszka sávokkal: 5 / 10 / 15 / 20 / 30 / 50 ezer Ft
4. **Mit szeret?** érdeklődés-chipek (max. 3)
5. **Kerülendő?** (opcionális) illatos termék · alkohol · kozmetikum · „már van neki: …”

**Eredmény:** 6 javaslat három csoportban: *Biztos befutó* (2) · *Különleges* (2) · *Kis figyelmesség*
(2, a keret felénél olcsóbb). Minden kártyán: kép, név, teljes ár + bolt, `VerdictBadge` (ha van),
„Miért jó neki” (1–2 mondat, AI, számjegy nélkül), műveletek: [Megnézem a boltban] · [Listára] ·
[Mentés {szerettünk}höz]. Alul: „Mentsd el az eredményt és emlékeztess az alkalom előtt” → regisztráció.

**Menet:** determinisztikus jelöltgyűjtés (kategória- és címkeszűrés, ár ≤ keret teljes költséggel,
készleten, ajándék-előzmény kizárása) → rangsor (7.2) → a top 6-ra AI indoklás → validátor → megjelenítés.

### 6.2 Szabad szöveges tanácsadó (másodlagos)
Beviteli mező + példa-chipek. Az AI a szöveget **csak** a varázsló állapotsémájára alakítja
(Zod: `recipient`, `occasion`, `budgetMaxHuf`, `interests[]`, `avoid[]`, `category?`, `skinType?`,
`freeTextKeywords[]`), a felület megmutatja az értelmezést szerkeszthető chipekként („Így értettem:
Barátnő · Születésnap · 15 000 Ft · Parfüm”), és onnan ugyanaz a folyamat fut, mint a varázslóban.
Nem hosszú csevegés: legfeljebb egy tisztázó kérdés, chipekkel.

### 6.3 AI szabályok
- Két AI-szerep: **(a) értelmezés** (szöveg → séma), **(b) indoklás** (termék-tények → 1–2 mondat).
- Az indoklás bemenete csak a termék tényhalmaza (név, márka, kategória, címkék, szerkesztői
  jegyzet) és a címzett-kontextus. Kimenet: max. 220 karakter, **számjegy nélkül**, a termék
  márkáján kívül más márka nélkül, felszólító vagy túlzó állítás nélkül („a legjobb”, „garantáltan”).
- Validátor bukás → sablon: „Illik ahhoz, amit szeret: {címke1}, {címke2}.”
- Cache: indoklás kulcsa `(productId, recipient, occasion, interestsHash)`, 30 nap.
- Költségkeret: `AI_MAX_COST_HUF_PER_REQUEST` (alap: 1,5 Ft); napi globális plafon riasztással.
- Rate limit: vendég 10 AI-kérés/óra/IP, tag 40/óra; Turnstile a 3. vendég-kérés után.
- Minden AI-felületen `<AiLabel />`.

---

## 7. Algoritmusok

### 7.1 „Miért neked” címkék (determinisztikus, max. 3, prioritás szerint)
1. Profil-egyezés: termék `skin_type:*` címke ∩ felhasználó bőrtípusa → „Zsíros bőrre”
2. Mentes-egyezés: termék `free_from:*` ∩ kerülendők → „Illatmentes”
3. Gond-egyezés: `concern:*` ∩ gondok → „Pigmentfoltokra”
4. Keret: legjobb teljes ár ≤ felső sáv → „A kereteden belül”
5. Ítélet: „Valódi akció” → „30 napja nem volt ilyen olcsó”
6. Kedvenc bolt: legjobb ajánlat kedvenc boltban → „A kedvenc boltodban”
Vendégnél csak 4–5. Címkék forrása: `product_tags` (szabály, feed, szerkesztő, AI-kinyerés bizonyítékkal).

### 7.2 Rangsor (varázsló és keresés „Legjobb egyezés”)
`pontszám = 0,35·relevancia + 0,25·profilillés + 0,15·ár-érték + 0,10·ítélet + 0,10·bolt-minőség + 0,05·frissesség`
- relevancia: FTS `ts_rank_cd` + trigram hasonlóság normalizálva (varázslónál kategória/címke-találat)
- profilillés: a 7.1 egyezések száma / 3
- ár-érték: 1 − (teljes ár / keret), 0 és 1 közé vágva
- ítélet: Valódi akció = 1, Szokásos = 0,5, Drágább = 0
- bolt-minőség: kereskedőnként kézzel beállított 0–1 (szállítási idő, visszaküldés)
- frissesség: 1, ha az ár < 12 órás; 0,5, ha < 48 órás
**A jutalék mértéke nem szerepel.** A súlyok egy konfigurációs fájlban, és így szerepelnek az
„Így rangsorolunk” oldalon is.

### 7.3 „Valódi akció?” ítélet (ajánlatonként, a `price_daily` táblából)
- `n` = napok száma ártörténettel az elmúlt 30 napban (a mai napot nem számítva)
- `n < 14` → nincs ítélet; felirat: „Még gyűjtjük az ártörténetet ({n} napja figyeljük).”
- `min30` = napi minimumok minimuma; `med30` = napi utolsó árak mediánja
- `jelen < min30 × 0,97` → **Valódi akció** · „30 napja nem volt ilyen olcsó ennél a boltnál.”
- `jelen > med30 × 1,05` → **Most drágább** · „Most drágább a szokásosnál.”
- egyébként → **Szokásos ár** · „Nagyjából ennyibe szokott kerülni.”
- Ha a feed kedvezményt jelez (`old_price` > jelen), de `jelen ≥ min30` → **Szokásos ár** + tényszerű
  kiegészítés: „A bolt kedvezményt jelez, de az elmúlt 30 napban volt már ennyi vagy kevesebb is.”
- Termékszinten a legjobb ajánlat ítélete látszik. Semleges, tényszerű nyelv; kereskedőt minősítő
  szó nincs.

### 7.4 Teljes költség
`teljes = ár + szállítás` ahol `szállítás = 0`, ha `ár ≥ merchant.free_shipping_threshold_huf`,
különben `merchant.shipping_fee_huf`. EU-n kívüli kereskedőnél + `merchant.customs_fee_huf`.
Mindig látszik a bontás („24 990 Ft + 990 Ft szállítás”). Egy helyen: `lib/pricing/totalCost.ts`.

### 7.5 Utántöltés-becslés
- Kiszerelés a termék nevéből/attribútumaiból regexszel (`30 ml`, `50ml`, `200 g`, `2 x 15 ml`), felülírható.
- Napi fogyás: `usage_defaults` tábla kategóriánként (induló értékek, [BECSLÉS], admin felületen
  szerkeszthető): szérum 0,3 ml · arckrém 0,6 ml · szemkörnyékápoló 0,1 ml · fényvédő arcra 1,0 ml ·
  tusfürdő 8 ml · testápoló 4 ml · sampon 7 ml · parfüm 0,3 ml · alapozó 0,4 ml.
- Tempó szorzó: Lassabban 0,7 · Átlagosan 1,0 · Gyorsabban 1,4.
- `elfogyás = kinyitás + kiszerelés / (napi fogyás × szorzó)`; értesítés 10 nappal előtte.
- A felületen mindig „kb.” és „becslés, módosítható”.

### 7.6 Névnap és alkalmak
- `namedays` tábla: minden név összes névnapja, `is_primary` jelöléssel (a naptár fő napja).
- Keresztnév → találat ékezet- és kisbetű-független egyezéssel; több nap esetén a felhasználó választ.
- Alkalom következő dátuma: `lib/occasions/nextDate(occasion, today)`; mozgó ünnepek: anyák napja
  (május 1. vasárnapja), apák napja (június 3. vasárnapja). Mikulás: december 6. Karácsony: december 24.
- Szökőnap: február 29-i születésnap nem szökőévben február 28-án.

---

## 8. Értesítések

**Egy felhasználó naponta legfeljebb egy e-mailt kap:** a napi triggerek egy összesítő levélben
érkeznek, 7:30-kor (a felhasználó állíthatja). Tárgy: a legfontosabb elem, pl. „Anyu névnapja 10 nap
múlva, és 2 további dolog”.

| Típus | Trigger | Hozzájárulás | Dedup |
|---|---|---|---|
| Alkalom-emlékeztető | alkalom − beállított napok | szolgáltatási | alkalom + év + offset |
| Árfigyelő teljesült | legjobb teljes ár ≤ célár | szolgáltatási | figyelő + 14 nap |
| Polc: fogyóban | elfogyás − 10 nap | szolgáltatási | polctétel + ciklus |
| Foglalás-emlékeztető (foglalónak) | lista-alkalom − 7 nap | tranzakciós | foglalás |
| Foglalás visszaigazolás | foglaláskor, azonnal | tranzakciós | foglalás |
| Waitlist megerősítés | feliratkozáskor, azonnal | tranzakciós | e-mail |
| Heti válogatás | hétfő 8:00 | **marketing** | hét |

Minden levélben: leiratkozási link típusonként (egy kattintással), a levél oka („Azért kapod,
mert beállítottad: …”), és affiliate-jelölés, ha partnerlink van benne. A levélben lévő ár mellett
dátum és időpont („ár: szept. 22., 7:00”).

---

## 9. Útmutatók (szerkesztői tartalom)
Lista `type = editorial`: cím, bevezető (szerkesztői szöveg), borítókép (képhely `utmutato.boritokep`
vagy saját), tételek szerkesztői megjegyzéssel. Induláskor 10 útmutató (a tartalmat a tulajdonos
írja; a fejlesztés egy szerkesztőt ad hozzá). Példák: „10 ajándék anyukáknak 15 ezer alatt”,
„Az első szérumod: 5 biztos választás”, „Mikulás-csomag 5 ezerből”, „Karácsonyi ajándék barátnőnek”.
Indexelés csak, ha ≥ 5 tétel és ≥ 150 szó szerkesztői szöveg.

---

## 10. Admin (`/admin`, minimális)
Feedek és futások (állapot, tételszám, hibák, [Futtatás most]) · Kereskedők (szállítási szabályok,
bolt-minőség, domain-engedélylista, program-azonosítók) · Útmutatók szerkesztő · Termékcímkék
(top 500 termék kézi címkézése, AI-javaslat bizonyítékkal, jóváhagyás) · Fogyási alapértékek ·
Várólista (export CSV) · Kattintások és konverziók napi összesítő · Képhelyek (melyik kép, milyen
licenccel, hol használt).

---

## 11. Analitika (eseménynevek)
`landing_view` · `cta_click{hely}` · `waitlist_submit` · `signup_start{forras}` · `signup_complete` ·
`onboarding_step{lepes,kihagyva}` · `search{q_hossz,talalat}` · `wizard_complete{cimzett,alkalom,keret}` ·
`ai_interpret` · `ai_explain_shown` · `product_view` · `offer_click{bolt,hely}` · `alert_create` ·
`lovedone_create` · `occasion_reminder_open` · `list_create` · `list_share` · `list_reserve` ·
`shelf_add` · `email_click{tipus}`.
A `offer_click` a saját `clicks` táblába is megy (ez az igazságforrás), a többi PostHogba, consent után.

---

## 12. Kívül esik a V1-en (2. hónap)
Creator-kollekciók és kifizetés · „TikTokon láttam” link-kereső · Dupe-párok · Web push / PWA-telepítés ·
Heti válogatás automatizált tartalma (V1-ben a hozzájárulás gyűjtése igen, a küldés kézi) ·
Szponzorált helyek · további vertikumok.
