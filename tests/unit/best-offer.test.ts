import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bestOffer, rankOffers, type RankableOffer } from '@/lib/pricing'

interface Fixture {
  merchants: Record<string, { fee: number; threshold: number | null; customs: number; quality: number; status?: string; allowed?: boolean }>
  cases: {
    name: string
    offers: { sku: string; merchant: string; price: number; inStock?: boolean; seenHoursAgo?: number; active?: boolean; id?: string }[]
    expect: string | null
    expectTotal?: number
  }[]
}
const fixture = JSON.parse(readFileSync(join(import.meta.dirname, '../fixtures/best-offer-cases.json'), 'utf8')) as Fixture
const NOW = new Date('2026-09-28T10:00:00Z')

function toRankable(c: Fixture['cases'][number]): (RankableOffer & { sku: string })[] {
  return c.offers.map((o, i) => {
    const m = fixture.merchants[o.merchant]!
    return {
      sku: o.sku,
      offerId: o.id ?? `00000000-0000-4000-8000-${String(100 + i).padStart(12, '0')}`,
      priceHuf: o.price,
      inStock: o.inStock ?? true,
      checkedAt: new Date(NOW.getTime() - (o.seenHoursAgo ?? 1) * 3600e3),
      listable: (o.active ?? true) && (m.status ?? 'active') === 'active' && (m.allowed ?? true),
      merchantQuality: m.quality,
      shipping: { shippingFeeHuf: m.fee, freeShippingThresholdHuf: m.threshold, customsFeeHuf: m.customs },
    }
  })
}

describe('bestOffer (F5: 20 kézi teszteset)', () => {
  it('pontosan 20 eset', () => expect(fixture.cases).toHaveLength(20))
  for (const c of fixture.cases) {
    it(c.name, () => {
      const best = bestOffer(toRankable(c), NOW)
      expect(best?.sku ?? null).toBe(c.expect)
      if (c.expectTotal !== undefined) expect(best?.cost.totalHuf).toBe(c.expectTotal)
    })
  }
  it('a sorrend: friss előbb, a régi a lista végére kerül „nem friss” jelöléssel', () => {
    const ranked = rankOffers(toRankable(fixture.cases.find((c) => c.name === 'a legolcsóbb ára 49 órás')!), NOW)
    expect(ranked.map((r) => [r.sku, r.fresh])).toEqual([
      ['b', true],
      ['a', false],
    ])
  })
})
