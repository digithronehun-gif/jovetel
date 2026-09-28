import { describe, expect, it } from 'vitest'
import { FIXTURE_NETWORKS } from '@/lib/db/seed/fixture-feeds'
import { DEFAULT_SUBID_PARAM, TRACKING_BUILDERS, trackingBuilderFor } from '@/lib/ingestion/adapters/tracking'
import { isBotRequest, isBotUserAgent, isPrefetch } from '@/lib/tracking/bots'
import { CLICK_ID_RE, newClickId, parseClickId } from '@/lib/tracking/clickId'
import { goHref, parsePlacement, parseRef, PLACEMENTS } from '@/lib/tracking/placements'
import { checkRedirectTarget } from '@/lib/tracking/target'

const CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'

describe('click_id (base62, 12 karakter, kriptografikusan véletlen)', () => {
  it('formátum és egyediség 10 000 mintán', () => {
    const ids = Array.from({ length: 10_000 }, newClickId)
    expect(ids.every((id) => CLICK_ID_RE.test(id))).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('a karakterek nagyjából egyenletesen oszlanak el (nincs modulo-torzítás)', () => {
    const counts = new Map<string, number>()
    for (let i = 0; i < 5000; i++) for (const ch of newClickId()) counts.set(ch, (counts.get(ch) ?? 0) + 1)
    expect(counts.size).toBe(62)
    const expected = (5000 * 12) / 62
    for (const n of counts.values()) expect(Math.abs(n - expected) / expected).toBeLessThan(0.2)
  })
  it('parseClickId csak a pontos formátumot fogadja el', () => {
    expect(parseClickId(' abcDEF123456 ')).toBe('abcDEF123456')
    for (const bad of ['abc', 'abcDEF1234567', 'abc-EF123456', 'abcDEF12345é', 123456789012, null, undefined]) {
      expect(parseClickId(bad)).toBeNull()
    }
  })
})

describe('placement és ref engedélylista', () => {
  it('csak az ismert helyek', () => {
    for (const p of PLACEMENTS) expect(parsePlacement(p)).toBe(p)
    for (const bad of ['', 'PRODUCT_BEST', 'product_best ', 'https://evil.example', '<script>', null]) expect(parsePlacement(bad)).toBeNull()
  })
  it('ref: típus:slug formátum, max. 64 karakteres azonosító', () => {
    expect(parseRef('guide:az-elso-szerumod')).toBe('guide:az-elso-szerumod')
    expect(parseRef('list:6f1c2a3b-0000-4000-8000-000000000001')).toBe('list:6f1c2a3b-0000-4000-8000-000000000001')
    for (const bad of ['guide:', 'evil:x', 'guide:Nagybetu', 'guide:a/b', `guide:${'a'.repeat(65)}`, 'guide:x?y=1', '//evil.example', null]) {
      expect(parseRef(bad)).toBeNull()
    }
  })
  it('goHref: mindig a /go útvonal, cél-URL paraméter nélkül', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    expect(goHref(id, 'product_best')).toBe(`/go/${id}?placement=product_best`)
    expect(goHref(id, 'list', 'list:abc')).toBe(`/go/${id}?placement=list&ref=list%3Aabc`)
    expect(() => goHref(id, 'list', 'guide:Rossz' as `guide:${string}`)).toThrow()
  })
})

describe('botszűrés', () => {
  it('valódi böngésző nem bot', () => {
    expect(isBotUserAgent(CHROME)).toBe(false)
    expect(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe(false)
  })
  it('keresőrobotok, előnézetek, parancssori kliensek, üres UA', () => {
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'WhatsApp/2.23.20.0',
      'curl/8.5.0',
      'python-requests/2.32.3',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/129.0.0.0 Safari/537.36',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      '',
      null,
    ]) {
      expect(isBotUserAgent(ua), String(ua)).toBe(true)
    }
  })
  it('előtöltés (Sec-Purpose / Purpose) nem valódi kattintás', () => {
    expect(isPrefetch(new Headers({ 'sec-purpose': 'prefetch;prerender' }))).toBe(true)
    expect(isPrefetch(new Headers({ purpose: 'prefetch' }))).toBe(true)
    expect(isBotRequest(new Headers({ 'user-agent': CHROME }))).toBe(false)
    expect(isBotRequest(new Headers({ 'user-agent': CHROME, 'sec-purpose': 'prefetch' }))).toBe(true)
  })
})

