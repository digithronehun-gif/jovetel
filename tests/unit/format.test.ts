import { describe, expect, it } from 'vitest'
import { formatHuf, NBSP } from '@/lib/pricing/format'
import {
  daysUntil,
  formatDate,
  formatMonthDay,
  formatRelative,
  normalizeForSearch,
  slugify,
} from '@/lib/format'

describe('formatHuf', () => {
  it('az elfogadási kritérium: 24990 → "24 990 Ft" nem törő szóközökkel', () => {
    expect(formatHuf(24990)).toBe('24 990 Ft')
    expect(formatHuf(24990)).not.toContain(' ')
  })
  it('kis és nagy összegek', () => {
    expect(formatHuf(0)).toBe(`0${NBSP}Ft`)
    expect(formatHuf(990)).toBe(`990${NBSP}Ft`)
    expect(formatHuf(1000)).toBe(`1${NBSP}000${NBSP}Ft`)
    expect(formatHuf(1234567)).toBe(`1${NBSP}234${NBSP}567${NBSP}Ft`)
  })
  it('kerekít és mínuszjelet ír', () => {
    expect(formatHuf(4990.4)).toBe(`4${NBSP}990${NBSP}Ft`)
    expect(formatHuf(-990)).toBe(`−990${NBSP}Ft`)
  })
  it('érvénytelen összegre hibát dob', () => {
    expect(() => formatHuf(Number.NaN)).toThrow(RangeError)
  })
})

describe('formatDate', () => {
  const d = new Date('2026-09-22T10:00:00Z')
  it('rövid: 2026. szept. 22.', () => expect(formatDate(d)).toBe('2026. szept. 22.'))
  it('hosszú: szeptember 22., kedd', () =>
    expect(formatDate(d, 'long')).toBe('szeptember 22., kedd'))
  it('Budapest időzónában számol (UTC 23:30 → másnap)', () => {
    expect(formatDate(new Date('2026-09-22T23:30:00Z'))).toBe('2026. szept. 23.')
  })
  it('dátum és időpont az ár mellé', () => {
    expect(formatDate(new Date('2026-09-22T05:00:00Z'), 'dateTime')).toBe('szept. 22. 07:00')
  })
  it('naptári nap (névnap)', () => {
    expect(formatMonthDay(11, 25)).toBe('november 25.')
    expect(formatMonthDay(2, 29, 'short')).toBe('febr. 29.')
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-09-22T12:00:00Z')
  it('múlt', () => {
    expect(formatRelative(new Date('2026-09-22T11:59:40Z'), now)).toBe('most')
    expect(formatRelative(new Date('2026-09-22T11:55:00Z'), now)).toBe('5 perce')
    expect(formatRelative(new Date('2026-09-22T10:00:00Z'), now)).toBe('2 órája')
    expect(formatRelative(new Date('2026-09-21T09:00:00Z'), now)).toBe('tegnap')
    expect(formatRelative(new Date('2026-09-19T12:00:00Z'), now)).toBe('3 napja')
    expect(formatRelative(new Date('2026-08-25T12:00:00Z'), now)).toBe('4 hete')
  })
  it('jövő', () => {
    expect(formatRelative(new Date('2026-09-22T14:00:00Z'), now)).toBe('2 óra múlva')
    expect(formatRelative(new Date('2026-09-23T15:00:00Z'), now)).toBe('holnap')
    expect(formatRelative(new Date('2026-10-02T10:00:00Z'), now)).toBe('10 nap múlva')
  })
  it('daysUntil naptári napokat számol', () => {
    expect(daysUntil(new Date('2026-10-02T06:00:00Z'), now)).toBe(10)
    expect(daysUntil(now, now)).toBe(0)
  })
})

describe('slugify', () => {
  it('ékezetmentesít és kötőjelez', () => {
    expect(slugify('Tűzőgép, őszi fűszál: ŐŰ őű.')).toBe('tuzogep-oszi-fuszal-ou-ou')
    expect(slugify('C-vitaminos szérum 30 ml')).toBe('c-vitaminos-szerum-30-ml')
    expect(slugify('  Árvíztűrő   tükörfúrógép  ')).toBe('arvizturo-tukorfurogep')
    expect(slugify('Parfüm & kölni')).toBe('parfum-es-kolni')
  })
  it('hosszkorlát szóhatáron vág', () => {
    const s = slugify('nagyon hosszú termék név, ami sosem akar véget érni semmilyen módon', 30)
    expect(s.length).toBeLessThanOrEqual(30)
    expect(s.endsWith('-')).toBe(false)
  })
  it('keresési normalizálás', () => {
    expect(normalizeForSearch('  Szérum   ZSÍROS bőrre ')).toBe('szerum zsiros borre')
  })
})

describe('formatHufAxis', () => {
  it('ezrekben, magyar tizedesvesszővel', async () => {
    const { formatHufAxis } = await import('@/lib/pricing/format')
    expect(formatHufAxis(12000)).toBe('12e')
    expect(formatHufAxis(9500)).toBe('9,5e')
  })
})
