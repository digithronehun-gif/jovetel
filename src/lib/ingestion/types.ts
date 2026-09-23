/**
 * Feed-import típusai (ARCHITECTURE 3. pont). A feedből jövő MINDEN szöveg ellenséges bemenet (2. vasszabály):
 * a `RawItem` mezői nyers, megbízhatatlan sztringek; a `NormalizedItem` már tisztított, egyszerű szöveg.
 */
import type { Readable } from 'node:stream'

/** Egy nyers feed-sor: mezőnév → nyers szöveg (CSV-oszlop vagy XML-elem). */
export type RawItem = Record<string, string>

/** A feed sorának hálózatfüggetlen, még nem normalizált alakja (az adapter `map` lépésének kimenete). */
export interface MappedItem {
  sku: string
  name: string
  description?: string
  /** nyers ár-szöveg, pl. „12 990 Ft”, „12990.00 HUF” */
  price: string
  /** akciós ár, ha a feed külön adja (ilyenkor ez a fizetendő ár) */
  salePrice?: string
  /** a feed szerinti régi / listaár — az ítélethez SOHA nem használjuk (6. vasszabály) */
  oldPrice?: string
  currency?: string
  /** a bolt termékoldala */
  url: string
  /** hálózati deeplink / tracking URL, ha a feed adja */
  trackingUrl?: string
  imageUrl?: string
  brand?: string
  gtin?: string
  category?: string
  availability?: string
  shippingCost?: string
}

export interface ProductCategoryRef {
  id: string
  path: string
}

export interface NormalizedItem {
  sku: string
  name: string
  description: string | null
  priceHuf: number
  oldPriceHuf: number | null
  inStock: boolean
  url: string
  trackingUrl: string | null
  imageUrl: string | null
  brandName: string | null
  brandSlug: string | null
  gtin: string | null
  sourceCategory: string | null
  categoryId: string | null
  categoryPath: string | null
  sizeValue: number | null
  sizeUnit: 'ml' | 'g' | 'db' | null
  tags: string[]
  /** a tartalom kanonikus hash-e (idempotencia: változatlan tétel nem íródik) */
  contentHash: string
  /** gyanús, utasításszerű szöveg a leírásban (nem elutasítás, csak jelzés a statisztikában) */
  flags: string[]
}

export type RejectReason =
  | 'missing_field'
  | 'invalid_price'
  | 'currency'
  | 'encoding'
  | 'invalid_url'
  | 'url_not_allowed'
  | 'too_long'
  | 'duplicate_sku'
  | 'parse_error'

export interface Rejection {
  reason: RejectReason
  field?: string
  sku?: string
  /** rövid, tisztított részlet a hibamintához (soha nem nyers HTML) */
  detail?: string
}

export interface FeedRow {
  id: string
  merchantId: string
  format: 'csv' | 'xml' | 'json' | 'api'
  url: string | null
  adapter: string
  config: Record<string, unknown>
}

export interface MerchantRow {
  id: string
  slug: string
  programId: string | null
  domainAllowlist: string[]
  networkCode: string
  subidParam: string | null
  subidMaxLen: number | null
  trackingDomains: string[]
}

export interface AdapterContext {
  feed: FeedRow
  merchant: MerchantRow
  /** `file:` forrás csak ezekből a könyvtárakból (csak `--fixtures` / teszt; production-ben üres) */
  fileRoots: string[]
}

export interface FetchedSource {
  /** a (kitömörített) nyers bájtfolyam */
  stream: Readable
  /** a nyers fájl kiterjesztése a pillanatképhez (csv, xml, json) */
  ext: string
  /** tájékoztató: honnan jött (titok nélkül) */
  origin: string
}

/**
 * Hálózat-specifikus adapter (ARCHITECTURE 3. pont). A `fetch` SSRF-védett letöltés, a `parse` streaming,
 * a `map` a nyers sort a közös alakra hozza (a validálás és tisztítás a közös normalizálóban történik).
 */
export interface FeedAdapter {
  code: string
  /** a hálózat feed-hosztjai (a letöltés engedélylistája a kereskedő domainjein felül) */
  feedHosts: string[]
  fetch(ctx: AdapterContext): Promise<FetchedSource>
  parse(stream: Readable, ctx: AdapterContext): AsyncIterable<RawItem>
  map(raw: RawItem, ctx: AdapterContext): MappedItem | Rejection
  /** a kattintáskor használt cél-URL a hálózat subID-paraméterével (F6 használja) */
  buildTrackingUrl(offer: { url: string; trackingUrl: string | null }, clickId: string, merchant: MerchantRow): string
}

export function isRejection(x: MappedItem | NormalizedItem | Rejection): x is Rejection {
  return 'reason' in x
}
