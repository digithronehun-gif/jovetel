/**
 * `generic-xml`: Google Merchant RSS/Atom (`<item>` / `<entry>`, `g:` névtér). A tétel-elem neve
 * a `feeds.config.itemTag` beállítással módosítható, az oszlopnevek a `config.columns`-szal.
 */
import { parseXml } from '../parse/xml'
import type { FeedEncoding } from '../parse/decode'
import type { FeedAdapter, RawItem } from '../types'
import { columns, downloadFeed, stringArray, subid, withParam } from './common'
import { mapGoogleLike } from './generic-csv'

export const genericXml: FeedAdapter = {
  code: 'generic-xml',
  feedHosts: [],
  fetch: (ctx) => downloadFeed(ctx, [], 'xml'),
  parse: (stream, ctx) =>
    parseXml(stream, {
      itemTags: stringArray(ctx.feed.config.itemTags).length ? stringArray(ctx.feed.config.itemTags) : ['item', 'entry'],
      encoding: (ctx.feed.config.encoding as FeedEncoding | undefined) ?? 'auto',
    }) as AsyncIterable<RawItem>,
  map: (raw, ctx) => mapGoogleLike(raw, columns(ctx)),
  buildTrackingUrl: (offer, clickId, merchant) => {
    const [p, v] = subid(merchant, clickId, 'subid')
    return withParam(offer.trackingUrl ?? offer.url, p, v)
  },
}
