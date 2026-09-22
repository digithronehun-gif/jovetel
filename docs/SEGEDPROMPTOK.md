# Segédpromptok

A fő prompt a gyökérben lévő `START_PROMPT.md`. Ezek a rövid promptok akkor kellenek, ha közbe
akarsz szólni, vagy a munka megszakadt.

---

### Folytatás (ha a munkamenet megszakadt, vagy új ablakban indítod)
```
Olvasd el a CLAUDE.md-t, a START_PROMPT.md-t és a docs/PROGRESS.md-t. Folytasd a munkát onnan,
ahol abbahagytad, a START_PROMPT.md szerint. Kész fázist ne kezdj újra.
```

### Hol tartasz?
```
Foglald össze a docs/PROGRESS.md alapján röviden: melyik fázisnál tartasz, mi készült el,
mi a következő lépés, és van-e bármi, amire tőlem vársz. Utána folytasd a munkát.
```

### Hibajavítás
```
Ez nem működik: [mit csináltál, mit vártál, mit kaptál; másold be a hibaüzenetet].
Előbb derítsd ki a kiváltó okot, és írd le röviden, mielőtt javítasz. Írj egy tesztet, ami most a
hiba miatt elbukik, javítsd, futtasd a pnpm verify-t, aztán folytasd a fázisokat onnan, ahol tartottál.
```

### Módosítás menet közben
```
Változtatás: [mit szeretnél másképp]. Frissítsd az érintett specifikációt (docs/specs/…), írd be
a docs/PROGRESS.md-be, hogy mi változott és miért, valósítsd meg (ha már kész fázist érint, ott is),
aztán folytasd a fázisokat onnan, ahol tartottál.
```

### Képek cseréje (saját, licencelt vagy partnerkép)
```
Olvasd el a CLAUDE.md 7. vasszabályát és a DESIGN_SYSTEM.md 8. pontját. A [mappa] mappában új
képek vannak. Forrás: [saját / licencelt (licencazonosító) / partner (program neve, érvényesség)].
Konvertáld őket WebP-be, készíts magyar alt-szöveget, domináns színt és elmosott előnézetet, vedd
fel őket a manifestbe a megfelelő source/license mezőkkel, és tedd őket ezeknek a képhelyeknek a
listája elejére: [képhelyek]. Futtasd a pnpm check:assets-et, és mutasd, mely képhelyek maradtak
még moodboard-képen.
```

### Új partnerprogram / feed bekötése
```
Olvasd el a CLAUDE.md-t és az ARCHITECTURE.md 3. és 4. pontját. Jóváhagytak a [program neve]
programba a [hálózat] hálózaton. Program-azonosító: [..], a feed elérése: [..] (a kulcsot a
.env.local-ban adom meg). A mintafájlt a tests/fixtures/feeds/[hálózat]/ mappába tettem.
Vedd fel a kereskedőt (szállítási szabályok: [..], domainek: [..]), kösd be a feedet a megfelelő
adapterrel, készíts kategória-leképezést, futtass egy próbaimportot, és mutasd a statisztikát.
Mondd meg, mit kell a hálózat felületén ellenőriznem a teszt-kattintás subID-jához.
```
