import { spawnSync } from 'node:child_process'
import { drizzle } from 'drizzle-orm/postgres-js'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ensureFixtureFeeds, FIXTURE_FEEDS } from '../../src/lib/db/seed/fixture-feeds'
import { seedCatalog } from '../../src/lib/db/seed/run'
import { LocalRawStore } from '../../src/lib/ingestion/pipeline/raw-store'
import { runFeed } from '../../src/lib/ingestion/pipeline/run'
import { ROOT_DIR } from './env'
import { testSql } from './helpers'

const sql = testSql()
const FIX = join(ROOT_DIR, 'tests/fixtures/feeds')
const rawStore = new LocalRawStore(join(ROOT_DIR, '.local/test-raw-feeds'))
const CATALOG_TABLES = ['products', 'offers', 'source_items', 'price_daily', 'product_tags', 'brands']

/** Soronkénti írásszámláló a katalógus-táblákon (csak a teszt-adatbázisban). */
async function installWriteCounter() {
  await sql`create table if not exists public._write_counter (tbl text primary key, n bigint not null default 0)`
  await sql`
    create or replace function public._count_write() returns trigger language plpgsql as $$
    begin
      insert into public._write_counter (tbl, n) values (tg_table_name, 1)
      on conflict (tbl) do update set n = public._write_counter.n + 1;
      return null;
    end $$`
  for (const t of CATALOG_TABLES) {
    await sql.unsafe(`drop trigger if exists _count_write on public.${t}`)
    await sql.unsafe(`create trigger _count_write after insert or update or delete on public.${t} for each row execute function public._count_write()`)
  }
}
async function writes(): Promise<number> {
  const [r] = await sql<{ n: string | null }[]>`select sum(n)::text as n from public._write_counter`
  return Number(r?.n ?? 0)
}

let networkId = ''
let merchantId = ''
async function manualFeed(items: Record<string, unknown>[], slug = `teszt-${Math.random().toString(36).slice(2, 8)}`) {
  const [m] = await sql<{ id: string }[]>`
    insert into public.merchants (network_id, slug, name, domain_allowlist, status)
    values (${networkId}, ${slug}, ${`[TESZT] ${slug}`}, ${sql.array(['teszt-bolt.example'])}, 'active') returning id`
  merchantId = m!.id
  const [f] = await sql<{ id: string }[]>`
    insert into public.feeds (merchant_id, format, adapter, config) values (${m!.id}, 'json', 'manual', ${sql.json({ items } as never)})
    returning id`
  return f!.id
}
const setItems = (feedId: string, items: Record<string, unknown>[]) =>
  sql`update public.feeds set config = ${sql.json({ items } as never)} where id = ${feedId}`
const item = (sku: string, price: number, extra: Record<string, unknown> = {}) => ({
  sku,
  name: `Teszt szérum ${sku} 30 ml`,
  price: String(price),
  url: `https://teszt-bolt.example/${sku}`,
  brand: 'Teszt Márka',
  category: 'Arcápolás > Szérum',
  ...extra,
})
const run = (feedId: string, now?: Date) => runFeed(feedId, { sql, rawStore, fileRoots: [FIX], now: now ? () => now : undefined })

beforeAll(async () => {
  await seedCatalog(sql, { products: 0 })
  await installWriteCounter()
  const [n] = await sql<{ id: string }[]>`
    insert into public.networks (code, name) values ('manual', 'Kézi felvitel') on conflict (code) do update set name = excluded.name returning id`
  networkId = n!.id
})

afterAll(async () => {
  for (const t of CATALOG_TABLES) await sql.unsafe(`drop trigger if exists _count_write on public.${t}`)
  await sql`drop table if exists public._write_counter`
  const slugs = [...FIXTURE_FEEDS.map((f) => f.merchant.slug)]
  await sql`delete from public.products p where exists (select 1 from public.offers o join public.merchants m on m.id = o.merchant_id
    where o.product_id = p.id and (m.slug = any(${sql.array(slugs)}) or m.slug like 'teszt-%'))`
  await sql`delete from public.merchants where slug = any(${sql.array(slugs)}) or slug like 'teszt-%'`
  await sql`delete from public.feeds where config ? 'fixture'`
  await sql.end()
})

