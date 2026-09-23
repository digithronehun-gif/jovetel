import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { safeDownload, safeLookup } from '@/lib/ingestion/fetch/download'
import { assertFeedUrl, FeedUrlError, hostAllowed, isPrivateAddress, resolvePlaceholders } from '@/lib/ingestion/fetch/ssrf'
import { isParseFailure, parseCsv, sniffDelimiter } from '@/lib/ingestion/parse/csv'
import { detectEncoding } from '@/lib/ingestion/parse/decode'
import { parseXml } from '@/lib/ingestion/parse/xml'

const FIX = join(import.meta.dirname, '../fixtures/feeds')
const collect = async <T>(it: AsyncIterable<T>) => {
  const out: T[] = []
  for await (const x of it) out.push(x)
  return out
}

describe('SSRF: privát címek', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1',
    '0.0.0.0', '224.0.0.1', '255.255.255.255', '198.18.0.1', '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1',
    '::ffff:127.0.0.1', '::ffff:10.0.0.1', '64:ff9b::a00:1', 'ff02::1', '2001:db8::1', 'nem-ip',
  ])('%s tiltott', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true)
  })
  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '2a00:1450:4001:80b::200e', '::ffff:8.8.8.8'])('%s nyilvános', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false)
  })
})

describe('SSRF: URL és host', () => {
  const allow = ['productdata.awin.com', 'bolt.example']
  it('engedélylista: pontos egyezés vagy aldomain', () => {
    expect(hostAllowed('productdata.awin.com', allow)).toBe(true)
    expect(hostAllowed('cdn.bolt.example.', allow)).toBe(true)
    expect(hostAllowed('evilbolt.example', allow)).toBe(false)
    expect(hostAllowed('bolt.example.evil.com', allow)).toBe(false)
  })
  it.each([
    ['http://bolt.example/feed.csv', 'protocol'],
    ['ftp://bolt.example/feed.csv', 'protocol'],
    ['https://127.0.0.1/feed.csv', 'ip_literal'],
    ['https://[::1]/feed.csv', 'ip_literal'],
    ['https://user:pw@bolt.example/feed.csv', 'credentials'],
    ['https://bolt.example:8443/feed.csv', 'port'],
    ['https://metadata.google.internal/', 'host'],
    ['https://masik.example/feed.csv', 'host'],
  ])('%s → %s', (url, code) => {
    try {
      assertFeedUrl(url, allow)
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(FeedUrlError)
      expect((e as FeedUrlError).code).toBe(code)
    }
  })
  it('helyőrző csak engedélyezett nevű változóból, URL-kódolva', () => {
    expect(resolvePlaceholders('https://productdata.awin.com/apikey/{AWIN_API_TOKEN}/x', { AWIN_API_TOKEN: 'a/b' })).toBe(
      'https://productdata.awin.com/apikey/a%2Fb/x',
    )
    expect(() => resolvePlaceholders('https://x.example/{DATABASE_URL}', { DATABASE_URL: 'titok' })).toThrow(FeedUrlError)
    expect(() => resolvePlaceholders('https://x.example/{AWIN_API_TOKEN}', {})).toThrow(/Hiányzó/)
  })
  it('a DNS-feloldás a kapcsolódáskor is tilt (localhost → 127.0.0.1)', async () => {
    const err = await new Promise<Error | null>((res) => safeLookup('localhost', {}, (e) => res(e)))
    expect(err?.message).toMatch(/nem nyilvános/)
  })
  it('fájl-forrás csak engedélyezett könyvtárból', async () => {
    await expect(safeDownload(`file://${FIX}/cj/borkert-patika.csv`, { allowlist: [] })).rejects.toThrow(/fixture/)
    await expect(safeDownload('file:///etc/passwd', { allowlist: [], allowFileRoots: [FIX] })).rejects.toThrow(/engedélyezett/)
    await expect(
      safeDownload(`file://${FIX}/../../../package.json`, { allowlist: [], allowFileRoots: [FIX] }),
    ).rejects.toThrow(/engedélyezett/)
  })
})

