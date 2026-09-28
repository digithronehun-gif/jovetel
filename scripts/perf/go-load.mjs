// A `/go` átirányító terhelésmérése (F6 elfogadási kritérium: p95 < 150 ms 500 kérés/perc mellett).
//   node scripts/local-stack/with-env.mjs node scripts/perf/go-load.mjs [--base http://localhost:3100] [--rpm 500] [--seconds 60]
// Egyenletes ütemű kérések véletlen aktív ajánlatokra, kérésenként más (dokumentációs tartományú) IP-vel, mert a
// valóságban sok látogató kattint (az IP-nkénti 60/perc korlát így nem torzítja a mérést). Az időt a válasz
// fejlécéig mérjük (a 302 ennyi); a kattintásnapló írása a válasz után fut, ezért a végén a sorok számát is ellenőrizzük.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : def
}
const BASE = arg('base', 'http://localhost:3100')
const RPM = Number(arg('rpm', '500'))
const SECONDS = Number(arg('seconds', '60'))
const TOTAL = Math.round((RPM * SECONDS) / 60)
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'

const sql = postgres(process.env.DATABASE_URL, { max: 2, prepare: false, onnotice: () => {} })
const offers = (
  await sql`
    select o.id from public.offers o join public.merchants m on m.id = o.merchant_id
    where o.is_active and m.status = 'active' order by random() limit 200`
).map((r) => r.id)
if (offers.length === 0) throw new Error('Nincs aktív ajánlat (pnpm db:seed).')
const startedAt = new Date()

// bemelegítés (JIT, kapcsolatkészlet), nem számít bele
for (let i = 0; i < 10; i++) await fetch(`${BASE}/go/${offers[i % offers.length]}`, { redirect: 'manual', headers: { 'user-agent': UA, 'x-forwarded-for': `192.0.2.${i + 1}` } })

const latencies = []
const statuses = {}
const interval = (SECONDS * 1000) / TOTAL
const t0 = performance.now()
await Promise.all(
  Array.from({ length: TOTAL }, async (_, i) => {
    const due = t0 + i * interval
    const wait = due - performance.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    const ip = `198.18.${(i >> 8) & 255}.${i & 255}`
    const s = performance.now()
    const res = await fetch(`${BASE}/go/${offers[i % offers.length]}?placement=product_best`, {
      redirect: 'manual',
      headers: { 'user-agent': UA, 'x-forwarded-for': ip },
    })
    latencies.push(performance.now() - s)
    statuses[res.status] = (statuses[res.status] ?? 0) + 1
    await res.arrayBuffer()
  }),
)
const wall = (performance.now() - t0) / 1000
latencies.sort((a, b) => a - b)
const q = (p) => Math.round(latencies[Math.min(latencies.length - 1, Math.ceil(p * latencies.length) - 1)] * 10) / 10

// a napló a válasz után íródik: kis türelmi idő
await new Promise((r) => setTimeout(r, 2000))
const [{ n }] = await sql`
  select count(*)::int as n from public.clicks where created_at >= ${startedAt.toISOString()}::timestamptz and ip_hash is not null`

const result = {
  base: BASE,
  requests: TOTAL,
  targetRpm: RPM,
  achievedRpm: Math.round((TOTAL / wall) * 60),
  statuses,
  p50: q(0.5),
  p95: q(0.95),
  p99: q(0.99),
  max: Math.round(latencies.at(-1) * 10) / 10,
  clicksLogged: n,
  at: new Date().toISOString(),
}
console.log(JSON.stringify(result, null, 2))
const dir = join(import.meta.dirname, '../../tests/.artifacts/perf')
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, `go-${RPM}rpm.json`), JSON.stringify(result, null, 2))
await sql.end()
