/**
 * A `--fixtures` import feedjei: minden adapter egy [DEMO] kereskedőn, a `tests/fixtures/feeds/` fájljain.
 * Idempotens (a feedet a `config.fixture` jelölő azonosítja). Production adatbázison nem fut.
 */
import type { Sql } from 'postgres'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const FIXTURE_NETWORKS = [
  { code: 'awin', name: 'Awin', subidParam: 'clickref', subidMaxLen: 50, trackingDomains: ['www.awin1.com'] },
  { code: 'cj', name: 'CJ Affiliate', subidParam: 'sid', subidMaxLen: 64, trackingDomains: ['www.anrdoezrs.net', 'www.jdoqocy.com', 'www.tkqlhce.com', 'www.dpbolvw.net', 'www.kqzyfj.com'] },
  { code: 'dognet', name: 'Dognet', subidParam: 'data1', subidMaxLen: 50, trackingDomains: ['go.dognet.com'] },
  { code: 'admitad', name: 'Admitad', subidParam: 'subid', subidMaxLen: 120, trackingDomains: ['ad.admitad.com'] },
  { code: 'direct', name: 'Közvetlen partner', subidParam: 'subid', subidMaxLen: 64, trackingDomains: [] },
  { code: 'manual', name: 'Kézi felvitel', subidParam: null, subidMaxLen: null, trackingDomains: [] },
] as const

export interface FixtureFeedDef {
  fixture: string
  merchant: { slug: string; name: string; network: (typeof FIXTURE_NETWORKS)[number]['code']; domain: string }
  adapter: string
  format: 'csv' | 'xml' | 'json'
  file?: string
  config?: Record<string, unknown>
}

export const FIXTURE_FEEDS: FixtureFeedDef[] = [
  { fixture: 'awin', merchant: { slug: 'demo-napfeny-drogeria', name: '[DEMO] Napfény Drogéria', network: 'awin', domain: 'napfeny-drogeria.example' }, adapter: 'awin', format: 'csv', file: 'awin/napfeny-drogeria.csv.gz' },
  { fixture: 'cj', merchant: { slug: 'demo-borkert-patika', name: '[DEMO] Bőrkert Patika', network: 'cj', domain: 'borkert-patika.example' }, adapter: 'cj', format: 'csv', file: 'cj/borkert-patika.csv' },
  { fixture: 'dognet', merchant: { slug: 'demo-illat-haza', name: '[DEMO] Illat Háza', network: 'dognet', domain: 'illat-haza.example' }, adapter: 'dognet', format: 'xml', file: 'dognet/illat-haza.xml' },
  { fixture: 'generic-csv', merchant: { slug: 'demo-levendula-webshop', name: '[DEMO] Levendula Webshop', network: 'direct', domain: 'levendula-webshop.example' }, adapter: 'generic-csv', format: 'csv', file: 'generic-csv/levendula-webshop-win1250.csv' },
  { fixture: 'generic-xml', merchant: { slug: 'demo-fenyes-otthon', name: '[DEMO] Fényes Otthon', network: 'direct', domain: 'fenyes-otthon.example' }, adapter: 'generic-xml', format: 'xml', file: 'generic-xml/fenyes-otthon.xml' },
  { fixture: 'admitad', merchant: { slug: 'demo-selyem-illat', name: '[DEMO] Selyem és Illat', network: 'admitad', domain: 'selyem-illat.example' }, adapter: 'admitad', format: 'xml', file: 'admitad/selyem-illat.yml.xml' },
  {
    fixture: 'manual',
    merchant: { slug: 'demo-kezmuves-sarok', name: '[DEMO] Kézműves Sarok', network: 'manual', domain: 'kezmuves-sarok.example' },
    adapter: 'manual',
    format: 'json',
    config: {
      items: [
        { sku: 'KS-1', name: 'Kézzel öntött méhviasz gyertya 180 g', price: '5490', url: 'https://kezmuves-sarok.example/gyertya', brand: 'Kézműves Sarok', category: 'Otthon', description: 'Tiszta méhviasz, pamutkanóc.' },
        { sku: 'KS-2', name: 'Levendulás kecsketejes szappan 100 g', price: '1990', url: 'https://kezmuves-sarok.example/szappan', brand: 'Kézműves Sarok', category: 'Testápolás', description: 'Hidegen sajtolt, illóolajmentes változat.' },
        { sku: 'KS-3', name: 'Horgolt kozmetikai táska', price: '6990', url: 'https://kezmuves-sarok.example/taska', brand: 'Kézműves Sarok', category: 'Divat', availability: 'elfogyott' },
        { sku: 'KS-4', name: 'Ajándékcsomag: szappan és gyertya', price: '7990', salePrice: '6990', url: 'https://kezmuves-sarok.example/csomag', brand: 'Kézműves Sarok', category: 'Ajándékcsomag' },
        { sku: 'KS-5', name: 'Rózsás ajakbalzsam 10 ml', price: '1490', url: 'https://kezmuves-sarok.example/balzsam', brand: 'Kézműves Sarok', category: 'Smink' },
      ],
    },
  },
]

