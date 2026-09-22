import { describe, expect, it } from 'vitest'
import { RANKING_FACTORS, RANKING_WEIGHTS } from '@/lib/search/weights'

describe('rangsor-súlyok (PRODUCT_SPEC 7.2, 3. vasszabály)', () => {
  it('a súlyok összege 1', () => {
    const sum = Object.values(RANKING_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 10)
  })
  it('a spec szerinti értékek', () => {
    expect(RANKING_WEIGHTS).toEqual({ relevance: 0.35, profileFit: 0.25, value: 0.15, verdict: 0.1, merchantQuality: 0.1, freshness: 0.05 })
  })
  it('a jutalék nem szempont', () => {
    const keys = Object.keys(RANKING_WEIGHTS).join(' ').toLowerCase()
    expect(keys).not.toMatch(/commission|jutalek|epc|payout|margin/)
  })
  it('minden tényezőnek van nyilvános magyarázata', () => {
    expect(RANKING_FACTORS.map((f) => f.key).sort()).toEqual(Object.keys(RANKING_WEIGHTS).sort())
  })
})
