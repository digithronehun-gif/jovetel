/**
 * `generic-csv`: Google Merchant-szerű oszlopnevek (id, title, description, price, sale_price, link,
 * image_link, brand, gtin, product_type, availability, shipping) és gyakori magyar megfelelőik.
 * Eltérő oszlopnevek: `feeds.config.columns` (pl. `{ "name": "Termeknev" }`).
 */
import { parseCsv } from '../parse/csv'
import type { FeedEncoding } from '../parse/decode'
import type { FeedAdapter, MappedItem, RawItem, Rejection } from '../types'
import { columns, downloadFeed, pick, subid, withParam } from './common'

export function mapGoogleLike(raw: RawItem, cols: Record<string, string>): MappedItem | Rejection {
  return {
    sku: pick(raw, cols.sku, 'id', 'g:id', 'sku', 'cikkszam', 'cikkszám', 'termekkod', 'item_id') ?? '',
    name: pick(raw, cols.name, 'title', 'g:title', 'name', 'nev', 'név', 'termeknev', 'terméknév') ?? '',
    description: pick(raw, cols.description, 'description', 'g:description', 'leiras', 'leírás'),
    price: pick(raw, cols.price, 'price', 'g:price', 'ar', 'ár', 'brutto_ar', 'bruttó ár') ?? '',
    salePrice: pick(raw, cols.salePrice, 'sale_price', 'g:sale_price', 'akcios_ar', 'akciós ár'),
    oldPrice: pick(raw, cols.oldPrice, 'old_price', 'regi_ar', 'régi ár', 'list_price'),
    currency: pick(raw, cols.currency, 'currency', 'penznem', 'pénznem'),
    url: pick(raw, cols.url, 'link', 'g:link', 'url', 'product_url', 'termek_url') ?? '',
    trackingUrl: pick(raw, cols.trackingUrl, 'tracking_url', 'deeplink'),
    imageUrl: pick(raw, cols.imageUrl, 'image_link', 'g:image_link', 'image', 'image_url', 'kep', 'kép', 'kep_url'),
    brand: pick(raw, cols.brand, 'brand', 'g:brand', 'marka', 'márka', 'gyarto', 'gyártó', 'manufacturer'),
    gtin: pick(raw, cols.gtin, 'gtin', 'g:gtin', 'ean', 'vonalkod', 'vonalkód', 'barcode'),
    category: pick(raw, cols.category, 'product_type', 'g:product_type', 'google_product_category', 'category', 'kategoria', 'kategória'),
    availability: pick(raw, cols.availability, 'availability', 'g:availability', 'stock', 'keszlet', 'készlet', 'in_stock'),
    shippingCost: pick(raw, cols.shippingCost, 'shipping', 'shipping.price', 'szallitasi_dij', 'szállítási díj'),
  }
}

export const genericCsv: FeedAdapter = {
  code: 'generic-csv',
  feedHosts: [],
  fetch: (ctx) => downloadFeed(ctx, [], 'csv'),
  parse: (stream, ctx) =>
    parseCsv(stream, {
      delimiter: typeof ctx.feed.config.delimiter === 'string' ? ctx.feed.config.delimiter : undefined,
      encoding: (ctx.feed.config.encoding as FeedEncoding | undefined) ?? 'auto',
    }) as AsyncIterable<RawItem>,
  map: (raw, ctx) => mapGoogleLike(raw, columns(ctx)),
  // közvetlen partner (saját program): a bolt URL-je + a hálózat subID-paramétere, ha van
  buildTrackingUrl: (offer, clickId, merchant) => {
    const [p, v] = subid(merchant, clickId, 'subid')
    return withParam(offer.trackingUrl ?? offer.url, p, v)
  },
}
