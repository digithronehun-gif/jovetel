/**
 * Strukturált adat (JSON-LD, PRODUCT_SPEC 5.3): CSAK valós mezőkből — nincs kitalált értékelés, vélemény vagy
 * ár (CLAUDE.md 10. pont, 1. vasszabály). Az ár a friss ajánlatok listaára (a szállítás nélkül, ahogy a schema.org kéri).
 *
 * Szerializálás `<script type="application/ld+json">` gyermekeként (React 19 SSR nyersen írja): a `<`, `>` és `&`
 * \\uXXXX-ként kerül ki, így a feedből jövő szöveg sem zárhatja le a scriptet, és markup sem lehet belőle
 * (2. vasszabály — nyers HTML-beillesztés nélkül).
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export interface ProductLdInput {
  name: string
  url: string
  brandName: string | null
  gtin: string | null
  imageUrl: string | null
  description: string | null
  /** csak a friss (≤ 48 órás) ajánlatok listaárai */
  freshPricesHuf: number[]
  inStockAny: boolean
}

export function productJsonLd(p: ProductLdInput): Record<string, unknown> {
  const ld: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, url: p.url }
  if (p.brandName) ld.brand = { '@type': 'Brand', name: p.brandName }
  if (p.gtin && /^\d{8}$|^\d{12,14}$/.test(p.gtin)) ld[p.gtin.length === 13 ? 'gtin13' : p.gtin.length === 8 ? 'gtin8' : p.gtin.length === 12 ? 'gtin12' : 'gtin14'] = p.gtin
  if (p.imageUrl) ld.image = [p.imageUrl]
  if (p.description) ld.description = p.description.slice(0, 500)
  if (p.freshPricesHuf.length) {
    ld.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'HUF',
      lowPrice: Math.min(...p.freshPricesHuf),
      highPrice: Math.max(...p.freshPricesHuf),
      offerCount: p.freshPricesHuf.length,
      availability: p.inStockAny ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    }
  }
  return ld
}
