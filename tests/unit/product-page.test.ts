import { describe, expect, it } from 'vitest'
import { encodePendingAction, parsePendingAction, safeReturnTo, type PendingAction } from '@/lib/auth/pendingAction'
import { productIndexable } from '@/lib/content/products'
import { formatSize } from '@/lib/format'
import { loginHref, ROUTE_READY } from '@/lib/launch'
import { productJsonLd, serializeJsonLd } from '@/lib/seo/jsonLd'

describe('pendingAction (PRODUCT_SPEC 2. „Elv”)', () => {
  const cases: PendingAction[] = [
    { kind: 'price_alert', productSlug: 'rozsas-krem-50-ml', targetPct: 10 },
    { kind: 'price_alert', productSlug: 'rozsas-krem-50-ml', targetHuf: 8990 },
    { kind: 'list', productSlug: 'szerum' },
    { kind: 'shelf', productSlug: 'szerum' },
  ]
  it('oda-vissza', () => {
    for (const c of cases) expect(parsePendingAction(encodePendingAction(c))).toEqual(c)
  })
  it('hibás bemenet → null', () => {
    for (const bad of ['', 'x', 'price_alert:szerum:pct:15', 'price_alert:szerum:huf:0', 'price_alert:szerum:huf:abc', 'list:../../x', 'list:szerum:extra', 'shelf:Szerum', 'a'.repeat(300)]) {
      expect(parsePendingAction(bad), bad).toBeNull()
    }
  })
})

describe('safeReturnTo (open redirect ellen)', () => {
  it('csak saját relatív útvonal', () => {
    expect(safeReturnTo('/termek/szerum')).toBe('/termek/szerum')
    expect(safeReturnTo('/kereses?q=a%20b')).toBe('/kereses?q=a%20b')
    for (const bad of ['https://evil.example/x', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/x\n/y', '', null]) {
      expect(safeReturnTo(bad), String(bad)).toBeNull()
    }
  })
})

describe('loginHref', () => {
  it('waitlist módban (és amíg a belépés nem készült el) a várólistára visz', () => {
    expect(loginHref('/termek/x', 'list:x', { LAUNCH_MODE: 'waitlist' })).toBe('/#varolista')
    expect(loginHref('/termek/x', 'list:x', { LAUNCH_MODE: 'live' })).toBe(
      ROUTE_READY.belepes ? '/belepes?returnTo=%2Ftermek%2Fx&pendingAction=list%3Ax' : '/#varolista',
    )
  })
})

describe('termékoldal indexelése', () => {
  it('friss ajánlat nélkül soha; egyébként kézi jelölés vagy ≥ 120 karakteres leírás', () => {
    expect(productIndexable({ isIndexable: true, description: 'x'.repeat(500), freshOfferCount: 0 })).toBe(false)
    expect(productIndexable({ isIndexable: true, description: null, freshOfferCount: 1 })).toBe(true)
    expect(productIndexable({ isIndexable: false, description: 'x'.repeat(119), freshOfferCount: 2 })).toBe(false)
    expect(productIndexable({ isIndexable: false, description: 'x'.repeat(120), freshOfferCount: 1 })).toBe(true)
  })
})

describe('JSON-LD (csak valós mezők)', () => {
  const base = { name: 'Rózsás krém', url: 'https://jovetel.hu/termek/rozsas-krem', brandName: null, gtin: null, imageUrl: null, description: null, freshPricesHuf: [], inStockAny: false }
  it('ajánlat nélkül nincs offers; értékelés és vélemény soha', () => {
    const ld = productJsonLd(base)
    expect(ld).toEqual({ '@context': 'https://schema.org', '@type': 'Product', name: 'Rózsás krém', url: base.url })
    expect(JSON.stringify(productJsonLd({ ...base, freshPricesHuf: [5000] }))).not.toMatch(/aggregateRating|review/i)
  })
  it('AggregateOffer a friss listaárakból, GTIN a hossz szerint, érvénytelen GTIN kimarad', () => {
    const ld = productJsonLd({ ...base, brandName: 'Hajnalpír', gtin: '5998330255724', freshPricesHuf: [12990, 9990, 10500], inStockAny: true })
    expect(ld).toMatchObject({
      brand: { '@type': 'Brand', name: 'Hajnalpír' },
      gtin13: '5998330255724',
      offers: { '@type': 'AggregateOffer', priceCurrency: 'HUF', lowPrice: 9990, highPrice: 12990, offerCount: 3, availability: 'https://schema.org/InStock' },
    })
    expect(productJsonLd({ ...base, gtin: '12345' })).not.toHaveProperty('gtin13')
  })
  it('a szerializált szöveg nem zárhatja le a scriptet és nem tartalmaz markupot', () => {
    const s = serializeJsonLd({ name: 'Krém </script><script>alert(1)</script> & <b>' })
    expect(s).not.toMatch(/[<>&]/)
    expect(JSON.parse(s)).toEqual({ name: 'Krém </script><script>alert(1)</script> & <b>' })
  })
})

describe('formatSize', () => {
  it('magyar tizedesvessző, nem törő szóköz', () => {
    expect(formatSize(3.5, 'g')).toBe('3,5 g')
    expect(formatSize(50, 'ml')).toBe('50 ml')
    expect(formatSize(null, 'ml')).toBeNull()
  })
})
