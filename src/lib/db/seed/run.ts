/**
 * Fejlesztői seed (DATA_MODEL 6. pont). SOHA nem fut production-ben (a hívó és a DB-jelző is ellenőrzi).
 * Kategóriafa · 3 hálózat · 3 [DEMO] kereskedő · N minta-termék · 45 nap szintetikus ártörténet ·
 * fogyási alapértékek · teljes névnaptár · admin felhasználó · 3 szerkesztői útmutató-váz.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Sql } from 'postgres'
import { CATEGORY_TREE, flattenCategories, USAGE_DEFAULTS } from './categories'
import { generateProducts, type SeedProduct } from './products'
import { rng, roundPrice, type Rng } from './random'

export const DEMO_NETWORKS = [
  {
    code: 'awin',
    name: 'Awin',
    subidParam: 'clickref',
    subidMaxLen: 50,
    trackingDomains: ['www.awin1.com'],
    notes:
      'TODO(owner): a subID és a tracking-domain ellenőrzendő a hálózati felületen (OPEN_QUESTIONS #5).',
  },
  {
    code: 'dognet',
    name: 'Dognet',
    subidParam: 'data1',
    subidMaxLen: 50,
    trackingDomains: ['go.dognet.com'],
    notes: 'TODO(owner): a subID paraméter neve és hossza nincs ellenőrizve (OPEN_QUESTIONS #5).',
  },
  {
    code: 'cj',
    name: 'CJ Affiliate',
    subidParam: 'sid',
    subidMaxLen: 64,
    trackingDomains: [
      'www.anrdoezrs.net',
      'www.jdoqocy.com',
      'www.tkqlhce.com',
      'www.dpbolvw.net',
      'www.kqzyfj.com',
    ],
    notes: 'TODO(owner): a subID hosszkorlátja ellenőrzendő (OPEN_QUESTIONS #5).',
  },
] as const

export const DEMO_MERCHANTS = [
  {
    slug: 'demo-napfeny-drogeria',
    name: '[DEMO] Napfény Drogéria',
    network: 'awin',
    domain: 'napfeny-drogeria.example',
    shippingFeeHuf: 990,
    freeShippingThresholdHuf: 14990,
    deliveryDays: [1, 3],
    returnDays: 14,
    quality: 0.8,
  },
  {
    slug: 'demo-illat-haza',
    name: '[DEMO] Illat Háza',
    network: 'dognet',
    domain: 'illat-haza.example',
    shippingFeeHuf: 1290,
    freeShippingThresholdHuf: 19990,
    deliveryDays: [2, 4],
    returnDays: 30,
    quality: 0.7,
  },
  {
    slug: 'demo-borkert-patika',
    name: '[DEMO] Bőrkert Patika',
    network: 'cj',
    domain: 'borkert-patika.example',
    shippingFeeHuf: 1490,
    freeShippingThresholdHuf: null,
    deliveryDays: [1, 2],
    returnDays: 14,
    quality: 0.9,
  },
] as const

type Scenario = 'stable' | 'real_deal' | 'feed_claims_discount' | 'pricier' | 'young' | 'volatile'

export interface SeedOptions {
  products?: number
  historyDays?: number
  now?: Date
  seed?: number
  /** auth-felhasználó létrehozása (GoTrue admin API vagy tesztben közvetlen insert); visszaadja az id-t */
  createAuthUser?: (email: string) => Promise<string | null>
  adminEmail?: string | null
  log?: (m: string) => void
  withNamedays?: boolean
}

function dayString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function pickScenario(r: Rng): Scenario {
  const x = r.next()
  if (x < 0.45) return 'stable'
  if (x < 0.6) return 'real_deal'
  if (x < 0.72) return 'feed_claims_discount'
  if (x < 0.82) return 'pricier'
  if (x < 0.92) return 'young'
  return 'volatile'
}

