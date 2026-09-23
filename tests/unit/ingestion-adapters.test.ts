import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { flattenCategories } from '@/lib/db/seed/categories'
import { getAdapter } from '@/lib/ingestion/adapters'
import { isParseFailure } from '@/lib/ingestion/parse/csv'
import { normalizeItem, type NormalizeContext } from '@/lib/ingestion/normalize/item'
import { isRejection, type AdapterContext, type NormalizedItem, type Rejection } from '@/lib/ingestion/types'
import { maybeGunzip } from '@/lib/ingestion/fetch/download'

const FIX = join(import.meta.dirname, '../fixtures/feeds')
const cats = flattenCategories()
const nctx = (domain: string, tracking: string[]): NormalizeContext => ({
  merchantDomains: [domain],
  trackingDomains: tracking,
  categoryMappings: new Map(),
  categoryIdsByPath: new Map(cats.map((c) => [c.path, `cat:${c.path}`])),
  categoryPathsById: new Map(cats.map((c) => [`cat:${c.path}`, c.path])),
})

async function run(adapter: string, file: string, domain: string, tracking: string[] = [], format: 'csv' | 'xml' = 'csv') {
  const a = getAdapter(adapter)
  const ctx: AdapterContext = {
    feed: { id: 'f', merchantId: 'm', format, url: null, adapter, config: {} },
    merchant: { id: 'm', slug: 's', programId: null, domainAllowlist: [domain], networkCode: 'x', subidParam: null, subidMaxLen: null, trackingDomains: tracking },
    fileRoots: [FIX],
  }
  const stream = await maybeGunzip(createReadStream(join(FIX, file)), 1e9)
  const ok: NormalizedItem[] = []
  const bad: Rejection[] = []
  for await (const raw of a.parse(stream, ctx)) {
    if (isParseFailure(raw as never)) {
      bad.push({ reason: 'parse_error' })
      continue
    }
    const mapped = a.map(raw, ctx)
    const n = isRejection(mapped) ? mapped : normalizeItem(mapped, nctx(domain, tracking))
    if (isRejection(n)) bad.push(n)
    else ok.push(n)
  }
  return { ok, bad }
}

