import type { PendingQuery, Row, Sql } from 'postgres'
import { FREE_FROM_LABEL, PRICE_BAND_LABEL, SKIN_TYPE_LABEL } from '@/content/labels'
import { getSql } from '../db/client'
import { FRESH_WITHIN_HOURS, STALE_AFTER_HOURS } from '../pricing/freshness'
import type { VerdictKind } from '../pricing/types'
import { PAGE_SIZE } from './state'
import {
  FREE_FILTERS,
  PRICE_BANDS,
  SKIN_FILTERS,
  type FacetValue,
  type Facets,
  type PriceBand,
  type RelaxGroup,
  type RelaxSuggestion,
  type SearchHit,
  type SearchProfile,
  type SearchProvider,
  type SearchResult,
  type SearchState,
} from './types'
import { RANKING_WEIGHTS } from './weights'
import { whyForYou } from './why'

type Fragment = PendingQuery<Row[]>

interface HitRow {
  product_id: string
  slug: string
  name: string
  brand_name: string | null
  image_url: string | null
  offer_id: string
  merchant_id: string
  merchant_name: string
  price_huf: number
  shipping_huf: number
  customs_huf: number
  total_huf: number
  in_stock: boolean
  verdict: VerdictKind | null
  real_discount_pct: number | null
  checked_at: Date | string
  tags: string[]
  matched_by: string | null
}

interface FacetRow {
  facet: string
  value: string
  label: string
  n: number
}

/**
 * Postgres-alapú keresés (ARCHITECTURE 2. pont): hibrid FTS + trigram egyezés (`search_match`), szűrők a legjobb
 * friss ajánlat TELJES árára (`product_stats`, 0009), diszjunktív facetek számokkal, 4 rendezés, lapozás.
 *
 * Rangsor („Legjobb egyezés”, PRODUCT_SPEC 7.2): a súlyok a `weights.ts`-ből jönnek — ugyanaz a fájl, amit az
 * „Így rangsorolunk” oldal mutat. A JUTALÉK MÉRTÉKE SEHOL NEM SZEREPEL (3. vasszabály): a lekérdezés egyetlen
 * táblája sem tartalmaz jutalékot.
 *
 * Az SQL csak paraméterezett fragmentekből áll (CLAUDE.md 11. pont); az URL-ből jövő értékek a `parseSearchState`
 * Zod-validációján mennek át.
 */
export class PostgresSearch implements SearchProvider {
  constructor(private readonly sqlClient?: Sql) {}

  private get sql(): Sql {
    return this.sqlClient ?? getSql()
  }

  async search(state: SearchState, opts: { profile?: SearchProfile | null; now?: Date } = {}): Promise<SearchResult> {
    const t0 = Date.now()
    const { hitsQuery, facetsQuery, profile } = this.build(state, opts)
    // Bolt-szűrőnél a boltonkénti legjobb ajánlat rendezése 50 000 terméken nem fér a 4 MB-os alap work_mem-be:
    // csak erre a két lekérdezésre, tranzakción belül emeljük (a pooler tranzakciós módjában is érvényes).
    const run = <T extends Row>(q: PendingQuery<T[]>) =>
      state.merchants.length
        ? this.sql.begin(async (tx) => {
            await tx`set local work_mem = '32MB'`
            return tx<T[]>`${q}`
          })
        : q
    const [rows, facetRows] = await Promise.all([run(hitsQuery), run(facetsQuery)])
    return this.toResult(state, rows, facetRows, profile, t0)
  }