/** Szintetikus napi ártörténet egy ajánlatra: [nap, min, utolsó, készleten]. Az utolsó elem a mai nap. */
export function priceHistory(r: Rng, base: number, days: number, scenario: Scenario) {
  const out: { dayOffset: number; min: number; last: number; inStock: boolean }[] = []
  const len = scenario === 'young' ? 9 : days
  for (let i = len - 1; i >= 0; i--) {
    let p = base
    if (scenario === 'volatile') p = roundPrice(base * (0.9 + r.next() * 0.2))
    if (scenario === 'real_deal' && i === 0) p = roundPrice(base * 0.84)
    if (scenario === 'pricier' && i <= 3) p = roundPrice(base * 1.12)
    if (scenario === 'stable' && r.chance(0.08)) p = roundPrice(base * (0.98 + r.next() * 0.04))
    const min = r.chance(0.1) ? roundPrice(p * 0.99) : p
    out.push({ dayOffset: i, min: Math.min(min, p), last: p, inStock: !r.chance(0.02) })
  }
  return out
}

/**
 * Névnaptár — FORRÁS (a fájl fejlécében SHA-256-tal és egyezési statisztikával):
 *  - MEK: az Országos Széchényi Könyvtár Magyar Elektronikus Könyvtárának névnap-gyűjteménye
 *    (github.com/davidfegyver/nevnapok-json), a fő névnap „*” jelölésével → is_primary;
 *  - magyar Wikipedia „Magyar névnapok listája dátum szerint” (nevnap npm, MIT) → in_calendar;
 *  - magyar Wikipedia „Magyar névnapok listája betűrendben” (smega/nevnap-json-adatbazis).
 * Előállítás: scripts/db/build-namedays.ts. Emlékezetből generált adat nincs benne.
 */
const NAMEDAYS_FILE = join(import.meta.dirname, 'data/namedays.json')

export async function importNamedays(sql: Sql): Promise<number> {
  const data = JSON.parse(readFileSync(NAMEDAYS_FILE, 'utf8')) as {
    rows: [string, number, number, 0 | 1, 0 | 1, number | null, string][]
  }
  await sql`delete from public.namedays`
  const rows = data.rows.map(([name, month, day, primary, calendar, rank, source]) => ({
    name,
    month,
    day,
    is_primary: primary === 1,
    in_calendar: calendar === 1,
    calendar_rank: rank,
    source,
  }))
  for (let i = 0; i < rows.length; i += 2000) {
    const chunk = rows.slice(i, i + 2000)
    await sql`insert into public.namedays ${sql(chunk, 'name', 'month', 'day', 'is_primary', 'in_calendar', 'calendar_rank', 'source')}`
  }
  return rows.length
}

