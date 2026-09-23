/**
 * Awin termékfeed (CSV, gzip). Az oszlopnevek az Awin „Create-a-Feed” szabványos mezői.
 * TODO(owner): egy valódi, jóváhagyott program feedjével ellenőrizni (OPEN_QUESTIONS #4); eltérés esetén
 * `feeds.config.columns`. A letöltési URL-ben a kulcs helyőrzővel szerepel: `…/apikey/{AWIN_API_TOKEN}/…`.
 * Tracking: az `aw_deep_link` már követő link; a subID a `clickref` paraméter (OPEN_QUESTIONS #5).
 */
import { parseCsv } from '../parse/csv'
import type { FeedAdapter, RawItem } from '../types'
import { columns, downloadFeed, pick, subid, withParam } from './common'

export const AWIN_FEED_HOSTS = ['productdata.awin.com', 'datafeed.api.productserve.com']

export const awin: FeedAdapter = {
  code: 'awin',
  feedHosts: AWIN_FEED_HOSTS,
  fetch: (ctx) => downloadFeed(ctx, AWIN_FEED_HOSTS, 'csv'),
  parse: (stream) => parseCsv(stream) as AsyncIterable<RawItem>,
  map: (raw, ctx) => {
    const c = columns(ctx)
    return {
      sku: pick(raw, c.sku, 'merchant_product_id', 'aw_product_id') ?? '',
      name: pick(raw, c.name, 'product_name') ?? '',
      description: pick(raw, c.description, 'description', 'product_short_description'),
      price: pick(raw, c.price, 'search_price', 'store_price', 'display_price') ?? '',
      oldPrice: pick(raw, c.oldPrice, 'rrp_price', 'base_price'),
      currency: pick(raw, c.currency, 'currency'),
      url: pick(raw, c.url, 'merchant_deep_link') ?? '',
      trackingUrl: pick(raw, c.trackingUrl, 'aw_deep_link'),
      imageUrl: pick(raw, c.imageUrl, 'merchant_image_url', 'aw_image_url', 'large_image'),
      brand: pick(raw, c.brand, 'brand_name'),
      gtin: pick(raw, c.gtin, 'ean', 'product_GTIN', 'upc'),
      category: pick(raw, c.category, 'merchant_category', 'category_name', 'merchant_product_category_path'),
      availability: pick(raw, c.availability, 'in_stock', 'stock_status', 'is_for_sale'),
      shippingCost: pick(raw, c.shippingCost, 'delivery_cost'),
    }
  },
  buildTrackingUrl: (offer, clickId, merchant) => {
    const [p, v] = subid(merchant, clickId, 'clickref')
    if (offer.trackingUrl) return withParam(offer.trackingUrl, p, v)
    // TODO(owner): a publisher-azonosító (AWIN_PUBLISHER_ID) nélkül nem építhető deeplink (F6)
    const affId = process.env.AWIN_PUBLISHER_ID
    if (!affId || !merchant.programId) throw new Error('Awin deeplink: hiányzik a publisher- vagy programazonosító.')
    const u = new URL('https://www.awin1.com/cread.php')
    u.searchParams.set('awinmid', merchant.programId)
    u.searchParams.set('awinaffid', affId)
    u.searchParams.set(p, v)
    u.searchParams.set('ued', offer.url)
    return u.href
  },
}