  /** A két lekérdezés (találatok, facetek) felépítése végrehajtás nélkül (a mérés `explain`-hez is ezt használja). */
  build(state: SearchState, opts: { profile?: SearchProfile | null; now?: Date } = {}) {
    const sql = this.sql
    // szöveges tömb paraméterként: vesszővel összefűzve + string_to_array (az értékek validált slugok / szótári címkék,
    // vesszőt nem tartalmazhatnak); így a tömb típusa kliens- és fragment-beágyazástól függetlenül egyértelmű
    const textArray = (values: string[]) => {
      if (values.some((v) => v.includes(','))) throw new Error('Érvénytelen szűrőérték.')
      return sql`string_to_array(${values.join(',')}::text, ',')`
    }
    const now = opts.now ?? new Date()
    const profile = opts.profile ?? null
    const stale = new Date(now.getTime() - STALE_AFTER_HOURS * 3600e3).toISOString()
    const fresh = new Date(now.getTime() - FRESH_WITHIN_HOURS * 3600e3).toISOString()
    const hasQ = state.q.length > 0
    const byMerchant = state.merchants.length > 0
    const budget = state.priceMax ?? profile?.budgetMaxHuf ?? null

    // ── szövegegyezés ──
    const matchCte = hasQ
      ? sql`m as (select product_id, relevance, matched_by from public.search_match(${state.q})),`
      : sql``
    const matchJoin = hasQ ? sql`join m on m.product_id = ps.product_id` : sql``
    const relCol = hasQ ? sql`m.relevance` : sql`0::real`
    const matchedByCol = hasQ ? sql`m.matched_by` : sql`null::text`

    // ── nem ajánlatfüggő szűrők (jelzőoszlopok) ──
    const brandFlag = state.brands.length
      ? sql`ps.brand_id in (select id from public.brands where slug = any(${textArray(state.brands)}))`
      : sql`true`
    const skinFlag = state.skin.length ? sql`ps.tags && ${textArray(state.skin.map((x) => `skin_type:${x}`))}` : sql`true`
    const freeFlag = state.free.length ? sql`ps.tags @> ${textArray(state.free.map((x) => `free_from:${x}`))}` : sql`true`
    const categoryCond = state.category
      ? sql`and (ps.category_path = ${state.category} or ps.category_path like ${`${state.category}/%`})`
      : sql``
    // „ár ellenőrizve”: a feed utolsó sikeres futása, de legfeljebb a statisztika pillanatképének ideje (0010 migráció):
    // a pillanatkép ára nem tüntethető fel frissebbnek, mint amikor készült
    const bestChecked = sql`least(case when ps.best_missed_runs = 0 and bf.last_success_at is not null
      then greatest(bf.last_success_at, ps.best_seen_at) else ps.best_seen_at end,
      (select refreshed_at from public.catalog_stats_state))`

    // base: a szöveg + kategória + címkeszűrők jelzőivel, a legjobb FRISS ajánlattal
    const base = (materialized: boolean) => sql`
      base as ${materialized ? sql`materialized` : sql``} (
        select ps.product_id, ps.brand_id, ps.category_path, ps.tags, ps.merchant_ids, ps.product_created_at as created_at,
          ${relCol} as rel, ${matchedByCol} as matched_by,
          ps.best_offer_id as offer_id, ps.best_merchant_id as merchant_id, ps.best_price_huf as price_huf,
          ps.best_shipping_huf as shipping_huf, ps.best_customs_huf as customs_huf, ps.best_total_huf as total_huf,
          ps.best_in_stock as in_stock, ps.verdict, ps.real_discount_pct, ps.best_quality as quality,
          ${bestChecked} as checked_at,
          ${brandFlag} as f_brand, ${skinFlag} as f_skin, ${freeFlag} as f_free
        from public.product_stats ps
        ${matchJoin}
        left join public.feeds bf on bf.id = ps.best_feed_id
        where ps.best_offer_id is not null and ${bestChecked} >= ${stale}::timestamptz ${categoryCond}
      )`

    // bolt-szűrőnél a megjelenített ajánlat a kiválasztott boltok legjobb friss ajánlata
    const merchantCtes = byMerchant
      ? sql`,
      sel as (select coalesce(array_agg(id), '{}') as ids from public.merchants where slug = any(${textArray(state.merchants)})),
      b as materialized (
        select base.product_id, base.brand_id, base.category_path, base.tags, base.created_at, base.rel, base.matched_by,
          base.f_brand, base.f_skin, base.f_free,
          e.offer_id, e.merchant_id, e.price_huf, e.shipping_huf, e.customs_huf, e.total_huf, e.in_stock, e.verdict,
          e.real_discount_pct, e.quality, e.checked_at
        from (
          select distinct on (os.product_id) os.product_id, os.offer_id, os.merchant_id, os.price_huf, os.shipping_huf,
            os.customs_huf, os.total_huf, os.in_stock, os.verdict, os.real_discount_pct, mm.quality_score as quality,
            x.checked_at
          from sel
          join public.offer_stats os on os.merchant_id = any(sel.ids)
          join public.merchants mm on mm.id = os.merchant_id
          left join public.feeds f on f.id = os.feed_id
          cross join lateral (select least(case when os.missed_runs = 0 and f.last_success_at is not null
            then greatest(f.last_success_at, os.seen_at) else os.seen_at end,
            (select refreshed_at from public.catalog_stats_state)) as checked_at) x
          where x.checked_at >= ${stale}::timestamptz
          order by os.product_id, os.in_stock desc, os.total_huf, mm.quality_score desc, os.offer_id
        ) e
        join base on base.product_id = e.product_id
      )`
      : sql``
    // a szűrt halmaz CTE-je: bolt-szűrő nélkül maga a base (így nem másolódik még egyszer)
    const B = byMerchant ? sql`b` : sql`base`

    // ── ajánlatfüggő szűrők (oszlop-fragmentekkel, hogy az ajánlat-szintű bolt-faceten is ugyanazok legyenek) ──
    // Csak a ténylegesen aktív szűrők kerülnek a feltételbe: a mindig igaz jelzőoszlop a tervező sorbecslését
    // rontaná (a CTE-n nem tudja, hogy igaz), és rossz (egyesével olvasó) tervet választana.
    const and = (xs: (Fragment | null)[]): Fragment => {
      const parts = xs.filter((x): x is Fragment => x !== null)
      return parts.length ? parts.reduce((acc, x) => sql`${acc} and ${x}`) : sql`true`
    }
    const priceActive = state.priceMin !== null || state.priceMax !== null
    const offerConds = (c: { total: Fragment; stock: Fragment; verdict: Fragment }) => ({
      price: priceActive
        ? and([state.priceMin === null ? null : sql`${c.total} >= ${state.priceMin}`, state.priceMax === null ? null : sql`${c.total} <= ${state.priceMax}`])
        : null,
      stock: state.inStock ? sql`${c.stock}` : null,
      deal: state.deal ? sql`${c.verdict} = 'deal'` : null,
    })
    const oc = offerConds({ total: sql`t.total_huf`, stock: sql`t.in_stock`, verdict: sql`t.verdict` })
    const fBrand = state.brands.length ? sql`t.f_brand` : null
    const fSkin = state.skin.length ? sql`t.f_skin` : null
    const fFree = state.free.length ? sql`t.f_free` : null
    const nonOffer = and([fBrand, fSkin, fFree])
    const all = and([fBrand, fSkin, fFree, oc.price, oc.stock, oc.deal])

    // ── pontszám (PRODUCT_SPEC 7.2) ──
    const W = RANKING_WEIGHTS
    const profileFit = profile
      ? sql`((${profile.skinType ? sql`(t.tags && ${textArray([`skin_type:${profile.skinType}`])})::int` : sql`0`})
          + (${profile.avoidIngredients.length ? sql`(t.tags && ${textArray(profile.avoidIngredients.map((a) => `free_from:${a}`))})::int` : sql`0`})
          + (${profile.skinConcerns.length ? sql`(t.tags && ${textArray(profile.skinConcerns.map((c) => `concern:${c}`))})::int` : sql`0`})
        )::float8 / 3`
      : sql`0::float8`
    const value = budget ? sql`greatest(0::float8, least(1::float8, 1 - t.total_huf::float8 / ${budget}::float8))` : sql`0::float8`
    const relevance = hasQ ? sql`(t.rel / nullif(max(t.rel) over (), 0))` : sql`0::float8`
    const score = sql`(
      ${W.relevance}::float8 * coalesce(${relevance}, 0)
      + ${W.profileFit}::float8 * ${profileFit}
      + ${W.value}::float8 * ${value}
      + ${W.verdict}::float8 * (case t.verdict when 'deal' then 1 when 'pricier' then 0 else 0.5 end)
      + ${W.merchantQuality}::float8 * coalesce(t.quality, 0)::float8
      + ${W.freshness}::float8 * (case when t.checked_at >= ${fresh}::timestamptz then 1 else 0.5 end)
    )`
    const orderBy = {
      relevancia: sql`order by score desc, product_id`,
      ar: sql`order by total_huf, score desc, product_id`,
      kedvezmeny: sql`order by real_discount_pct desc nulls last, total_huf, product_id`,
      uj: sql`order by created_at desc, product_id`,
    }[state.sort]

    // a termék- és bolt-join csak a kiválasztott oldal soraira fut
    const hitsQuery = sql<HitRow[]>`
      with ${matchCte} ${base(false)} ${merchantCtes},
      page as (
        select t.product_id, t.offer_id, t.merchant_id, t.price_huf, t.shipping_huf, t.customs_huf, t.total_huf, t.in_stock,
          t.verdict, t.real_discount_pct, t.checked_at, t.tags, t.matched_by, t.created_at, ${score} as score
        from ${B} t where ${all}
        ${orderBy}
        limit ${PAGE_SIZE} offset ${(state.page - 1) * PAGE_SIZE}
      )
      select page.*, p.slug, p.name, p.brand_name, p.image_url, mer.name as merchant_name
      from page
      join public.products p on p.id = page.product_id
      join public.merchants mer on mer.id = page.merchant_id
      ${orderBy}`

    // ── facetek (diszjunktív: egy csoport számai a többi csoport szűrőivel) ──
    const depth = state.category ? state.category.split('/').length : 0
    const tagCount = (tag: string, cond: Fragment) => sql`(count(*) filter (where ${cond} and ${tag}::text = any(t.tags)))::int`
    const butSkin = and([fBrand, fFree, oc.price, oc.stock, oc.deal])
    const butPrice = and([fBrand, fSkin, fFree, oc.stock, oc.deal])
    const bandCount = (band: PriceBand) => {
      const b = PRICE_BANDS[band]
      return sql`(count(*) filter (where ${butPrice}
        ${b.min === null ? sql`` : sql`and t.total_huf >= ${b.min}`} ${b.max === null ? sql`` : sql`and t.total_huf <= ${b.max}`}))::int`
    }
    const counters: [string, string, Fragment][] = [
      ['total', '', sql`(count(*) filter (where ${all}))::int`],
      ['relaxed', '', sql`(count(*) filter (where ${all} and t.matched_by = 'relaxed'))::int`],
      ['stock', 'in', sql`(count(*) filter (where ${and([fBrand, fSkin, fFree, oc.price, oc.deal])} and t.in_stock))::int`],
      ['deal', 'deal', sql`(count(*) filter (where ${and([fBrand, fSkin, fFree, oc.price, oc.stock])} and t.verdict = 'deal'))::int`],
      ...SKIN_FILTERS.map((x): [string, string, Fragment] => ['skin', x, tagCount(`skin_type:${x}`, butSkin)]),
      ...FREE_FILTERS.map((x): [string, string, Fragment] => ['free', x, tagCount(`free_from:${x}`, all)]),
      ...(Object.keys(PRICE_BANDS) as PriceBand[]).map((k): [string, string, Fragment] => ['band', k, bandCount(k)]),
    ]
    const counterCols = counters.map(([, , expr], i) => sql`${expr} as ${sql(`c${i}`)}`)
    const counterValues = counters.map(([facet, value], i) => sql`(${facet}::text, ${value}::text, a.${sql(`c${i}`)})`)
    const join = (xs: Fragment[], sep: Fragment) => xs.reduce((acc, x, i) => (i === 0 ? x : sql`${acc}${sep}${x}`))

    // Bolt-facet: a bolt-szűrő NÉLKÜLI halmazon (base), a friss boltlistából (product_stats.merchant_ids). Az ár-,
    // készlet- és akciószűrőt itt nem ajánlatonként alkalmazzuk: a szám a bolt kínálatát mutatja a szöveg-, kategória-
    // és címkeszűrőkkel (ajánlatonkénti számolással a teljes katalógusra ~0,3 s lenne; PRODUCT_SPEC 5.2 pontosítás).
    const merchantFacet = sql`
      select 'merchant', mer.slug, mer.name, x.n
        from (select mid, count(*)::int as n from base t cross join lateral unnest(t.merchant_ids) as mid
              where ${nonOffer} group by mid) x
        join public.merchants mer on mer.id = x.mid`
    const selectedBrands = state.brands.length
      ? sql`union all select 'brand', slug, name, 0 from public.brands where slug = any(${textArray(state.brands)})`
      : sql``
    const selectedMerchants = byMerchant
      ? sql`union all select 'merchant', slug, name, 0 from public.merchants where slug = any(${textArray(state.merchants)})`
      : sql``

    const facetsQuery = sql<FacetRow[]>`
      with ${matchCte} ${base(true)} ${merchantCtes}
      select x.facet, x.value, ''::text as label, x.n
        from (select ${join(counterCols, sql`, `)} from ${B} t) a
        cross join lateral (values ${join(counterValues, sql`, `)}) as x(facet, value, n)
      union all
      select 'brand', br.slug, br.name, x.n
        from (select t.brand_id, count(*)::int as n from ${B} t
              where ${and([fSkin, fFree, oc.price, oc.stock, oc.deal])} group by t.brand_id) x
        join public.brands br on br.id = x.brand_id
      union all
      select 'category', c.path, c.name, sum(g.n)::int
        from (select t.category_path, count(*)::int as n from ${B} t where ${all} and t.category_path is not null
              group by t.category_path) g
        join public.categories c
          on cardinality(string_to_array(g.category_path, '/')) > ${depth}
         and c.path = array_to_string((string_to_array(g.category_path, '/'))[1:${depth + 1}], '/')
        group by c.path, c.name
      union all
      ${merchantFacet}
      ${selectedBrands}
      ${selectedMerchants}`

    const countQuery = sql<{ n: number }[]>`
      with ${matchCte} ${base(false)} ${merchantCtes}
      select count(*)::int as n from ${B} t where ${all}`

    return { hitsQuery, facetsQuery, countQuery, profile }
  }