export async function seedCatalog(sql: Sql, opts: SeedOptions = {}) {
  const log = opts.log ?? (() => {})
  const r = rng(opts.seed ?? 20260922)
  const now = opts.now ?? new Date()
  const historyDays = opts.historyDays ?? 45
  const productCount = opts.products ?? 300

  // Kategóriák
  const flat = flattenCategories(CATEGORY_TREE)
  const catIds = new Map<string, string>()
  for (const c of flat) {
    const parentId = c.parentPath ? catIds.get(c.parentPath)! : null
    const [row] = await sql<{ id: string }[]>`
      insert into public.categories (slug, name, parent_id, path, slot_id, sort)
      values (${c.slug}, ${c.name}, ${parentId}, ${c.path}, ${c.slot}, ${c.sort})
      on conflict (path) do update set name = excluded.name, parent_id = excluded.parent_id,
        slot_id = excluded.slot_id, sort = excluded.sort
      returning id`
    catIds.set(c.path, row!.id)
  }
  log(`kategóriák: ${flat.length}`)

  for (const u of USAGE_DEFAULTS) {
    await sql`
      insert into public.usage_defaults (category_id, unit, daily_amount, note)
      values (${catIds.get(u.path)!}, ${u.unit}, ${u.daily}, '[BECSLÉS] induló érték (PRODUCT_SPEC 7.5)')
      on conflict (category_id) do update set unit = excluded.unit, daily_amount = excluded.daily_amount`
  }

  // Hálózatok és kereskedők
  const networkIds = new Map<string, string>()
  for (const n of DEMO_NETWORKS) {
    const [row] = await sql<{ id: string }[]>`
      insert into public.networks (code, name, subid_param, subid_max_len, tracking_domains, notes)
      values (${n.code}, ${n.name}, ${n.subidParam}, ${n.subidMaxLen}, ${sql.array([...n.trackingDomains])}, ${n.notes})
      on conflict (code) do update set name = excluded.name, subid_param = excluded.subid_param,
        subid_max_len = excluded.subid_max_len, tracking_domains = excluded.tracking_domains, notes = excluded.notes
      returning id`
    networkIds.set(n.code, row!.id)
  }
  const merchantIds: { id: string; def: (typeof DEMO_MERCHANTS)[number] }[] = []
  for (const m of DEMO_MERCHANTS) {
    const [row] = await sql<{ id: string }[]>`
      insert into public.merchants (network_id, slug, name, domain_allowlist, program_id, status,
        shipping_fee_huf, free_shipping_threshold_huf, customs_fee_huf, delivery_days_min, delivery_days_max,
        return_days, quality_score, is_comparison_allowed)
      values (${networkIds.get(m.network)!}, ${m.slug}, ${m.name}, ${sql.array([m.domain])}, 'DEMO', 'active',
        ${m.shippingFeeHuf}, ${m.freeShippingThresholdHuf}, 0, ${m.deliveryDays[0]}, ${m.deliveryDays[1]},
        ${m.returnDays}, ${m.quality}, true)
      on conflict (slug) do update set name = excluded.name, shipping_fee_huf = excluded.shipping_fee_huf,
        free_shipping_threshold_huf = excluded.free_shipping_threshold_huf, quality_score = excluded.quality_score
      returning id`
    merchantIds.push({ id: row!.id, def: m })
    await sql`
      insert into public.feeds (merchant_id, format, url, adapter, schedule_cron, is_active, config)
      select ${row!.id}, 'csv', null, 'manual', null, false, '{"demo": true}'::jsonb
      where not exists (select 1 from public.feeds where merchant_id = ${row!.id})`
  }

  // Termékek (a demó-kereskedők korábbi ajánlatait és termékeit előbb töröljük: idempotens)
  await sql`delete from public.products p where exists (
    select 1 from public.offers o join public.merchants m on m.id = o.merchant_id
    where o.product_id = p.id and m.slug like 'demo-%')`
  const products = generateProducts(r, productCount)
  const brandIds = new Map<string, string>()
  for (const b of new Set(products.map((p) => p.brand))) {
    const slug = b
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
    const [row] = await sql<{ id: string }[]>`
      insert into public.brands (slug, name) values (${slug}, ${b})
      on conflict (slug) do update set name = excluded.name returning id`
    brandIds.set(b, row!.id)
  }
  const catNames = new Map(flat.map((c) => [c.path, c]))
  const categoryText = (path: string) =>
    path
      .split('/')
      .map((_, i, parts) => catNames.get(parts.slice(0, i + 1).join('/'))?.name)
      .filter(Boolean)
      .join(' ')

  const productRows = products.map((p: SeedProduct) => ({
    slug: p.slug,
    brand_id: brandIds.get(p.brand)!,
    category_id: catIds.get(p.categoryPath)!,
    name: p.name,
    brand_name: p.brand,
    category_text: categoryText(p.categoryPath),
    gtin: p.gtin,
    size_value: p.sizeValue,
    size_unit: p.sizeUnit,
    description_clean: p.description,
    image_url: null,
    is_indexable: true,
  }))
  const productIds: string[] = []
  for (let i = 0; i < productRows.length; i += 1000) {
    const chunk = productRows.slice(i, i + 1000)
    const ids = await sql<{ id: string }[]>`
      insert into public.products ${sql(chunk, 'slug', 'brand_id', 'category_id', 'name', 'brand_name', 'category_text', 'gtin', 'size_value', 'size_unit', 'description_clean', 'image_url', 'is_indexable')}
      on conflict (slug) do update set name = excluded.name
      returning id`
    productIds.push(...ids.map((x) => x.id))
  }

  // Címkék (szabályalapú)
  const tagRows = products.flatMap((p, i) =>
    p.tags.map((tag) => ({ product_id: productIds[i]!, tag, source: 'rule' })),
  )
  for (let i = 0; i < tagRows.length; i += 5000) {
    await sql`insert into public.product_tags ${sql(tagRows.slice(i, i + 5000), 'product_id', 'tag', 'source')} on conflict do nothing`
  }

  // Ajánlatok és ártörténet
  await sql`select public.ensure_price_daily_partitions(${dayString(new Date(now.getTime() - (historyDays + 40) * 864e5))}::date, 6)`
  interface OfferRow {
    product_id: string
    merchant_id: string
    merchant_sku: string
    url: string
    price_huf: number
    old_price_huf: number | null
    in_stock: boolean
    last_seen_at: string
    is_active: boolean
  }
  const offerRows: OfferRow[] = []
  const history: { idx: number; hist: ReturnType<typeof priceHistory> }[] = []
  products.forEach((p, i) => {
    const count = r.int(1, 3)
    const chosen = [...merchantIds].sort(() => r.next() - 0.5).slice(0, count)
    for (const m of chosen) {
      const base = roundPrice(p.basePriceHuf * (0.95 + r.next() * 0.13))
      const scenario = pickScenario(r)
      const hist = priceHistory(r, base, historyDays, scenario)
      const today = hist[hist.length - 1]!
      const lastSeen = r.chance(0.03)
        ? new Date(now.getTime() - (50 + r.int(0, 40)) * 3600e3) // 48 óránál régebbi ár
        : new Date(now.getTime() - r.int(20, 600) * 60e3)
      history.push({ idx: offerRows.length, hist })
      offerRows.push({
        product_id: productIds[i]!,
        merchant_id: m.id,
        merchant_sku: `DEMO-${m.def.slug.slice(5, 8).toUpperCase()}-${String(i).padStart(5, '0')}`,
        url: `https://${m.def.domain}/termek/${p.slug}`,
        price_huf: today.last,
        old_price_huf: scenario === 'feed_claims_discount' ? roundPrice(today.last * 1.3) : null,
        in_stock: today.inStock,
        last_seen_at: lastSeen.toISOString(),
        is_active: true,
      })
    }
  })
  const offerIds: string[] = []
  for (let i = 0; i < offerRows.length; i += 1000) {
    const ids = await sql<{ id: string }[]>`
      insert into public.offers ${sql(offerRows.slice(i, i + 1000), 'product_id', 'merchant_id', 'merchant_sku', 'url', 'price_huf', 'old_price_huf', 'in_stock', 'last_seen_at', 'is_active')}
      returning id`
    offerIds.push(...ids.map((x) => x.id))
  }
  const dailyRows = history.flatMap(({ idx, hist }) =>
    hist.map((h) => ({
      offer_id: offerIds[idx]!,
      day: dayString(new Date(now.getTime() - h.dayOffset * 864e5)),
      price_min_huf: h.min,
      price_last_huf: h.last,
      in_stock_any: h.inStock,
    })),
  )
  for (let i = 0; i < dailyRows.length; i += 5000) {
    await sql`insert into public.price_daily ${sql(dailyRows.slice(i, i + 5000), 'offer_id', 'day', 'price_min_huf', 'price_last_huf', 'in_stock_any')}
      on conflict (offer_id, day) do update set price_min_huf = excluded.price_min_huf, price_last_huf = excluded.price_last_huf`
  }
  log(
    `termékek: ${productIds.length}, ajánlatok: ${offerIds.length}, ártörténet-sorok: ${dailyRows.length}`,
  )
  return { categories: catIds, productIds, offerIds, merchantIds: merchantIds.map((m) => m.id) }
}

