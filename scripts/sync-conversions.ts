/**
 * pnpm sync:conversions [-- --days 60] [--network awin] [--fixtures]      (ARCHITECTURE 3. pont vége, 7. pont)
 *   Hálózatonként a tranzakciós API-ból az elmúlt N nap (alapból 60), upsert a `conversions` táblába; a `click_id` a
 *   subID-ból. Amelyik hálózatnak nincs kulcsa, kimarad (hiba nélkül). Kilépési kód: 1, ha bármelyik hálózat hibás.
 *   --fixtures   a tests/fixtures/conversions/ fájlai API helyett (csak fejlesztői adatbázison)
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'
import { deploymentEnv } from '../src/lib/env'
import { CONVERSION_SOURCES, SYNC_DAYS, syncConversions } from '../src/lib/tracking/conversions/sync'
import { requireEnv } from './_env'

const args = process.argv.slice(2)
const opt = (f: string) => {
  const i = args.indexOf(f)
  return i >= 0 ? args[i + 1] : undefined
}
const days = Number(opt('--days') ?? SYNC_DAYS)
const network = opt('--network')
const fixtures = args.includes('--fixtures')
if (!Number.isInteger(days) || days < 1 || days > 365) {
  console.error('A --days 1 és 365 közötti egész szám.')
  process.exit(2)
}
if (network && !CONVERSION_SOURCES[network]) {
  console.error(`Ismeretlen hálózat: ${network} (lehet: ${Object.keys(CONVERSION_SOURCES).join(', ')})`)
  process.exit(2)
}

const url = process.env.INGEST_DATABASE_URL || process.env.DIRECT_DATABASE_URL || requireEnv('DATABASE_URL')
const sql = postgres(url, { max: 2, prepare: false, onnotice: () => {}, idle_timeout: 20 })

try {
  let payloads: Record<string, unknown[]> | undefined
  if (fixtures) {
    if (deploymentEnv() === 'production') throw new Error('Production környezetben a fixture-konverziók nem futnak.')
    const [row] = await sql<{ v: string | null }[]>`select current_setting('app.environment', true) as v`
    if (row?.v === 'production') throw new Error('Ez az adatbázis production-nek van jelölve: fixture nem kerül bele.')
    const dir = join(import.meta.dirname, '../tests/fixtures/conversions')
    payloads = Object.fromEntries(Object.keys(CONVERSION_SOURCES).map((c) => [c, [JSON.parse(readFileSync(join(dir, `${c}.json`), 'utf8'))]]))
  }
  const stats = await syncConversions(sql, { days, only: network ? [network] : undefined, payloads })
  for (const s of stats) {
    if (s.status === 'ok') {
      console.log(
        `${s.network}: ${s.parsed} tranzakció (${s.rejected} hibás) · új ${s.inserted} · frissült ${s.updated} · változatlan ${s.unchanged} · kattintással ${s.withClick} · kereskedővel ${s.withMerchant}`,
      )
    } else {
      console.log(`${s.network}: ${s.status === 'skipped' ? 'kihagyva' : 'HIBA'} — ${s.reason}`)
    }
  }
  if (stats.some((s) => s.status === 'failed')) process.exitCode = 1
} finally {
  await sql.end()
}
