import { describe, expect, it } from 'vitest'
import { median2, totalCost, verdict, verdictFromStats, windowStats, type DailyPrice } from '@/lib/pricing'

const shop = { shippingFeeHuf: 990, freeShippingThresholdHuf: 14990, customsFeeHuf: 0 }

describe('totalCost (PRODUCT_SPEC 7.4)', () => {
  it('a küszöb alatt szállítási díj, a küszöbön és fölötte ingyenes', () => {
    expect(totalCost(14989, shop)).toEqual({ priceHuf: 14989, shippingHuf: 990, customsHuf: 0, totalHuf: 15979, freeShipping: false })
    expect(totalCost(14990, shop)).toMatchObject({ shippingHuf: 0, totalHuf: 14990, freeShipping: true })
    expect(totalCost(20000, shop).totalHuf).toBe(20000)
  })
  it('küszöb nélkül mindig van szállítás; 0 Ft-os díj = ingyenes', () => {
    expect(totalCost(50000, { ...shop, freeShippingThresholdHuf: null }).totalHuf).toBe(50990)
    expect(totalCost(1000, { shippingFeeHuf: 0, freeShippingThresholdHuf: null, customsFeeHuf: 0 })).toMatchObject({
      totalHuf: 1000,
      freeShipping: true,
    })
  })
  it('EU-n kívüli kereskedőnél a vám is hozzáadódik (ingyenes szállításnál is)', () => {
    expect(totalCost(20000, { ...shop, customsFeeHuf: 1500 })).toMatchObject({ shippingHuf: 0, customsHuf: 1500, totalHuf: 21500 })
  })
  it('érvénytelen árra hibát dob', () => {
    expect(() => totalCost(0, shop)).toThrow(RangeError)
    expect(() => totalCost(99.5, shop)).toThrow(RangeError)
  })
})

/** n nap ártörténet a mai nap előtt, a megadott árral (min = last). */
function days(today: string, prices: number[]): DailyPrice[] {
  return prices.map((p, i) => {
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - (i + 1))
    return { day: d.toISOString().slice(0, 10), minHuf: p, lastHuf: p }
  })
}
const TODAY = '2026-09-23'

