/**
 * CJ Affiliate termékfeed. A CJ „Shopping” formátuma a Google termékspecifikációt követi (id, title, link,
 * price, sale_price, brand, gtin, availability, product_type), ezért a Google-szerű leképezést használjuk.
 * TODO(owner): a tényleges formátum (CSV vagy XML, oszlopnevek) egy jóváhagyott program mintájával
 * ellenőrizendő (OPEN_QUESTIONS #4); XML esetén `config.format = "xml"`.
 * Tracking: a feed `link` mezője CJ-követő link (anrdoezrs.net stb.); a subID a `sid` paraméter.
 */
import { parseCsv } from '../parse/csv'
import { parseXml } from '../parse/xml'
import type { FeedAdapter, RawItem } from '../types'
import { columns, downloadFeed, pick, subid, withParam } from './common'
import { mapGoogleLike } from './generic-csv'

export const CJ_FEED_HOSTS = ['datatransfer.cj.com']

export const cj: FeedAdapter = {
  code: 'cj',
  feedHosts: CJ_FEED_HOSTS,
  fetch: (ctx) => downloadFeed(ctx, CJ_FEED_HOSTS, ctx.feed.format === 'xml' ? 'xml' : 'csv'),
  parse: (stream, ctx) =>
    (ctx.feed.format === 'xml' ? parseXml(stream, { itemTags: ['product', 'item'] }) : parseCsv(stream)) as AsyncIterable<RawItem>,
  map: (raw, ctx) => {
    const c = columns(ctx)
    const m = mapGoogleLike(raw, c)
    if ('reason' in m) return m
    // a CJ `link` mezője a követő link, a bolt URL-je a `url=` paraméterben (vagy külön oszlopban)
    const link = pick(raw, c.trackingUrl, 'link', 'buyurl')
    const direct = pick(raw, c.url, 'merchant_url', 'product_url')
    let url = direct ?? ''
    if (!url && link) {
      try {
        url = new URL(link).searchParams.get('url') ?? ''
      } catch {
        url = ''
      }
    }
    return { ...m, url, trackingUrl: link }
  },
  buildTrackingUrl: (offer, clickId, merchant) => {
    const [p, v] = subid(merchant, clickId, 'sid')
    if (!offer.trackingUrl) throw new Error('CJ: a feed nem adott követő linket.')
    return withParam(offer.trackingUrl, p, v)
  },
}
