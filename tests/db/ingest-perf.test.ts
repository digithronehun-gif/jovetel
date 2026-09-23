/**
 * Teljesítmény (F3 „Kész, ha”): 50 000 soros import < 10 perc, stabil memóriával; a változatlan újrafuttatás
 * 0 változott tétel. Hosszú: csak `PERF=1` mellett fut (pnpm test:db:perf).
 */
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createGzip } from 'node:zlib'
import { afterAll, describe, expect, it } from 'vitest'
import { LocalRawStore } from '../../src/lib/ingestion/pipeline/raw-store'
import { runFeed } from '../../src/lib/ingestion/pipeline/run'
import { ROOT_DIR } from './env'
import { testSql } from './helpers'

const sql = testSql()
const enabled = process.env.PERF === '1'
let dir = ''

async function writeFeed(path: string, rows: number, priceShift = 0) {
  const gz = createGzip()
  const out = createWriteStream(path)
  gz.pipe(out)
  const w = async (s: string) => {
    if (!gz.write(s)) await once(gz, 'drain')
  }
  await w('id,title,description,price,link,image_link,brand,gtin,product_type,availability\n')
  const brands = ['Lumen Botanica', 'Hajnalpír', 'Mezei Derm', 'Aura Skin Lab', 'Tiszta Forrás', 'Selyemméz', 'Nordfény']
  const kinds = ['Hialuronsavas szérum 30 ml', 'Nappali arckrém 50 ml', 'Tusfürdő 250 ml', 'Sampon 300 ml', 'Illatgyertya 200 g', 'Női parfüm EDP 50 ml']
  for (let i = 0; i < rows; i++) {
    const b = brands[i % brands.length]!
    const k = kinds[i % kinds.length]!
    const price = 990 + ((i * 37) % 20000) + priceShift
    await w(
      `P${i},"${b} ${k} #${i}","<p>Leírás <b>${i}</b>: zsíros bőrre, illatanyagmentes.</p>",${price}.00 HUF,https://perf-bolt.example/p/${i},https://perf-bolt.example/i/${i}.jpg,${b},,"${k.split(' ')[0]}",in stock\n`,
    )
  }
  gz.end()
  await once(out, 'finish')
}

afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  await sql`delete from public.products p where exists (select 1 from public.offers o join public.merchants m on m.id = o.merchant_id where o.product_id = p.id and m.slug = 'teszt-perf')`
  await sql`delete from public.merchants where slug = 'teszt-perf'`
  await sql.end()
})

describe.skipIf(!enabled)('50 000 soros import', () => {
  it('< 10 perc, stabil memória; újrafuttatás 0 változás', { timeout: 30 * 60_000 }, async () => {
    dir = await mkdtemp(join(tmpdir(), 'jovetel-perf-'))
    const file = join(dir, 'perf.csv.gz')
    await writeFeed(file, 50_000)
    const [n] = await sql<{ id: string }[]>`insert into public.networks (code, name) values ('direct', 'Közvetlen') on conflict (code) do update set name = excluded.name returning id`
    const [m] = await sql<{ id: string }[]>`
      insert into public.merchants (network_id, slug, name, domain_allowlist, status)
      values (${n!.id}, 'teszt-perf', '[TESZT] Perf', ${sql.array(['perf-bolt.example'])}, 'active')
      on conflict (slug) do update set name = excluded.name returning id`
    await sql`delete from public.feeds where merchant_id = ${m!.id}`
    const [f] = await sql<{ id: string }[]>`
      insert into public.feeds (merchant_id, format, url, adapter) values (${m!.id}, 'csv', ${`file://${file}`}, 'generic-csv') returning id`

    const deps = { sql, rawStore: new LocalRawStore(join(ROOT_DIR, '.local/test-raw-feeds')), fileRoots: [dir] }
    let peakRss = 0
    let peakHeap = 0
    const timer = setInterval(() => {
      const mu = process.memoryUsage()
      peakRss = Math.max(peakRss, mu.rss)
      peakHeap = Math.max(peakHeap, mu.heapUsed)
    }, 50)
    const baseRss = process.memoryUsage().rss

    const t1 = Date.now()
    const first = await runFeed(f!.id, deps)
    const firstMs = Date.now() - t1
    const t2 = Date.now()
    const second = await runFeed(f!.id, deps)
    const secondMs = Date.now() - t2
    // árváltozás minden tételen (a leggyakoribb valós eset): csak az ajánlat és az ártörténet íródik
    await writeFeed(file, 50_000, 10)
    const t3 = Date.now()
    const third = await runFeed(f!.id, deps)
    const thirdMs = Date.now() - t3
    clearInterval(timer)

    const mb = (b: number) => Math.round(b / 1024 / 1024)
    const metrics = JSON.stringify(
      {
        firstMs,
        secondMs,
        thirdMs,
        first: { valid: first.valid, changed: first.changed },
        second: { changed: second.changed },
        third: { changed: third.changed, priceDaily: third.publish?.priceDailyWritten },
        baseRssMb: mb(baseRss),
        peakRssMb: mb(peakRss),
        peakHeapMb: mb(peakHeap),
      },
      null,
      2,
    )
    mkdirSync(join(ROOT_DIR, 'tests/.artifacts/perf'), { recursive: true })
    writeFileSync(join(ROOT_DIR, 'tests/.artifacts/perf/ingest-50k.json'), metrics)
    expect(first).toMatchObject({ status: 'success', valid: 50_000, changed: 50_000 })
    expect(second).toMatchObject({ status: 'success', changed: 0 })
    expect(third).toMatchObject({ status: 'success', changed: 50_000 })
    expect(firstMs).toBeLessThan(10 * 60_000)
    // stabil memória: a csúcs nem nő a sorok számával arányosan (50 000 tétel ≈ 30 MB nyers adat)
    expect(mb(peakHeap)).toBeLessThan(400)
  })
})