describe('a végső cél ellenőrzése (5. vasszabály)', () => {
  const allow = { merchantDomains: ['bolt.example'], trackingDomains: ['www.awin1.com'] }
  it('a kereskedő domainje (és aldomainje), a hálózat tracking-domainje: rendben', () => {
    expect(checkRedirectTarget('https://bolt.example/termek?a=1', allow)).toEqual({ ok: true, url: 'https://bolt.example/termek?a=1' })
    expect(checkRedirectTarget('https://www.bolt.example/p', allow).ok).toBe(true)
    expect(checkRedirectTarget('http://bolt.example/p', allow).ok).toBe(true)
    expect(checkRedirectTarget('https://www.awin1.com/pclick.php?p=1&clickref=abc', allow).ok).toBe(true)
  })
  it('a töredék (#) lekerül', () => {
    expect(checkRedirectTarget('https://bolt.example/p#x', allow)).toEqual({ ok: true, url: 'https://bolt.example/p' })
  })
  it.each([
    ['idegen host', 'https://evil.example/'],
    ['hasonló végű host', 'https://evilbolt.example/'],
    ['a kereskedő domainje másik domain aldomainjeként', 'https://bolt.example.evil.example/'],
    ['felhasználónév-trükk', 'https://bolt.example@evil.example/'],
    ['backslash-trükk', 'https://evil.example\\@bolt.example/'],
    ['protokoll-relatív', '//evil.example/'],
    ['relatív út', '/go/00000000-0000-4000-8000-000000000001'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['http a tracking-domainen (csak https)', 'http://www.awin1.com/pclick.php'],
    ['IP-literál', 'https://127.0.0.1/'],
    ['IPv6-literál', 'https://[::1]/'],
    ['ftp', 'ftp://bolt.example/'],
    ['üres', ''],
  ])('%s → elutasítva', (_, url) => {
    expect(checkRedirectTarget(url, allow).ok).toBe(false)
  })
  it('üres engedélylistával semmi nem mehet ki', () => {
    expect(checkRedirectTarget('https://bolt.example/', { merchantDomains: [], trackingDomains: [] }).ok).toBe(false)
  })
})

describe('subID hálózatonként (OPEN_QUESTIONS #5)', () => {
  const clickId = 'aB3dE6gH9jK2'
  const sample: Record<string, string> = {
    awin: 'https://www.awin1.com/pclick.php?p=123&a=456&m=789',
    cj: 'https://www.anrdoezrs.net/click-100-200?url=https%3A%2F%2Fbolt.example%2Fp',
    dognet: 'https://go.dognet.com/?chid=AbC&url=https%3A%2F%2Fbolt.example%2Fp',
    admitad: 'https://ad.admitad.com/g/abc123/?ulp=https%3A%2F%2Fbolt.example%2Fp',
  }
  for (const n of FIXTURE_NETWORKS.filter((x) => x.code in sample)) {
    it(`${n.code}: „${n.subidParam}” paraméter, a teljes click_id (≤ ${n.subidMaxLen}), a meglévő paraméterek megmaradnak`, () => {
      const merchant = { programId: null, subidParam: n.subidParam, subidMaxLen: n.subidMaxLen }
      const url = new URL(TRACKING_BUILDERS[n.code]!({ url: 'https://bolt.example/p', trackingUrl: sample[n.code]! }, clickId, merchant))
      expect(url.searchParams.get(n.subidParam!)).toBe(clickId)
      expect(n.subidParam).toBe(DEFAULT_SUBID_PARAM[n.code])
      expect(url.searchParams.get('url') ?? url.searchParams.get('ulp') ?? url.searchParams.get('p')).toBeTruthy()
      expect(checkRedirectTarget(url.href, { merchantDomains: ['bolt.example'], trackingDomains: n.trackingDomains }).ok).toBe(true)
    })
  }
  it('a hosszkorlát levágja a subID-t; a feed korábbi subID-jét felülírja', () => {
    const merchant = { programId: null, subidParam: 'sid', subidMaxLen: 6 }
    const url = new URL(TRACKING_BUILDERS.cj!({ url: 'x', trackingUrl: 'https://www.anrdoezrs.net/click-1-2?sid=feedbol' }, clickId, merchant))
    expect(url.searchParams.getAll('sid')).toEqual(['aB3dE6'])
  })
  it('Awin deeplink követő link nélkül: cread.php a program- és publisher-azonosítóval', () => {
    const prev = process.env.AWIN_PUBLISHER_ID
    process.env.AWIN_PUBLISHER_ID = '555'
    try {
      const url = new URL(TRACKING_BUILDERS.awin!({ url: 'https://bolt.example/p?x=1', trackingUrl: null }, clickId, { programId: '98765', subidParam: 'clickref', subidMaxLen: 50 }))
      expect(url.origin + url.pathname).toBe('https://www.awin1.com/cread.php')
      expect(Object.fromEntries(url.searchParams)).toEqual({ awinmid: '98765', awinaffid: '555', clickref: clickId, ued: 'https://bolt.example/p?x=1' })
    } finally {
      if (prev === undefined) delete process.env.AWIN_PUBLISHER_ID
      else process.env.AWIN_PUBLISHER_ID = prev
    }
  })
  it('Awin deeplink program-azonosító nélkül: hiba (a /go a bolt oldalára visz jutalék nélkül)', () => {
    expect(() => TRACKING_BUILDERS.awin!({ url: 'https://bolt.example/p', trackingUrl: null }, clickId, { programId: null, subidParam: null, subidMaxLen: null })).toThrow()
  })
  it('Dognet: a feed deeplink-sablonjából, a bolt URL-je kódolva', () => {
    const url = new URL(
      TRACKING_BUILDERS.dognet!({ url: 'https://bolt.example/p?a=1&b=2', trackingUrl: null }, clickId, { programId: null, subidParam: 'data1', subidMaxLen: 50 }, {
        deeplinkTemplate: 'https://go.dognet.com/?chid=AbC&url={url}',
      }),
    )
    expect(url.searchParams.get('url')).toBe('https://bolt.example/p?a=1&b=2')
    expect(url.searchParams.get('data1')).toBe(clickId)
    expect(() => TRACKING_BUILDERS.dognet!({ url: 'https://bolt.example/p', trackingUrl: null }, clickId, { programId: null, subidParam: null, subidMaxLen: null })).toThrow()
  })
  it('CJ és Admitad követő link nélkül: hiba', () => {
    const m = { programId: null, subidParam: null, subidMaxLen: null }
    expect(() => TRACKING_BUILDERS.cj!({ url: 'https://bolt.example/p', trackingUrl: null }, clickId, m)).toThrow()
    expect(() => TRACKING_BUILDERS.admitad!({ url: 'https://bolt.example/p', trackingUrl: null }, clickId, m)).toThrow()
  })
  it('közvetlen partner / kézi felvitel: a bolt URL-je subID-vel', () => {
    const url = new URL(TRACKING_BUILDERS.manual!({ url: 'https://bolt.example/p', trackingUrl: null }, clickId, { programId: null, subidParam: null, subidMaxLen: null }))
    expect(url.href).toBe(`https://bolt.example/p?subid=${clickId}`)
  })
  it('az adapter a feedből, hiányában a hálózat kódjából; ismeretlennél kézi', () => {
    expect(trackingBuilderFor('cj', 'awin')).toBe(TRACKING_BUILDERS.cj)
    expect(trackingBuilderFor(null, 'awin')).toBe(TRACKING_BUILDERS.awin)
    expect(trackingBuilderFor(undefined, 'direct')).toBe(TRACKING_BUILDERS.manual)
    expect(trackingBuilderFor('nincs-ilyen', 'tradetracker')).toBe(TRACKING_BUILDERS.manual)
  })
})