export async function assertNotProduction(sql: Sql): Promise<void> {
  const [row] = await sql<{ v: string | null }[]>`select current_setting('app.environment', true) as v`
  if (row?.v === 'production') {
    throw new Error('Ez az adatbázis production-nek van jelölve: a fixture-feedek nem kerülnek bele.')
  }
}

/** Feltölti a fixture-hálózatokat, -kereskedőket és -feedeket; visszaadja a feed-azonosítókat. */
export async function ensureFixtureFeeds(sql: Sql, fixturesDir: string): Promise<{ id: string; fixture: string }[]> {
  await assertNotProduction(sql)
  const networkIds = new Map<string, string>()
  for (const n of FIXTURE_NETWORKS) {
    const [row] = await sql<{ id: string }[]>`
      insert into public.networks (code, name, subid_param, subid_max_len, tracking_domains)
      values (${n.code}, ${n.name}, ${n.subidParam}, ${n.subidMaxLen}, ${sql.array([...n.trackingDomains])})
      on conflict (code) do update set tracking_domains = excluded.tracking_domains
      returning id`
    networkIds.set(n.code, row!.id)
  }
  const out: { id: string; fixture: string }[] = []
  for (const f of FIXTURE_FEEDS) {
    const [m] = await sql<{ id: string }[]>`
      insert into public.merchants (network_id, slug, name, domain_allowlist, program_id, status, is_comparison_allowed,
        shipping_fee_huf, free_shipping_threshold_huf, delivery_days_min, delivery_days_max, return_days)
      values (${networkIds.get(f.merchant.network)!}, ${f.merchant.slug}, ${f.merchant.name}, ${sql.array([f.merchant.domain])},
        'DEMO', 'active', true, 990, 14990, 1, 3, 14)
      on conflict (slug) do update set domain_allowlist = excluded.domain_allowlist, network_id = excluded.network_id
      returning id`
    const url = f.file ? pathToFileURL(join(fixturesDir, f.file)).href : null
    const config = { ...(f.config ?? {}), fixture: f.fixture }
    const [existing] = await sql<{ id: string }[]>`select id from public.feeds where config->>'fixture' = ${f.fixture}`
    if (existing) {
      await sql`update public.feeds set merchant_id = ${m!.id}, url = ${url}, adapter = ${f.adapter}, format = ${f.format},
        config = ${JSON.stringify(config)}::text::jsonb, is_active = true where id = ${existing.id}`
      out.push({ id: existing.id, fixture: f.fixture })
    } else {
      const [row] = await sql<{ id: string }[]>`
        insert into public.feeds (merchant_id, format, url, adapter, config, is_active)
        values (${m!.id}, ${f.format}, ${url}, ${f.adapter}, ${JSON.stringify(config)}::text::jsonb, true) returning id`
      out.push({ id: row!.id, fixture: f.fixture })
    }
  }
  return out
}
