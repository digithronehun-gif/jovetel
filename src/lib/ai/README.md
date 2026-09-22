# lib/ai
AI gateway (Vercel AI SDK, szolgáltató és modell környezeti változóból), `interpret()` (szöveg → varázsló-állapot),
`explain()` (tényhalmaz → 1–2 mondat, **számjegy nélkül**), validátorok, sablon-fallback, cache, költségplafon.
Csak a `search` modul jelöltjeiből dolgozik; termékért közvetlenül nem kérdez DB-t (1. vasszabály).
