# lib/db
Drizzle séma (`schema/`), SQL-migrációk (`migrations/NNNN_nev.up.sql` + `.down.sql`), seed és a lekérdező réteg.
**Szabály (4. vasszabály):** minden felhasználói adatot olvasó/író függvény első paramétere a `userId`, és arra szűr.
Két kliens: `db` (alkalmazás, pooler, `prepare: false`) és `dbAdmin` (csak scriptek, cron). Részletek: DATA_MODEL.md.