  /** Csak a találatok száma (az üres találat „szűrő lazítása” javaslatához). */
  async count(state: SearchState, opts: { now?: Date } = {}): Promise<number> {
    const { countQuery } = this.build(state, opts)
    const [r] = state.merchants.length
      ? await this.sql.begin(async (tx) => {
          await tx`set local work_mem = '32MB'`
          return tx<{ n: number }[]>`${countQuery}`
        })
      : await countQuery
    return r?.n ?? 0
  }

  /**
   * Üres találatnál (PRODUCT_SPEC 5.2): melyik szűrő elhagyásával lenne a legtöbb találat. Egyenként elhagyja az
   * aktív szűrőcsoportokat (a kereső szövegét és a kategóriát nem), és a legjobbat adja vissza, ha van találat.
   */
  async suggestRelaxation(state: SearchState, opts: { now?: Date } = {}): Promise<RelaxSuggestion | null> {
    const options: { group: RelaxGroup; state: SearchState }[] = []
    const base = { ...state, page: 1 }
    if (state.brands.length) options.push({ group: 'brands', state: { ...base, brands: [] } })
    if (state.merchants.length) options.push({ group: 'merchants', state: { ...base, merchants: [] } })
    if (state.priceMin !== null || state.priceMax !== null) options.push({ group: 'price', state: { ...base, priceMin: null, priceMax: null } })
    if (state.inStock) options.push({ group: 'inStock', state: { ...base, inStock: false } })
    if (state.deal) options.push({ group: 'deal', state: { ...base, deal: false } })
    if (state.skin.length) options.push({ group: 'skin', state: { ...base, skin: [] } })
    if (state.free.length) options.push({ group: 'free', state: { ...base, free: [] } })
    if (options.length === 0) return null
    const counts = await Promise.all(options.map((o) => this.count(o.state, opts)))
    let best = -1
    counts.forEach((n, i) => {
      if (n > 0 && (best < 0 || n > counts[best]!)) best = i
    })
    return best < 0 ? null : { group: options[best]!.group, state: options[best]!.state, count: counts[best]! }
  }

