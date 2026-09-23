/**
 * Admitad: YML (Yandex Market Language) XML: `<categories><category id>` majd `<offers><offer id available>`
 * (url, price, oldprice, currencyId, categoryId, picture, name/model, vendor, description, barcode).
 * Az `offer/url` már Admitad-követő link; a bolt URL-je az `ulp` paraméterben van. SubID: `subid`.
 * TODO(owner): egy jóváhagyott program mintájával ellenőrizendő (OPEN_QUESTIONS #4).
 */
import type { Readable } from 'node:stream'
import { parseXml } from '../parse/xml'
import type { FeedAdapter, RawItem } from '../types'
import { columns, downloadFeed, pick, subid, withParam } from './common'

export const ADMITAD_FEED_HOSTS = ['export.admitad.com']

async function* ymlOffers(stream: Readable): AsyncGenerator<RawItem> {
  // a kategóriák a YML-ben az ajánlatok előtt állnak: id → név
  const categories = new Map<string, string>()
  for await (const rec of parseXml(stream, { itemTags: ['category', 'offer'] })) {
    if ('__parseError' in rec) {
      yield rec as unknown as RawItem
      continue
    }
    if (rec.__tag === 'category') {
      const id = rec['@id']
      if (id) categories.set(id, (rec as RawItem)['__text'] ?? '')
      continue
    }
    const catId = rec.categoryId
    yield { ...rec, __categoryName: (catId && categories.get(catId)) || '' }
  }
}

export const admitad: FeedAdapter = {
  code: 'admitad',
  feedHosts: ADMITAD_FEED_HOSTS,
  fetch: (ctx) => downloadFeed(ctx, ADMITAD_FEED_HOSTS, 'xml'),
  parse: (stream) => ymlOffers(stream),
  map: (raw, ctx) => {
    const c = columns(ctx)
    const tracking = pick(raw, c.trackingUrl, 'url')
    let url = pick(raw, c.url, 'ulp') ?? ''
    if (!url && tracking) {
      try {
        url = new URL(tracking).searchParams.get('ulp') ?? ''
      } catch {
        url = ''
      }
    }
    const available = pick(raw, '@available')
    return {
      sku: pick(raw, c.sku, '@id', 'vendorCode') ?? '',
      name: pick(raw, c.name, 'name', 'model') ?? '',
      description: pick(raw, c.description, 'description'),
      price: pick(raw, c.price, 'price') ?? '',
      oldPrice: pick(raw, c.oldPrice, 'oldprice'),
      currency: pick(raw, c.currency, 'currencyId'),
      url,
      trackingUrl: tracking,
      imageUrl: pick(raw, c.imageUrl, 'picture'),
      brand: pick(raw, c.brand, 'vendor'),
      gtin: pick(raw, c.gtin, 'barcode'),
      category: pick(raw, c.category, '__categoryName'),
      availability: available === 'false' ? 'out of stock' : 'in stock',
    }
  },
  buildTrackingUrl: (offer, clickId, merchant) => {
    const [p, v] = subid(merchant, clickId, 'subid')
    if (!offer.trackingUrl) throw new Error('Admitad: a feed nem adott követő linket.')
    return withParam(offer.trackingUrl, p, v)
  },
}
