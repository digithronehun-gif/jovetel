/**
 * `manual`: az admin felületről felvitt tételek (`feeds.config.items`, közös mezőnevekkel). Letöltés nincs;
 * ugyanaz a normalizálás, minőségi kapu és publikálás fut rajtuk, mint a hálózati feedeken.
 */
import { Readable } from 'node:stream'
import type { FeedAdapter, RawItem } from '../types'
import { pick, subid, withParam } from './common'

async function* jsonItems(stream: Readable): AsyncGenerator<RawItem> {
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(Buffer.from(c as Buffer))
  const items = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  if (!Array.isArray(items)) return
  for (const it of items) {
    if (!it || typeof it !== 'object') continue
    const raw: RawItem = {}
    for (const [k, v] of Object.entries(it as Record<string, unknown>)) if (v != null) raw[k] = String(v)
    yield raw
  }
}

export const manual: FeedAdapter = {
  code: 'manual',
  feedHosts: [],
  fetch: async (ctx) => ({
    stream: Readable.from([Buffer.from(JSON.stringify(ctx.feed.config.items ?? []))]),
    ext: 'json',
    origin: 'admin',
  }),
  parse: (stream) => jsonItems(stream),
  map: (raw) => ({
    sku: pick(raw, 'sku') ?? '',
    name: pick(raw, 'name') ?? '',
    description: pick(raw, 'description'),
    price: pick(raw, 'price') ?? '',
    salePrice: pick(raw, 'salePrice'),
    oldPrice: pick(raw, 'oldPrice'),
    currency: pick(raw, 'currency'),
    url: pick(raw, 'url') ?? '',
    trackingUrl: pick(raw, 'trackingUrl'),
    imageUrl: pick(raw, 'imageUrl'),
    brand: pick(raw, 'brand'),
    gtin: pick(raw, 'gtin'),
    category: pick(raw, 'category'),
    availability: pick(raw, 'availability'),
  }),
  buildTrackingUrl: (offer, clickId, merchant) => {
    const [p, v] = subid(merchant, clickId, 'subid')
    return withParam(offer.trackingUrl ?? offer.url, p, v)
  },
}