  private toResult(state: SearchState, rows: HitRow[], facetRows: FacetRow[], profile: SearchProfile | null, t0: number): SearchResult {
    const total = facetRows.find((r) => r.facet === 'total')?.n ?? 0
    const hits: SearchHit[] = rows.map((r) => ({
      productId: r.product_id,
      slug: r.slug,
      name: r.name,
      brandName: r.brand_name,
      imageUrl: r.image_url,
      offerId: r.offer_id,
      merchantId: r.merchant_id,
      merchantName: r.merchant_name,
      cost: {
        priceHuf: r.price_huf,
        shippingHuf: r.shipping_huf,
        customsHuf: r.customs_huf,
        totalHuf: r.total_huf,
        freeShipping: r.shipping_huf === 0,
      },
      inStock: r.in_stock,
      checkedAt: r.checked_at instanceof Date ? r.checked_at : new Date(r.checked_at),
      verdict: r.verdict,
      realDiscountPct: r.real_discount_pct,
      why: whyForYou(
        { tags: r.tags, totalHuf: r.total_huf, verdict: r.verdict, merchantId: r.merchant_id },
        { profile, budgetMaxHuf: state.priceMax },
      ),
    }))
    return {
      state,
      hits,
      total,
      pageSize: PAGE_SIZE,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      facets: buildFacets(state, facetRows),
      relaxed: (facetRows.find((r) => r.facet === 'relaxed')?.n ?? 0) > 0,
      tookMs: Date.now() - t0,
    }
  }
}

