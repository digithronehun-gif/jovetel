/**
 * Dognet: a kereskedők Heureka/Árukereső-szerű XML-feedje (`<SHOPITEM>`: ITEM_ID, PRODUCTNAME, DESCRIPTION,
 * URL, IMGURL, PRICE_VAT, MANUFACTURER, EAN, CATEGORYTEXT, DELIVERY_DATE).
 * TODO(owner): a Dognet feed-hosztja és formátuma egy jóváhagyott programnál ellenőrizendő (OPEN_QUESTIONS #4);
 * a letöltési host a kereskedő domainje, vagy `config.extraFeedHosts`.
 * Tracking: `config.deeplinkTemplate` (pl. `https://go.dognet.com/?chid=…&url={url}`), subID a hálózat
 * `subid_param` mezőjéből (OPEN_QUESTIONS #5).
 */
import { parseXml } from '../parse/xml'
import type { FeedAdapter, RawItem } from '../types'
import { columns, downloadFeed, pick, subid, withParam } from './common'

export const dognet: FeedAdapter = {
  code: 'dognet',
  feedHosts: [],
  fetch: (ctx) => downloadFeed(ctx, [], 'xml'),
  parse: (stream) => parseXml(stream, { itemTags: ['SHOPITEM'] }) as AsyncIterable<RawItem>,
  map: (raw, ctx) => {
    const c = columns(ctx)
    const delivery = pick(raw, c.availability, 'DELIVERY_DATE', 'AVAILABILITY')
    // Heureka: DELIVERY_DATE = 0 → raktáron; szám → ennyi nap múlva szállítható (rendelhető); hiány → ismeretlen
    const availability = delivery == null ? undefined : /^\d+$/.test(delivery) ? (Number(delivery) <= 3 ? 'in stock' : 'preorder') : delivery
    return {
      sku: pick(raw, c.sku, 'ITEM_ID', 'PRODUCTNO') ?? '',
      name: pick(raw, c.name, 'PRODUCTNAME', 'PRODUCT') ?? '',
      description: pick(raw, c.description, 'DESCRIPTION'),
      price: pick(raw, c.price, 'PRICE_VAT', 'PRICE') ?? '',
      currency: pick(raw, c.currency, 'CURRENCY'),
      url: pick(raw, c.url, 'URL') ?? '',
      trackingUrl: pick(raw, c.trackingUrl, 'DEEPLINK'),
      imageUrl: pick(raw, c.imageUrl, 'IMGURL', 'IMGURL_ALTERNATIVE'),
      brand: pick(raw, c.brand, 'MANUFACTURER', 'BRAND'),
      gtin: pick(raw, c.gtin, 'EAN', 'ISBN'),
      category: pick(raw, c.category, 'CATEGORYTEXT'),
      availability,
      shippingCost: pick(raw, c.shippingCost, 'DELIVERY.DELIVERY_PRICE'),
    }
  },
  buildTrackingUrl: (offer, clickId, merchant) => {
    const [p, v] = subid(merchant, clickId, 'data1')
    if (offer.trackingUrl) return withParam(offer.trackingUrl, p, v)
    throw new Error('Dognet: nincs deeplink (config.deeplinkTemplate, F6).')
  },
}
