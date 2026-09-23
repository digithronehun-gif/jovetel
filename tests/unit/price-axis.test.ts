import { describe, expect, it } from 'vitest'
import { priceAxis } from '@/components/app/PriceHistoryChart'
import { DEMO_RADAR_DAYS, DEMOS, demoPriceSeries } from '@/content/landing'

describe('priceAxis', () => {
  it('kerek osztások, és a tartomány lefedi az árakat', () => {
    const { domain, ticks } = priceAxis(9490, 12490)
    expect(ticks.every((t) => t % 1000 === 0)).toBe(true)
    expect(domain[0]).toBeLessThan(9490)
    expect(domain[1]).toBeGreaterThan(12490)
    expect(ticks.length).toBeGreaterThanOrEqual(3)
    expect(ticks.length).toBeLessThanOrEqual(7)
  })
  it('lapos ár mellett sem egy pont a tengely', () => {
    const { ticks } = priceAxis(5990, 5990)
    expect(ticks.length).toBeGreaterThanOrEqual(3)
    expect(ticks[0]).toBeLessThan(5990)
  })
  it('nem megy nulla alá', () => {
    expect(priceAxis(190, 900).domain[0]).toBeGreaterThanOrEqual(0)
  })
})

describe('landing demók', () => {
  it('a radar címe és a kártya ugyanannyi napot mond', () => {
    expect(DEMOS.radar.title).toContain(`${DEMO_RADAR_DAYS} nap`)
  })
  it('a demó-ártörténet a megadott napig tart, és a végén valódi esés van a 30 napos minimum alá', () => {
    const today = new Date('2027-01-15T10:00:00Z')
    const { series, min30Huf, currentHuf } = demoPriceSeries(today)
    expect(series[0]!.points.at(-1)!.day).toBe('2027-01-15')
    expect(series[0]!.points).toHaveLength(30)
    expect(currentHuf).toBeLessThan(min30Huf)
  })
})