describe('kódolás-felismerés', () => {
  it('UTF-8, egy hibás sor ellenére is', () => {
    const utf = Buffer.from('név;ár\nSzérum őszi;1990\nKrém űr;2990\n')
    const broken = Buffer.concat([utf, Buffer.from([0xf5, 0x0a])])
    expect(detectEncoding(utf)).toBe('utf-8')
    expect(detectEncoding(broken)).toBe('utf-8')
  })
  it('Windows-1250', () => {
    expect(detectEncoding(Buffer.from([0x6e, 0xe9, 0x76, 0x3b, 0xe1, 0x72, 0x0a, 0xf5, 0x73, 0x7a, 0x69, 0x0a]))).toBe('windows-1250')
  })
})

describe('CSV', () => {
  it('elválasztó a fejlécből', () => {
    expect(sniffDelimiter('a;b;c')).toBe(';')
    expect(sniffDelimiter('a\tb\tc')).toBe('\t')
    expect(sniffDelimiter('"a;b",c,d')).toBe(',')
  })
  it('idézett sortörés, BOM, laza idézőjel; a hibás sor nem állítja meg', async () => {
    const csv = '﻿id,name,desc\n1,"Szérum, 30 ml","két\nsor"\n2,Krém "extra",x\n3,"lezáratlan,x\n'
    const rows = await collect(parseCsv(Readable.from([Buffer.from(csv)])))
    const ok = rows.filter((r) => !isParseFailure(r))
    expect(ok[0]).toEqual({ id: '1', name: 'Szérum, 30 ml', desc: 'két\nsor' })
    expect(ok[1]).toMatchObject({ id: '2', name: 'Krém "extra"' })
  })
  it('Windows-1250 fixture: ő és ű helyesen', async () => {
    const rows = await collect(parseCsv(createReadStream(join(FIX, 'generic-csv/levendula-webshop-win1250.csv'))))
    const first = rows[0] as Record<string, string>
    expect(Object.keys(first)).toContain('cikkszam')
    expect(first.leiras).toContain('Őszi kedvenc, űrtartalom')
    expect(rows.some((r) => !isParseFailure(r) && (r as Record<string, string>).keszlet === 'elfogyott')).toBe(true)
  })
})

describe('XML', () => {
  it('Google Merchant: g: névtér, entitás, beágyazott elem', async () => {
    const rows = await collect(parseXml(createReadStream(join(FIX, 'generic-xml/fenyes-otthon.xml')), { itemTags: ['item'] }))
    expect(rows).toHaveLength(10)
    const r = rows[0] as Record<string, string>
    expect(r.id).toMatch(/^FO-/)
    expect(r.price).toMatch(/HUF$/)
    expect(r['shipping.price']).toBe('1290 HUF')
    expect(r.description).toContain(' Kézzel csomagolva')
  })
  it('YML: attribútumok és a tétel saját szövege', async () => {
    const rows = await collect(
      parseXml(createReadStream(join(FIX, 'admitad/selyem-illat.yml.xml')), { itemTags: ['category', 'offer'] }),
    )
    const cat = rows.find((r) => (r as Record<string, string>).__tag === 'category') as Record<string, string>
    expect(cat).toMatchObject({ '@id': '1', __text: 'Parfüm' })
    const offer = rows.find((r) => (r as Record<string, string>).__tag === 'offer') as Record<string, string>
    expect(offer['@available']).toMatch(/true|false/)
  })
  it('hibás XML: jelzi a hibát, és a jó tételeket visszaadja', async () => {
    const xml = '<r><item><id>1</id><t>ok</t></item><item><id>2</id><t>&ismeretlen; &nbsp;x</t></item><item><id>3</id></item></r>'
    const rows = await collect(parseXml(Readable.from([Buffer.from(xml)]), { itemTags: ['item'] }))
    expect(rows.filter((r) => !isParseFailure(r)).map((r) => (r as Record<string, string>).id)).toEqual(['1', '2', '3'])
    expect(rows.some(isParseFailure)).toBe(true)
  })
  it('DTD-entitást nem bont ki (XML-bomba)', async () => {
    const bomb = '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;">]><r><item><t>&b;</t></item></r>'
    const rows = await collect(parseXml(Readable.from([Buffer.from(bomb)]), { itemTags: ['item'] }))
    const item = rows.find((r) => !isParseFailure(r)) as Record<string, string> | undefined
    expect(item?.t ?? '').not.toContain('aaaaaaaaaa')
  })
})