describe('fixture-import (mind a 7 adapter)', () => {
  let ids: { id: string; fixture: string }[] = []
  it('minden feed sikeres; a hibás sorok nem állítják meg a futást', async () => {
    ids = await ensureFixtureFeeds(sql, FIX)
    // sorban, ahogy a `pnpm ingest --all` is fut (a közös GTIN-ű termék tulajdonosa így determinisztikus)
    const results = []
    for (const f of ids) results.push(await run(f.id))
    for (const r of results) expect(r.status, `${r.merchantSlug}: ${r.blockedReason ?? r.error ?? ""}`).toBe("success")
    const byFixture = Object.fromEntries(results.map((r, i) => [ids[i]!.fixture, r]))
    expect(byFixture.awin).toMatchObject({ seen: 26, valid: 22, rejected: 4 })
    expect(byFixture.awin!.rejectReasons).toEqual({ encoding: 1, invalid_price: 1, missing_field: 1, url_not_allowed: 1 })
    expect(byFixture.cj).toMatchObject({ valid: 20, rejected: 2 })
    expect(byFixture['generic-csv']).toMatchObject({ valid: 16, rejected: 1 })
    const [sample] = await sql<{ error_sample: { reason: string }[] }[]>`
      select error_sample from public.feed_runs where feed_id = ${ids.find((f) => f.fixture === 'awin')!.id} order by started_at desc limit 1`
    expect(sample!.error_sample.map((e) => e.reason).sort()).toEqual(['encoding', 'invalid_price', 'missing_field', 'url_not_allowed'])
  })

  it('a feedben lévő HTML és script a DB-ben tisztított szöveg', async () => {
    const [p] = await sql<{ n: number }[]>`
      select count(*)::int as n from public.products
      where description_clean ~* '<\\s*/?\\s*[a-z]|alert\\(|onerror|javascript:' or name ~ '[<>]'`
    expect(p!.n).toBe(0)
    const [s] = await sql<{ n: number }[]>`
      select count(*)::int as n from public.source_items where payload::text ~* '<\\s*/?\\s*script|alert\\(|onerror'`
    expect(s!.n).toBe(0)
    const [d] = await sql<{ d: string }[]>`
      select s.payload->>'description' as d from public.source_items s join public.feeds f on f.id = s.feed_id
      where f.config->>'fixture' = 'awin' and s.merchant_sku = 'ND-1003'`
    expect(d!.d).toBe('Könnyű gél állag.\nKattints')
    // a termék tulajdonosa az első kereskedő (Awin), ezért a termékszöveg is a tisztított változat
    const [pd] = await sql<{ d: string }[]>`select description_clean as d from public.products where name like 'Dermavera Niacinamidos%'`
    expect(pd!.d).toBe('Könnyű gél állag.\nKattints')
  })

  it('azonos GTIN több boltnál → egy termék, több ajánlat', async () => {
    const [r] = await sql<{ n: number }[]>`
      select count(o.id)::int as n from public.products p join public.offers o on o.product_id = p.id
      where p.name = 'Borostyán Műhely Fügés illatgyertya 200 g'`
    expect(r!.n).toBe(6)
  })

  it('változatlan feed újrafuttatása: 0 írás a katalógusban', async () => {
    const before = await writes()
    const results = []
    for (const f of ids) results.push(await run(f.id))
    for (const r of results) expect(r).toMatchObject({ status: 'success', changed: 0 })
    expect((await writes()) - before).toBe(0)
  })

  it('a nyers pillanatkép elmentve', async () => {
    const [r] = await sql<{ p: string | null }[]>`
      select raw_object_path as p from public.feed_runs where feed_id = ${ids[0]!.id} order by started_at desc limit 1`
    expect(r!.p).toMatch(/^feeds\/[0-9a-f-]+\/[0-9a-f-]+\.csv\.gz$/)
  })
})

describe('ártörténet (price_daily)', () => {
  it('két eltérő árú futás után helyes: min = legkisebb, last = utolsó; új napon új sor', async () => {
    const feed = await manualFeed([item('A1', 10000)])
    const day1 = new Date('2026-09-23T06:00:00Z')
    expect((await run(feed, day1)).status).toBe('success')
    await setItems(feed, [item('A1', 9000)])
    await run(feed, new Date('2026-09-23T14:00:00Z'))
    let rows = await sql<{ day: string; min: number; last: number }[]>`
      select to_char(pd.day, 'YYYY-MM-DD') as day, pd.price_min_huf as min, pd.price_last_huf as last
      from public.price_daily pd join public.offers o on o.id = pd.offer_id where o.merchant_id = ${merchantId} order by pd.day`
    expect(rows).toEqual([{ day: '2026-09-23', min: 9000, last: 9000 }])
    await setItems(feed, [item('A1', 9500)])
    await run(feed, new Date('2026-09-23T15:00:00Z'))
    await run(feed, new Date('2026-09-24T06:00:00Z'))
    rows = await sql`
      select to_char(pd.day, 'YYYY-MM-DD') as day, pd.price_min_huf as min, pd.price_last_huf as last
      from public.price_daily pd join public.offers o on o.id = pd.offer_id where o.merchant_id = ${merchantId} order by pd.day`
    expect(rows).toEqual([
      { day: '2026-09-23', min: 9000, last: 9500 },
      { day: '2026-09-24', min: 9500, last: 9500 },
    ])
    const [o] = await sql<{ price: number; changed: Date }[]>`
      select price_huf as price, last_price_change_at as changed from public.offers where merchant_id = ${merchantId}`
    expect(o!.price).toBe(9500)
    expect(o!.changed.toISOString()).toBe('2026-09-23T15:00:00.000Z')
  })
})