const noMarkup = (items: NormalizedItem[]) => {
  for (const i of items) {
    for (const v of [i.name, i.description ?? '', i.brandName ?? '']) {
      expect(v).not.toMatch(/<\s*\/?\s*[a-z]/i)
      expect(v).not.toMatch(/alert\(|onerror|javascript:/i)
    }
  }
}

describe('Awin fixture (CSV, gzip)', async () => {
  const { ok, bad } = await run('awin', 'awin/napfeny-drogeria.csv.gz', 'napfeny-drogeria.example', ['www.awin1.com'])
  it('22 helyes, 4 elutasított sor, okkal', () => {
    expect(ok).toHaveLength(22)
    expect(bad.map((b) => b.reason).sort()).toEqual(['encoding', 'invalid_price', 'missing_field', 'url_not_allowed'])
  })
  it('HTML és script nélküli szöveg, prompt-injection jelölve', () => {
    noMarkup(ok)
    expect(ok.find((i) => i.sku === 'ND-1007')!.flags).toContain('prompt_injection')
  })
  it('ár, régi ár, készlet, GTIN, kiszerelés, kategória, címkék', () => {
    const szerum = ok.find((i) => i.sku === 'ND-1001')!
    expect(szerum).toMatchObject({ priceHuf: 7990, oldPriceHuf: 9490, inStock: true, sizeValue: 30, sizeUnit: 'ml', categoryPath: 'szepsegapolas/arcapolas/szerum' })
    expect(szerum.gtin).toMatch(/^599900/)
    expect(szerum.trackingUrl).toMatch(/^https:\/\/www\.awin1\.com\//)
    expect(szerum.tags).toEqual(expect.arrayContaining(['free_from:illatanyag', 'skin_type:kombinalt']))
    expect(ok.find((i) => i.sku === 'ND-1004')!.priceHuf).toBe(4990)
    expect(ok.find((i) => i.sku === 'ND-1008')!.gtin).toBeNull()
    expect(ok.find((i) => i.sku === 'ND-1012')!.inStock).toBe(false)
    expect(ok.find((i) => i.sku === 'ND-1006')!.description).toBe('Első sor.\nMásodik sor, vesszővel, "idézettel".')
  })
})

describe('CJ fixture (Google-szerű CSV)', async () => {
  const { ok, bad } = await run('cj', 'cj/borkert-patika.csv', 'borkert-patika.example', ['www.anrdoezrs.net'])
  it('20 helyes; ár nélküli és euróban árazott sor elutasítva', () => {
    expect(ok).toHaveLength(20)
    expect(bad.map((b) => b.reason).sort()).toEqual(['currency', 'missing_field'])
  })
  it('a bolt URL-je a követő link url= paraméteréből; akciós ár', () => {
    const i = ok.find((x) => x.sku === 'BK2001')!
    expect(i.url).toBe('https://borkert-patika.example/p/szerum-c')
    expect(i.trackingUrl).toMatch(/anrdoezrs\.net\/click-/)
    expect(i).toMatchObject({ priceHuf: 7990, oldPriceHuf: 9490 })
  })
})

describe('Dognet fixture (Heureka XML)', async () => {
  const { ok, bad } = await run('dognet', 'dognet/illat-haza.xml', 'illat-haza.example', [], 'xml')
  it('20 helyes; URL nélküli és 0 Ft-os sor elutasítva', () => {
    expect(ok).toHaveLength(20)
    expect(bad.map((b) => b.reason).sort()).toEqual(['invalid_price', 'missing_field'])
  })
  it('CDATA-ban érkező HTML is tiszta szöveg; a készletet a DELIVERY_DATE adja', () => {
    noMarkup(ok)
    expect(ok.find((i) => i.name.includes('Csalános sampon'))!.inStock).toBe(false)
    expect(ok.find((i) => i.name.includes('női parfüm'))!.flags).toContain('prompt_injection')
  })
})

describe('generic-csv fixture (Windows-1250, pontosvessző)', async () => {
  const { ok, bad } = await run('generic-csv', 'generic-csv/levendula-webshop-win1250.csv', 'levendula-webshop.example')
  it('16 helyes, 1 árazatlan sor elutasítva', () => {
    expect(ok).toHaveLength(16)
    expect(bad.map((b) => b.reason)).toEqual(['invalid_price'])
  })
  it('ékezetek (ő, ű) helyesen, akciós ár a régi mellett', () => {
    expect(ok[0]!.description).toContain('Őszi kedvenc, űrtartalom')
    const parfum = ok.find((i) => i.name.includes('női parfüm'))!
    expect(parfum).toMatchObject({ priceHuf: 14990, oldPriceHuf: 17990 })
    expect(ok.find((i) => i.name.includes('Csalános'))!.inStock).toBe(false)
  })
})

describe('generic-xml fixture (Google Merchant RSS)', async () => {
  const { ok, bad } = await run('generic-xml', 'generic-xml/fenyes-otthon.xml', 'fenyes-otthon.example', [], 'xml')
  it('10 helyes, akciós ár', () => {
    expect(bad).toHaveLength(0)
    expect(ok).toHaveLength(10)
    const p = ok.find((i) => i.name.includes('női parfüm'))!
    expect(p).toMatchObject({ priceHuf: 14990, oldPriceHuf: 17990 })
  })
})

describe('Admitad fixture (YML)', async () => {
  const { ok, bad } = await run('admitad', 'admitad/selyem-illat.yml.xml', 'selyem-illat.example', ['ad.admitad.com'], 'xml')
  it('9 helyes; kategória-név a YML kategóriafából; bolt URL az ulp-ből', () => {
    expect(bad).toHaveLength(0)
    expect(ok).toHaveLength(9)
    const p = ok.find((i) => i.name.includes('női parfüm'))!
    expect(p.sourceCategory).toBe('Parfüm')
    expect(p.url).toBe('https://selyem-illat.example/item/parfum-noi')
    expect(p.trackingUrl).toMatch(/^https:\/\/ad\.admitad\.com\//)
  })
})

describe('tracking URL a subID-vel', () => {
  const merchant = { id: 'm', slug: 's', programId: '98765', domainAllowlist: [], networkCode: 'awin', subidParam: 'clickref', subidMaxLen: 50, trackingDomains: [] }
  it('Awin: clickref a meglévő deeplinkre', () => {
    const url = getAdapter('awin').buildTrackingUrl({ url: 'https://bolt.example/p', trackingUrl: 'https://www.awin1.com/pclick.php?p=1&a=2&m=3' }, 'abc123XYZ789', merchant)
    expect(new URL(url).searchParams.get('clickref')).toBe('abc123XYZ789')
    expect(new URL(url).host).toBe('www.awin1.com')
  })
  it('CJ: sid; a hosszkorlát érvényesül', () => {
    const url = getAdapter('cj').buildTrackingUrl({ url: 'x', trackingUrl: 'https://www.anrdoezrs.net/click-1-2?url=x' }, 'abcdefghijkl', { ...merchant, subidParam: 'sid', subidMaxLen: 6 })
    expect(new URL(url).searchParams.get('sid')).toBe('abcdef')
  })
})
