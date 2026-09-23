/**
 * Egy feed-tétel normalizálása (ARCHITECTURE 3.3): kötelező mezők, kódolási hiba, ár (egész Ft), GTIN,
 * márka, kiszerelés, kategória (kézi leképezés → kulcsszó-szabály), HTML-tisztítás, URL-ek ellenőrzése,
 * szabályalapú címkék és a tartalom hash-e. Tiszta függvény: DB-t nem ér, így egységtesztelhető.
 */
import { createHash } from 'node:crypto'
import { normalizeForSearch, slugify } from '../../format/slug'
import { REPLACEMENT_CHAR } from '../parse/decode'
import { looksLikeInjection } from '../quality/injection'
import type { MappedItem, NormalizedItem, Rejection } from '../types'
import { ruleCategoryPath } from './category-rules'
import { normalizeGtin } from './gtin'
import { parseHuf } from './price'
import { extractSize } from './size'
import { ruleTags } from './tags'
import { cleanLine, cleanText } from './text'
import { checkImageUrl, checkUrl } from './url'

export interface NormalizeContext {
  /** a kereskedő domainjei (a bolt URL-jének engedélylistája) */
  merchantDomains: readonly string[]
  /** a hálózat tracking-domainjei (a deeplink engedélylistája) */
  trackingDomains: readonly string[]
  /** kézi leképezés: a kereskedő kategória-szövege → kategória-azonosító */
  categoryMappings: ReadonlyMap<string, string>
  /** kategória-útvonal → azonosító (a szabályalapú leképezéshez) */
  categoryIdsByPath: ReadonlyMap<string, string>
  /** azonosító → útvonal */
  categoryPathsById: ReadonlyMap<string, string>
}

export const LIMITS = { sku: 200, name: 300, brand: 80, category: 300, description: 5000 } as const

const IN_STOCK_FALSE =
  /^(false|0|no|nem|n|out[ _-]?of[ _-]?stock|outofstock|sold[ _-]?out|elfogyott|nincs( raktáron| készleten)?|nem elérhető|unavailable|discontinued|megszűnt|pre-?order|előrendelhető|on order|rendelésre)$/i

export function parseAvailability(raw: string | undefined): boolean {
  if (raw == null || raw.trim() === '') return true
  const s = raw.trim()
  // számként: 0 = nincs készleten (Awin `in_stock`); a Heureka-féle szállítási napot az adapter alakítja át
  if (/^\d+$/.test(s)) return s !== '0'
  return !IN_STOCK_FALSE.test(s)
}

function hashContent(item: Omit<NormalizedItem, 'contentHash' | 'flags'>): string {
  const canonical = JSON.stringify(item, Object.keys(item).sort())
  return createHash('sha256').update(canonical).digest('base64url')
}

const reject = (reason: Rejection['reason'], field?: string, sku?: string, detail?: string): Rejection => ({
  reason,
  field,
  sku,
  detail: detail?.slice(0, 160),
})

export function normalizeItem(m: MappedItem, ctx: NormalizeContext): NormalizedItem | Rejection {
  const sku = cleanLine(m.sku, LIMITS.sku + 1)
  if (!sku) return reject('missing_field', 'sku')
  if (sku.length > LIMITS.sku) return reject('too_long', 'sku', sku.slice(0, 40))

  // kódolási hiba: a dekódoló U+FFFD-t hagyott a szövegben
  if ([m.name, m.description, m.brand].some((v) => v?.includes(REPLACEMENT_CHAR))) {
    return reject('encoding', 'name', sku, 'Hibás karakterkódolás a szövegben.')
  }

  const name = cleanLine(m.name, LIMITS.name)
  if (!name) return reject('missing_field', 'name', sku)

  if (!m.price || !m.price.trim()) return reject('missing_field', 'price', sku)
  const price = parseHuf(m.price, m.currency)
  if (!price.ok) return reject(price.reason, 'price', sku, cleanLine(m.price, 40) ?? undefined)
  let priceHuf = price.huf
  let oldPriceHuf: number | null = null
  if (m.salePrice && m.salePrice.trim()) {
    const sale = parseHuf(m.salePrice, m.currency)
    if (sale.ok && sale.huf < priceHuf) {
      oldPriceHuf = priceHuf
      priceHuf = sale.huf
    }
  }
  if (m.oldPrice && m.oldPrice.trim()) {
    const old = parseHuf(m.oldPrice, m.currency)
    if (old.ok && old.huf > priceHuf) oldPriceHuf = old.huf
  }

  if (!m.url || !m.url.trim()) return reject('missing_field', 'url', sku)
  const url = checkUrl(m.url, ctx.merchantDomains)
  if (!url.ok) return reject(url.reason, 'url', sku, url.reason === 'url_not_allowed' ? safeHost(m.url) : undefined)

  let trackingUrl: string | null = null
  if (m.trackingUrl && m.trackingUrl.trim()) {
    const t = checkUrl(m.trackingUrl, ctx.trackingDomains, { httpsOnly: true })
    if (!t.ok) return reject(t.reason, 'trackingUrl', sku, safeHost(m.trackingUrl))
    trackingUrl = t.url
  }

  const description = cleanText(m.description, LIMITS.description)
  const brandName = cleanLine(m.brand, LIMITS.brand)
  const sourceCategory = cleanLine(m.category, LIMITS.category)

  let categoryId = sourceCategory ? (ctx.categoryMappings.get(sourceCategory) ?? null) : null
  let categoryPath = categoryId ? (ctx.categoryPathsById.get(categoryId) ?? null) : null
  if (!categoryId) {
    const path = ruleCategoryPath(normalizeForSearch(`${sourceCategory ?? ''} | ${name}`))
    if (path && ctx.categoryIdsByPath.has(path)) {
      categoryId = ctx.categoryIdsByPath.get(path)!
      categoryPath = path
    }
  }

  const size = extractSize(name, description)
  const tagText = normalizeForSearch(`${name} | ${sourceCategory ?? ''} | ${(description ?? '').slice(0, 3000)}`)

  const base: Omit<NormalizedItem, 'contentHash' | 'flags'> = {
    sku,
    name,
    description,
    priceHuf,
    oldPriceHuf,
    inStock: parseAvailability(m.availability),
    url: url.url,
    trackingUrl,
    imageUrl: checkImageUrl(m.imageUrl),
    brandName,
    brandSlug: brandName ? slugify(brandName) || null : null,
    gtin: normalizeGtin(m.gtin),
    sourceCategory,
    categoryId,
    categoryPath,
    sizeValue: size?.value ?? null,
    sizeUnit: size?.unit ?? null,
    tags: ruleTags(tagText, categoryPath),
  }
  const flags = looksLikeInjection(m.description) || looksLikeInjection(m.name) ? ['prompt_injection'] : []
  return { ...base, contentHash: hashContent(base), flags }
}

function safeHost(raw: string): string {
  try {
    return new URL(raw).host.slice(0, 80)
  } catch {
    return 'érvénytelen'
  }
}
