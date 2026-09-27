/**
 * Fejlesztői mérőeszköz: a PostgresSearch két lekérdezésének terve és ideje egy adott URL-állapotra.
 *   EXPLAIN_DB=<postgres url> pnpm exec tsx scripts/perf/explain-search.ts "kategoria=szepsegapolas" [hits|facets]
 * (a 50 000 termékes adatbázist a tests/db/search-quality.test.ts hozza létre: jovetel_test_search50k)
 */
import postgres from 'postgres'
import { PostgresSearch } from '../../src/lib/search/postgres'
import { parseSearchState } from '../../src/lib/search/state'

const sql = postgres(process.env.EXPLAIN_DB!, { max: 2, prepare: false, onnotice: () => {} })
const s = new PostgresSearch(sql)
const { hitsQuery, facetsQuery } = s.build(parseSearchState(new URLSearchParams(process.argv[2] ?? '')))
const which = process.argv[3] === 'facets' ? facetsQuery : hitsQuery
const rows = await sql.begin(async (tx) => {
  if (process.env.WORK_MEM) await tx`select set_config('work_mem', ${process.env.WORK_MEM}, true)`
  return tx`explain (analyze, buffers, timing) ${which}`
})
for (const r of rows) console.log(r['QUERY PLAN'])
// időmérés explain nélkül
const t = performance.now()
for (let i = 0; i < 5; i++) await sql.begin(async (tx) => { if (process.env.WORK_MEM) await tx`select set_config('work_mem', ${process.env.WORK_MEM}, true)`; return tx`${which}` })
console.log(`átlag explain nélkül: ${((performance.now() - t) / 5).toFixed(1)} ms`)
await sql.end()
