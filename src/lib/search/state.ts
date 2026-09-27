import { z } from 'zod'
import {
  FREE_FILTERS,
  PRICE_BANDS,
  SKIN_FILTERS,
  SORT_KEYS,
  type FreeFilter,
  type PriceBand,
  type SearchState,
  type SkinFilter,
  type SortKey,
} from './types'

/**
 * A keresés állapota az URL-ben (PRODUCT_SPEC 5.2: „URL-ben tárolt állapot”): megosztható, visszaléptethető,
 * újratöltés után is ugyanaz. Az URL külső bemenet → Zod; az ismeretlen / hibás értéket csendben eldobjuk
 * (egy elgépelt link ne hibaoldalt adjon). Paraméterek:
 *   q · kategoria · marka · bolt (vesszővel több) · ar_min · ar_max · keszleten=1 · akcio=1 · bor · mentes ·
 *   rendezes (relevancia | ar | kedvezmeny | uj) · oldal
 */
export const PAGE_SIZE = 24
export const MAX_PAGE = 50
export const MAX_QUERY_LENGTH = 120
const MAX_PRICE = 10_000_000

export const DEFAULT_STATE: SearchState = {
  q: '',
  category: null,
  brands: [],
  merchants: [],
  priceMin: null,
  priceMax: null,
  inStock: false,
  deal: false,
  skin: [],
  free: [],
  sort: 'relevancia',
  page: 1,
}

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>

function get(params: RawParams, key: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key)
  const v = params[key]
  return v === undefined ? [] : Array.isArray(v) ? v : [v]
}

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/)
const categoryPath = z.string().regex(/^[a-z0-9-]{1,60}(\/[a-z0-9-]{1,60}){0,5}$/)
const price = z.coerce.number().int().min(0).max(MAX_PRICE)

/** Vesszővel és ismételt paraméterrel is jöhet; egyedi, rendezett, legfeljebb `max` elem. */
function list<T extends string>(params: RawParams, key: string, ok: (v: string) => v is T, max = 20): T[] {
  const values = get(params, key)
    .flatMap((v) => v.split(','))
    .map((v) => v.trim().toLowerCase())
    .filter(ok)
  return [...new Set(values)].sort().slice(0, max)
}

const isSlug = (v: string): v is string => slug.safeParse(v).success
const isSkin = (v: string): v is SkinFilter => (SKIN_FILTERS as readonly string[]).includes(v)
const isFree = (v: string): v is FreeFilter => (FREE_FILTERS as readonly string[]).includes(v)

function one<T>(params: RawParams, key: string, schema: z.ZodType<T>): T | null {
  const [v] = get(params, key)
  if (v === undefined || v === '') return null
  const r = schema.safeParse(v)
  return r.success ? r.data : null
}

/** Normalizált keresőszöveg: vezérlőkarakter nélkül, összevont szóközökkel, hosszra vágva. */
export function cleanQuery(q: string): string {
  return q
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
}

export function parseSearchState(params: RawParams, overrides: Partial<SearchState> = {}): SearchState {
  let priceMin = one(params, 'ar_min', price)
  let priceMax = one(params, 'ar_max', price)
  if (priceMin !== null && priceMax !== null && priceMin > priceMax) [priceMin, priceMax] = [priceMax, priceMin]
  const sort = one(params, 'rendezes', z.enum(SORT_KEYS)) ?? DEFAULT_STATE.sort
  const page = Math.min(MAX_PAGE, one(params, 'oldal', z.coerce.number().int().min(1)) ?? 1)
  return {
    q: cleanQuery(get(params, 'q')[0] ?? ''),
    category: one(params, 'kategoria', categoryPath),
    brands: list(params, 'marka', isSlug),
    merchants: list(params, 'bolt', isSlug),
    priceMin,
    priceMax,
    inStock: get(params, 'keszleten')[0] === '1',
    deal: get(params, 'akcio')[0] === '1',
    skin: list(params, 'bor', isSkin),
    free: list(params, 'mentes', isFree),
    sort: sort as SortKey,
    page,
    ...overrides,
  }
}

/**
 * Kanonikus URL-paraméterek (a kategóriaoldalon a kategória az útvonalban van: `omitCategory`).
 * Az alapértelmezett értékek kimaradnak, a sorrend rögzített → egy állapotnak egy URL-je van.
 */
export function toSearchParams(state: SearchState, opts: { omitCategory?: boolean } = {}): URLSearchParams {
  const p = new URLSearchParams()
  if (state.q) p.set('q', state.q)
  if (state.category && !opts.omitCategory) p.set('kategoria', state.category)
  if (state.brands.length) p.set('marka', [...state.brands].sort().join(','))
  if (state.merchants.length) p.set('bolt', [...state.merchants].sort().join(','))
  if (state.priceMin !== null) p.set('ar_min', String(state.priceMin))
  if (state.priceMax !== null) p.set('ar_max', String(state.priceMax))
  if (state.inStock) p.set('keszleten', '1')
  if (state.deal) p.set('akcio', '1')
  if (state.skin.length) p.set('bor', [...state.skin].sort().join(','))
  if (state.free.length) p.set('mentes', [...state.free].sort().join(','))
  if (state.sort !== DEFAULT_STATE.sort) p.set('rendezes', state.sort)
  if (state.page > 1) p.set('oldal', String(state.page))
  return p
}

export function searchHref(base: string, state: SearchState, opts: { omitCategory?: boolean } = {}): string {
  const qs = toSearchParams(state, opts).toString()
  return qs ? `${base}?${qs}` : base
}

/** Szűrőváltás: minden változás az 1. oldalra visz. */
export function withChange(state: SearchState, change: Partial<SearchState>): SearchState {
  return { ...state, page: 1, ...change }
}

export function toggle<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value].sort()
}

/** Az ársáv, ha a min/max pontosan egy sávnak felel meg. */
export function activeBand(state: Pick<SearchState, 'priceMin' | 'priceMax'>): PriceBand | null {
  for (const [key, b] of Object.entries(PRICE_BANDS) as [PriceBand, { min: number | null; max: number | null }][]) {
    if (b.min === state.priceMin && b.max === state.priceMax) return key
  }
  return null
}

/** Van-e bármilyen szűrő (a kereső szövegén és a kategórián kívül). */
export function hasFilters(state: SearchState): boolean {
  return (
    state.brands.length > 0 ||
    state.merchants.length > 0 ||
    state.priceMin !== null ||
    state.priceMax !== null ||
    state.inStock ||
    state.deal ||
    state.skin.length > 0 ||
    state.free.length > 0
  )
}