const GUIDES = [
  {
    slug: '10-ajandek-anyukaknak-15-ezer-alatt',
    title: '10 ajándék anyukáknak 15 ezer alatt',
    category: 'ajandek',
  },
  {
    slug: 'az-elso-szerumod-5-biztos-valasztas',
    title: 'Az első szérumod: 5 biztos választás',
    category: 'szepsegapolas/arcapolas/szerum',
  },
  { slug: 'mikulas-csomag-5-ezerbol', title: 'Mikulás-csomag 5 ezerből', category: 'ajandek' },
] as const

export async function seedUsersAndGuides(sql: Sql, opts: SeedOptions & { productIds: string[] }) {
  const log = opts.log ?? (() => {})
  let adminId: string | null = null
  if (opts.adminEmail && opts.createAuthUser) {
    adminId = await opts.createAuthUser(opts.adminEmail)
    if (adminId) {
      await sql`insert into public.profiles (user_id, display_name, role) values (${adminId}, 'Admin', 'admin')
        on conflict (user_id) do update set role = 'admin'`
      log(`admin: ${opts.adminEmail}`)
    }
  } else {
    log('admin: kihagyva (nincs SEED_ADMIN_EMAIL)')
  }
  // A szerkesztői útmutatók gazdája: az admin, vagy egy helyi „Szerkesztőség” felhasználó
  let editorId = adminId
  if (!editorId && opts.createAuthUser) {
    editorId = await opts.createAuthUser('szerkesztoseg@jovetel.local')
    if (editorId) {
      await sql`insert into public.profiles (user_id, display_name, role) values (${editorId}, 'Szerkesztőség', 'admin')
        on conflict (user_id) do nothing`
    }
  }
  if (!editorId) return { adminId, guides: 0 }
  for (const [gi, g] of GUIDES.entries()) {
    const [list] = await sql<{ id: string }[]>`
      insert into public.lists (owner_id, type, title, slug, intro, cover_slot, visibility, is_indexable, published_at)
      values (${editorId}, 'editorial', ${g.title}, ${g.slug},
        ${'[KITÖLTENDŐ] A szerkesztői bevezetőt a tulajdonos írja (PRODUCT_SPEC 9. pont). Indexelés csak ≥ 5 tétel és ≥ 150 szó esetén.'},
        'utmutato.boritokep', 'public', false, now())
      on conflict (slug) where type in ('editorial', 'creator') and slug is not null
      do update set title = excluded.title
      returning id`
    const items = await sql<{ id: string }[]>`
      select p.id from public.products p join public.categories c on c.id = p.category_id
      where c.path like ${g.category + '%'} order by p.slug offset ${gi * 5} limit 5`
    for (const [pos, it] of items.entries()) {
      await sql`insert into public.list_items (list_id, product_id, note, position)
        values (${list!.id}, ${it.id}, '[KITÖLTENDŐ] szerkesztői megjegyzés', ${pos})
        on conflict (list_id, product_id) do nothing`
    }
  }
  log(`útmutató-vázak: ${GUIDES.length}`)
  return { adminId, guides: GUIDES.length }
}

/** A teljes fejlesztői seed. A hívó felelős a környezet-ellenőrzésért (scripts/db/seed.ts). */
export async function runSeed(sql: Sql, opts: SeedOptions = {}) {
  const log = opts.log ?? (() => {})
  const env = await sql<
    { v: string | null }[]
  >`select current_setting('app.environment', true) as v`
  if (env[0]?.v === 'production') {
    throw new Error(
      'Ez az adatbázis production-nek van jelölve (app.environment = production): a seed nem fut.',
    )
  }
  if (opts.withNamedays !== false) log(`névnaptár: ${await importNamedays(sql)} sor`)
  const catalog = await seedCatalog(sql, opts)
  const users = await seedUsersAndGuides(sql, { ...opts, productIds: catalog.productIds })
  return { ...catalog, ...users }
}
