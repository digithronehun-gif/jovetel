/**
 * `dbAdmin`: felhasználókon ÁTÍVELŐ műveletekhez (scriptek, cron, admin felület). Ugyanaz a kapcsolat,
 * de külön belépési pont: az ESLint csak a scripts/, app/api/cron/, app/(admin)/ és a
 * src/lib/{ingestion,notifications,db/admin*} alól engedi importálni (4. vasszabály).
 */
export { db as dbAdmin, getDb as getDbAdmin, getSql as getSqlAdmin, closeDb } from './client'
