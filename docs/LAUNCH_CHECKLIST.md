# Élesítés előtti ellenőrzőlista

Jelölés: **[T]** = technikai (a Claude Code ellenőrzi az F13 fázisban) · **[Te]** = a tulajdonos teendője.

## Jogi és üzleti
- [ ] **[Te]** Vállalkozási forma, adószám, közösségi adószám (könyvelővel: átalányadó vagy Kft., fordított áfa a külföldi szolgáltatásokra)
- [ ] **[Te]** Ügyvéddel átnézett: ÁSZF, adatkezelési tájékoztató, süti-tájékoztató, affiliate-tájékoztató, impresszum
- [ ] **[Te]** Adatkezelés: a szeretteink adatainak kezelése (harmadik személy adatai), jogalap és tájékoztatás
- [ ] **[Te]** Minden aktív partnerprogram feltételei átolvasva: szabad-e összehasonlítás, képhasználat, márkanév, e-mailben link
- [ ] [T] Minden affiliate gomb mellett `Disclosure`; „Így rangsorolunk” oldal él, a súlyok egyeznek a kóddal
- [ ] [T] AI-címke minden AI-felületen
- [ ] [T] Nincs kitalált értékelés; értékelés csak forrásmegjelöléssel
- [ ] [T] „Valódi akció” csak saját ártörténetből; semleges nyelv a kereskedőkről

## Képek
- [ ] **[Te]** A moodboard (Pinterest) képek cseréje saját / AI-generált / licencelt képre, legalább a landing, a belépés és az onboarding képhelyein. Ha tudatosan velük indulsz: `ALLOW_DEV_IMAGES=true` (a kockázatot vállalod)
- [ ] [T] `pnpm check:assets` kimenete áttekintve
- [ ] [T] Termékképek csak feedből, a program feltételei szerint; bolt-logó csak engedéllyel

## Adat és partnerek
- [ ] **[Te]** Legalább 2 jóváhagyott program, élő feeddel
- [ ] [T] Az árgyűjtő legalább 14 napja fut (különben nincs „Valódi akció” ítélet); Black Friday előtt legalább 30 nap
- [ ] [T] Teszt-kattintás minden hálózaton: a subID megjelenik a hálózati felületen (**[Te]** ellenőrzöd)
- [ ] [T] Minőségi kapu és riasztás működik; a feed 36 óránál nem régebbi
- [ ] **[Te]** 10 szerkesztői útmutató megírva (indexelhetők: ≥ 5 tétel, ≥ 150 szó)

## E-mail
- [ ] **[Te]** Saját domain a küldéshez; SPF, DKIM, DMARC beállítva (Resend útmutató)
- [ ] [T] Magic link, várólista-megerősítés, napi összesítő, foglalás-levelek tesztelve Gmail és Outlook fiókban, mobilon is
- [ ] [T] Leiratkozás típusonként működik, `List-Unsubscribe` fejléc van

## Technika
- [ ] [T] `pnpm verify`, `pnpm test:e2e`, `pnpm eval:ai` zöld
- [ ] [T] Lighthouse mobil ≥ 90 a landingen, a keresésen és a termékoldalon; LCP < 2,5 s
- [ ] [T] axe: nincs kritikus akadálymentességi hiba a fő oldalakon
- [ ] [T] Biztonsági fejlécek (CSP nonce-szal, HSTS, frame-ancestors) élnek
- [ ] [T] Rate limit és Turnstile: AI, `/go`, foglalás, várólista, belépés
- [ ] [T] Open redirect tesztcsomag zöld
- [ ] [T] Cron végpontok `CRON_SECRET` nélkül 401-et adnak
- [ ] [T] Sentry fogadja a hibákat (kliens, szerver, cron); riasztások kipróbálva
- [ ] [T] Supabase: napi mentés + PITR bekapcsolva a prod projekten; a seed demó-adat nincs a prod DB-ben
- [ ] [T] Next.js a legfrissebb biztonsági patchen
- [ ] **[Te]** Vercel Pro (kereskedelmi használathoz kötelező), domain bekötve, `fra1` régió

## Mérés
- [ ] [T] PostHog csak hozzájárulás után tölt be (hálózati teszt)
- [ ] [T] A North Star és a napi KPI az adminban egyezik a kézi lekérdezéssel
- [ ] **[Te]** UTM-konvenció a TikTok/Instagram linkekhez (`/t/<kód>` vagy `?utm_source=tiktok&utm_content=<videó>`)

## Indulás napja
- [ ] `LAUNCH_MODE=live`
- [ ] A várólistának meghívó levél (kézi küldés, marketing-hozzájárulással rendelkezőknek; a többieknek csak tranzakciós „elindultunk” levél, ha a feliratkozáskor ezt ígérted)
- [ ] Első kampány: „Karácsonyi kívánságlista” (november eleje) → „Black Friday: valódi akció?” (november 20–30.)
