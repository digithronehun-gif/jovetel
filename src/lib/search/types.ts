import type { CostBreakdown, VerdictKind } from '../pricing/types'

/** Rendezések (PRODUCT_SPEC 5.2): Legjobb egyezés · Legalacsonyabb teljes ár · Legnagyobb valódi kedvezmény · Legújabb. */
export const SORT_KEYS = ['relevancia', 'ar', 'kedvezmeny', 'uj'] as const
export type SortKey = (typeof SORT_KEYS)[number]

/** Bőrtípus-szűrő értékei (a „nem tudom” nem szűrő). */
export const SKIN_FILTERS = ['normal', 'szaraz', 'zsiros', 'kombinalt', 'erzekeny'] as const
export type SkinFilter = (typeof SKIN_FILTERS)[number]

/** „Mentes” címkék = a profil kerülendő összetevői (`free_from:*`). */
export const FREE_FILTERS = ['illatanyag', 'alkohol', 'paraben', 'szilikon', 'illoolaj'] as const
export type FreeFilter = (typeof FREE_FILTERS)[number]

/** Ársávok a teljes árra (a profil „Kényelmes keret” sávjai, PRODUCT_SPEC 4.2); félig nyitott intervallumok. */
export const PRICE_BANDS = {
  u5: { min: null, max: 4999 },
  '5_15': { min: 5000, max: 14999 },
  '15_30': { min: 15000, max: 29999 },
  o30: { min: 30000, max: null },
} as const satisfies Record<string, { min: number | null; max: number | null }>
export type PriceBand = keyof typeof PRICE_BANDS

/** A keresés teljes állapota — az URL-ben tárolva (`state.ts`). */
export interface SearchState {
  q: string
  /** kategóriaútvonal, pl. `szepsegapolas/arcapolas` */
  category: string | null
  brands: string[]
  merchants: string[]
  priceMin: number | null
  priceMax: number | null
  inStock: boolean
  deal: boolean
  skin: SkinFilter[]
  free: FreeFilter[]
  sort: SortKey
  page: number
}

/** A belépett tag profiljából a rangsorhoz és a „Miért neked” címkékhez (F7-től). Vendégnél nincs. */
export interface SearchProfile {
  skinType: string | null
  skinConcerns: string[]
  avoidIngredients: string[]
  /** a „Kényelmes keret” felső határa forintban (vagy null) */
  budgetMaxHuf: number | null
  favoriteMerchantIds: string[]
}

export interface SearchHit {
  productId: string
  slug: string
  name: string
  brandName: string | null
  imageUrl: string | null
  offerId: string
  merchantId: string
  merchantName: string
  cost: CostBreakdown
  inStock: boolean
  checkedAt: Date
  verdict: VerdictKind | null
  realDiscountPct: number | null
  /** determinisztikus „Miért neked” címkék (PRODUCT_SPEC 7.1), max. 3 */
  why: string[]
}

export interface FacetValue {
  value: string
  label: string
  count: number
  selected: boolean
}

export interface Facets {
  categories: FacetValue[]
  brands: FacetValue[]
  merchants: FacetValue[]
  priceBands: FacetValue[]
  skin: FacetValue[]
  free: FacetValue[]
  inStock: number
  deal: number
}

export interface SearchResult {
  state: SearchState
  hits: SearchHit[]
  total: number
  pageSize: number
  pageCount: number
  facets: Facets
  /** lazított egyezés is van a találatok között (elírás / túl szűk kérdés) */
  relaxed: boolean
  tookMs: number
}

export type RelaxGroup = 'brands' | 'merchants' | 'price' | 'inStock' | 'deal' | 'skin' | 'free'
export interface RelaxSuggestion {
  group: RelaxGroup
  /** az állapot a szűrőcsoport nélkül */
  state: SearchState
  count: number
}

/** A keresőszolgáltatás (ARCHITECTURE 2. pont). Egy megvalósítás: `PostgresSearch`. A varázsló (F10) is erre épül. */
export interface SearchProvider {
  search(state: SearchState, opts?: { profile?: SearchProfile | null; now?: Date }): Promise<SearchResult>
  count(state: SearchState, opts?: { now?: Date }): Promise<number>
  /** üres találatnál: melyik szűrőcsoport elhagyása adná a legtöbb találatot */
  suggestRelaxation(state: SearchState, opts?: { now?: Date }): Promise<RelaxSuggestion | null>
}