describe('verdict (PRODUCT_SPEC 7.3)', () => {
  it('13 nap: még gyűjtjük; 14 nap: van ítélet', () => {
    expect(verdict({ currentHuf: 8000, history: days(TODAY, Array(13).fill(10000)), today: TODAY })).toMatchObject({
      kind: 'collecting',
      daysTracked: 13,
    })
    expect(verdict({ currentHuf: 8000, history: days(TODAY, Array(14).fill(10000)), today: TODAY }).kind).toBe('deal')
  })
  it('a mai nap és a 30 napnál régebbi nap nem számít', () => {
    const h = [...days(TODAY, Array(13).fill(10000)), { day: TODAY, minHuf: 5000, lastHuf: 5000 }, { day: '2026-08-23', minHuf: 1, lastHuf: 1 }]
    expect(windowStats(h, TODAY)).toEqual({ daysTracked: 13, min30Huf: 10000, med30Twice: 20000 })
    // pont 30 napja: még benne van
    expect(windowStats([{ day: '2026-08-24', minHuf: 7, lastHuf: 7 }], TODAY).daysTracked).toBe(1)
  })
  it('valódi akció: pont a 97%-os küszöbön még nem, alatta igen', () => {
    const h = days(TODAY, Array(20).fill(10000))
    expect(verdict({ currentHuf: 9700, history: h, today: TODAY }).kind).toBe('usual')
    const v = verdict({ currentHuf: 9699, history: h, today: TODAY })
    expect(v).toMatchObject({ kind: 'deal', realDiscountPct: 3 })
  })
  it('most drágább: pont 105%-on még szokásos, fölötte drágább', () => {
    const h = days(TODAY, Array(20).fill(10000))
    expect(verdict({ currentHuf: 10500, history: h, today: TODAY }).kind).toBe('usual')
    expect(verdict({ currentHuf: 10501, history: h, today: TODAY }).kind).toBe('pricier')
  })
  it('páros elemszámú medián (,5) egész számos összevetéssel', () => {
    // utolsó árak: 9 999 és 10 000 → medián 9 999,5; 105%-a 10 499,475
    const h = [...days(TODAY, Array(8).fill(9999)), ...days('2026-09-15', Array(8).fill(10000))]
    const s = windowStats(h, TODAY)
    expect(s).toMatchObject({ daysTracked: 16, med30Twice: 19999 })
    expect(verdictFromStats({ currentHuf: 10499, ...s }).kind).toBe('usual')
    expect(verdictFromStats({ currentHuf: 10500, ...s }).kind).toBe('pricier')
  })
  it('a min30 a napi MINIMUMOKból, a medián a napi UTOLSÓ árakból számol', () => {
    const h = days(TODAY, Array(20).fill(10000)).map((d, i) => (i === 5 ? { ...d, minHuf: 9000 } : d))
    // 9 000 × 0,97 = 8 730 → 8 800 nem valódi akció, pedig a medián 10 000
    expect(verdict({ currentHuf: 8800, history: h, today: TODAY }).kind).toBe('usual')
    expect(verdict({ currentHuf: 8729, history: h, today: TODAY })).toMatchObject({ kind: 'deal', min30Huf: 9000, med30Huf: 10000, realDiscountPct: 12 })
  })
  it('a feed „régi ára” az ítéletet soha nem változtatja; csak a kiegészítő mondatot váltja ki (6. vasszabály)', () => {
    const h = days(TODAY, Array(20).fill(10000))
    expect(verdict({ currentHuf: 10000, oldPriceHuf: 20000, history: h, today: TODAY })).toMatchObject({
      kind: 'usual',
      feedDiscountNote: true,
    })
    // drágább a szokásosnál, és a bolt kedvezményt jelez → Most drágább marad, a tényszerű mondattal (F6-átnézés)
    expect(verdict({ currentHuf: 12000, oldPriceHuf: 15000, history: h, today: TODAY })).toMatchObject({
      kind: 'pricier',
      feedDiscountNote: true,
    })
    // ugyanaz régi ár nélkül: ugyanaz az ítélet
    expect(verdict({ currentHuf: 12000, history: h, today: TODAY }).kind).toBe('pricier')
    // valódi akciónál nincs kiegészítés
    expect(verdict({ currentHuf: 9000, oldPriceHuf: 15000, history: h, today: TODAY })).toMatchObject({ kind: 'deal', feedDiscountNote: false })
    // ártörténet nélkül a régi ár semmit nem számít
    expect(verdict({ currentHuf: 5000, oldPriceHuf: 15000, history: [], today: TODAY })).toMatchObject({
      kind: 'collecting',
      feedDiscountNote: false,
    })
  })
  it('hiányzó napok: csak az ártörténettel rendelkező napok számítanak (14 szórt nap elég, 13 nem)', () => {
    const scattered = (n: number) =>
      Array.from({ length: n }, (_, i) => {
        const d = new Date(`${TODAY}T12:00:00Z`)
        d.setUTCDate(d.getUTCDate() - (2 * i + 1)) // minden második nap hiányzik
        return { day: d.toISOString().slice(0, 10), minHuf: 10000, lastHuf: 10000 }
      })
    expect(verdict({ currentHuf: 9000, history: scattered(14), today: TODAY })).toMatchObject({ kind: 'deal', daysTracked: 14 })
    expect(verdict({ currentHuf: 9000, history: scattered(13), today: TODAY })).toMatchObject({ kind: 'collecting', daysTracked: 13 })
    // ugyanarra a napra két sor (pl. két futás): egy napnak számít
    const dup = [...scattered(13), { ...scattered(1)[0]! }]
    expect(verdict({ currentHuf: 9000, history: dup, today: TODAY }).daysTracked).toBe(13)
  })
  it('median2', () => {
    expect(median2([])).toBeNull()
    expect(median2([3, 1, 2])).toBe(4)
    expect(median2([4, 1, 3, 2])).toBe(5)
  })
})
