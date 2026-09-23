/** Adapter-regiszter: a `feeds.adapter` mező értéke → adapter. */
import type { FeedAdapter } from '../types'
import { admitad } from './admitad'
import { awin } from './awin'
import { cj } from './cj'
import { dognet } from './dognet'
import { genericCsv } from './generic-csv'
import { genericXml } from './generic-xml'
import { manual } from './manual'

export const ADAPTERS: Record<string, FeedAdapter> = Object.fromEntries(
  [genericCsv, genericXml, awin, cj, dognet, admitad, manual].map((a) => [a.code, a]),
)

export function getAdapter(code: string): FeedAdapter {
  const a = ADAPTERS[code]
  if (!a) throw new Error(`Ismeretlen feed-adapter: ${code}`)
  return a
}
