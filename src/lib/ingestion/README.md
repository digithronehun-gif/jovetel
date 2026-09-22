# lib/ingestion
Feed-import: `adapters/` (generic-csv, generic-xml, awin, cj, dognet, admitad, manual), `pipeline/` (a 9 lépés),
`normalize/` (ár, GTIN, kiszerelés, HTML-tisztítás), `quality/` (minőségi kapu). A feedszöveg ellenséges bemenet (2. vasszabály).
Letöltés csak az ingest scriptből, SSRF-védelemmel. Részletek: ARCHITECTURE.md 3. pont.
