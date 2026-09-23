# Nyitott kérdések

> A tulajdonos válasza kell. A Claude Code ide gyűjti, amit nem tud ellenőrzött forrásból eldönteni,
> és addig fixture-rel / jól látható helykitöltővel dolgozik.

| # | Kérdés | Kit érint | Állapot |
|---|---|---|---|
| 1 | Végleges márkanév és domain (javaslat: JóVétel; a domain szabad-e?) | landing, e-mail, jogi | nyitott |
| 2 | Cégadatok az impresszumhoz és a jogi oldalakhoz | F2 | nyitott |
| 3 | Mely affiliate-programok jóváhagyottak, milyen program-azonosítóval? | F3, F6 | nyitott |
| 4 | Hálózatonként a feed pontos formátuma és oszlopnevei (mintafájl a `tests/fixtures/feeds/<hálózat>/` mappába) | F3 | nyitott |
| 5 | Hálózatonként a subID paraméter pontos neve és hosszkorlátja (a PDF szerint Awin: `clickref`, max. 50 karakter; CJ: `sid`; Admitad: `subid`; a többi ellenőrizendő) | F6 | nyitott |
| 6 | Kereskedőnként a szállítási díj, az ingyenes szállítás küszöbe, a szállítási idő, a visszaküldési napok | F5 | nyitott |
| 7 | Küldő e-mail cím és domain (SPF/DKIM/DMARC) | F2, F9 | nyitott |
| 8 | Kik a béta-tesztelők (`BETA_ALLOWLIST`)? | F7 | nyitott |
| 9 | Melyik 10 szerkesztői útmutatóval indulunk, és ki írja a szövegüket? | F4 | nyitott |
| 10 | Saját vagy AI-generált képek készülnek-e a moodboard helyett indulás előtt? | képhelyek | nyitott |
| 11 | Supabase projektek (jovetel-dev, jovetel-prod, Frankfurt) létrehozása és a kulcsok a `.env.local`-ba / Vercelre. Addig helyi Postgres + GoTrue fut (F1). | F1, F2 | nyitott |
| 12 | Névnaptár: a MEK (OSZK) szerint János fő névnapja jún. 26. és dec. 27., a közkeletű naptárak jún. 24-én is jelölik. A választóban mindhárom szerepel. Kell-e egyedi „alapértelmezett” nap egyes neveknél (pl. Katalin: nov. 25.)? | F7, F9 | nyitott |
| 13 | A hálózatok tracking-domainjei (Awin, CJ, Dognet) a seedben ismert nyilvános domainek; ellenőrizendő a jóváhagyott programoknál. | F6 | nyitott |
| 14 | A hálózati adapterek alapértelmezett oszlopnevei (Awin „Create-a-Feed”, CJ Google-formátum, Dognet Heureka-XML, Admitad YML) nyilvános dokumentáció alapján készültek; egy-egy valódi, jóváhagyott program mintafájljával ellenőrizendők. Eltérésnél `feeds.config.columns`. | F3 | nyitott |
| 15 | Dognet: a feed-hoszt és a deeplink-sablon (`config.deeplinkTemplate`) a jóváhagyott programnál derül ki. | F3, F6 | nyitott |
| 16 | Supabase Storage: a standard feltöltés alapkorlátja 50 MB fájlonként; ennél nagyobb tömörített feedhez a projektben a „Upload file size limit” emelése kell (a pillanatkép hibája az árgyűjtést nem állítja meg). | F3 | nyitott |
| 17 | A [Futtatás most] élesben GitHub-tokent kér (`INGEST_DISPATCH_TOKEN`: finomhangolt token, csak ehhez a repóhoz, Actions: read/write) és `INGEST_DISPATCH_REPO`-t (`tulajdonos/repo`). | F3 | nyitott |