function buildFacets(state: SearchState, rows: FacetRow[]): Facets {
  const by = (facet: string) => rows.filter((r) => r.facet === facet)
  const merge = (facet: string, selected: string[]): FacetValue[] => {
    const map = new Map<string, FacetValue>()
    for (const r of by(facet)) {
      const prev = map.get(r.value)
      map.set(r.value, {
        value: r.value,
        label: r.label || prev?.label || r.value,
        count: Math.max(prev?.count ?? 0, r.n),
        selected: selected.includes(r.value),
      })
    }
    return [...map.values()].sort((a, b) => Number(b.selected) - Number(a.selected) || b.count - a.count || a.label.localeCompare(b.label, 'hu'))
  }
  const counts = (facet: string) => new Map(by(facet).map((r) => [r.value, r.n]))
  const skin = counts('skin')
  const free = counts('free')
  const bands = counts('band')
  const band = (Object.keys(PRICE_BANDS) as PriceBand[]).find(
    (k) => PRICE_BANDS[k].min === state.priceMin && PRICE_BANDS[k].max === state.priceMax,
  )
  return {
    categories: by('category')
      .map((r) => ({ value: r.value, label: r.label, count: r.n, selected: state.category === r.value }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'hu')),
    brands: merge('brand', state.brands).slice(0, Math.max(30, state.brands.length)),
    merchants: merge('merchant', state.merchants),
    priceBands: (Object.keys(PRICE_BANDS) as PriceBand[]).map((k) => ({
      value: k,
      label: PRICE_BAND_LABEL[k],
      count: bands.get(k) ?? 0,
      selected: band === k,
    })),
    skin: SKIN_FILTERS.map((s) => ({ value: s, label: SKIN_TYPE_LABEL[s], count: skin.get(s) ?? 0, selected: state.skin.includes(s) })),
    free: FREE_FILTERS.map((s) => ({ value: s, label: FREE_FROM_LABEL[s], count: free.get(s) ?? 0, selected: state.free.includes(s) })),
    inStock: by('stock')[0]?.n ?? 0,
    deal: by('deal')[0]?.n ?? 0,
  }
}