describe('minőségi kapu', () => {
  it('60% alatti tételszám → blocked, semmi nem publikálódik, a riasztás kimegy', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => item(`G${i}`, 1000 + i))
    const feed = await manualFeed(ten)
    expect((await run(feed)).status).toBe('success')
    await setItems(feed, ten.slice(0, 5).map((x) => ({ ...x, price: '1' })))
    const before = await writes()

    // a scriptet futtatjuk, hogy a riasztó levél útja is le legyen fedve (e-mail szolgáltató nélkül naplóba megy)
    const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/ingest.ts', '--feed', feed, '--quiet'], {
      cwd: ROOT_DIR,
      env: { ...process.env, INGEST_DATABASE_URL: process.env.TEST_DATABASE_URL, ADMIN_ALERT_EMAIL: 'admin@teszt.local', SMTP_URL: '', RESEND_API_KEY: '', FEED_RAW_STORE: 'local' },
      encoding: 'utf8',
    })
    expect(res.status).toBe(0)
    expect(res.stdout + res.stderr).toContain('[e-mail, csak napló] admin@teszt.local · [JóVétel] Feed blokkolva')

    expect((await writes()) - before).toBe(0)
    const [r] = await sql<{ status: string; blocked_reason: string }[]>`
      select status, blocked_reason from public.feed_runs where feed_id = ${feed} order by started_at desc limit 1`
    expect(r!.status).toBe('blocked')
    expect(r!.blocked_reason).toMatch(/50%.*60%/)
    const [f] = await sql<{ n: number }[]>`select last_item_count as n from public.feeds where id = ${feed}`
    expect(f!.n).toBe(10)
    const [p] = await sql<{ n: number }[]>`select count(*)::int as n from public.offers where merchant_id = ${merchantId} and price_huf = 1`
    expect(p!.n).toBe(0)
  })

  it('20% feletti elutasítás → blocked', async () => {
    const feed = await manualFeed([item('R1', 1000), item('R2', 1000), item('R3', 1000), item('R4', 1000), { ...item('R5', 1000), price: '-5' }, { ...item('R6', 1000), url: 'https://mas.example/x' }])
    const r = await run(feed)
    expect(r.status).toBe('blocked')
    expect(r.blockedReason).toMatch(/33%/)
  })
})

describe('a Next-szerver közös kliense', () => {
  it('a Drizzle-lel közös postgres.js-kliensen is fut (admin „Futtatás most”), a naplózás is', async () => {
    const shared = testSql()
    drizzle(shared) // a Drizzle kikapcsolja a Date/JSON szerializálókat ugyanezen a kliensen
    const feed = await manualFeed([item('Z1', 1000), item('Z2', 2000)])
    const r = await runFeed(feed, { sql: shared, rawStore })
    expect(r.status).toBe('success')
    const [run] = await shared<{ t: string }[]>`select jsonb_typeof(stats) as t from public.feed_runs where feed_id = ${feed} order by started_at desc limit 1`
    expect(run!.t).toBe('object')
    await shared.end()
  })
})

describe('kihagyott ajánlatok és duplikátumok', () => {
  it('2 egymást követő kihagyás után inaktív; utána nem írjuk újra; visszatéréskor újra aktív', async () => {
    const feed = await manualFeed([item('M1', 1000), item('M2', 2000), item('M3', 3000)])
    await run(feed)
    await setItems(feed, [item('M1', 1000), item('M2', 2000)])
    await run(feed)
    const state = async () =>
      (await sql<{ missed: number; active: boolean }[]>`select missed_runs as missed, is_active as active from public.offers where merchant_id = ${merchantId} and merchant_sku = 'M3'`)[0]
    expect(await state()).toEqual({ missed: 1, active: true })
    await run(feed)
    expect(await state()).toEqual({ missed: 2, active: false })
    const before = await writes()
    await run(feed)
    expect((await writes()) - before).toBe(0)
    await setItems(feed, [item('M1', 1000), item('M2', 2000), item('M3', 3000)])
    const r = await run(feed)
    expect(r.publish!.reactivated).toBe(1)
    expect(await state()).toEqual({ missed: 0, active: true })
  })

  it('ugyanarra a feedre két egyidejű futásból csak egy fut (részleges egyedi index)', async () => {
    const feed = await manualFeed([item('P1', 1000), item('P2', 2000)])
    const [a, b] = await Promise.all([run(feed), run(feed)])
    const statuses = [a!.status, b!.status].sort()
    expect(statuses).toEqual(['skipped', 'success'])
    expect([a!.error, b!.error].filter(Boolean)).toEqual(['Már fut egy import erre a feedre.'])
  })

  it('ugyanaz a SKU kétszer: a második elutasítva', async () => {
    const feed = await manualFeed([item('D1', 1000), item('D1', 1200), item('D2', 1000), item('D3', 1000), item('D4', 1000), item('D5', 1000)])
    const r = await run(feed)
    expect(r.status).toBe('success')
    expect(r.rejectReasons).toEqual({ duplicate_sku: 1 })
  })
})
