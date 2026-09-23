/** Az adapterek közös segédei: mezőkeresés, letöltés az engedélylistával, subID-paraméter a tracking URL-be. */
import { safeDownload } from '../fetch/download'
import { resolvePlaceholders } from '../fetch/ssrf'
import type { AdapterContext, FetchedSource, MerchantRow, RawItem } from '../types'

/** Az első nem üres mező a felsorolt nevek közül (kis- és nagybetű nem számít). */
export function pick(raw: RawItem, ...names: (string | undefined)[]): string | undefined {
  const lower = new Map<string, string>()
  for (const [k, v] of Object.entries(raw)) lower.set(k.toLowerCase(), v)
  for (const n of names) {
    if (!n) continue
    const v = raw[n] ?? lower.get(n.toLowerCase())
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return undefined
}

/** A feed `config.columns` beállítása: közös mezőnév → a feed oszlopa (felülírja az adapter alapértelmezését). */
export function columns(ctx: AdapterContext): Record<string, string> {
  const c = ctx.feed.config.columns
  return c && typeof c === 'object' ? (c as Record<string, string>) : {}
}

export function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : []
}

/** Letöltés: engedélylista = kereskedő domainjei + a hálózat feed-hosztjai + az admin által felvett extra hosztok. */
export async function downloadFeed(ctx: AdapterContext, feedHosts: string[], ext: string): Promise<FetchedSource> {
  if (!ctx.feed.url) throw new Error('A feednek nincs URL-je.')
  const allowlist = [...ctx.merchant.domainAllowlist, ...feedHosts, ...stringArray(ctx.feed.config.extraFeedHosts)]
  const url = ctx.feed.url.startsWith('file:') ? ctx.feed.url : resolvePlaceholders(ctx.feed.url)
  const stream = await safeDownload(url, { allowlist, allowFileRoots: ctx.fileRoots })
  return { stream, ext, origin: url.startsWith('file:') ? 'fixture' : new URL(url).host }
}

/** A query-paraméter beállítása (felülírja, ha már van). */
export function withParam(url: string, key: string, value: string): string {
  const u = new URL(url)
  u.searchParams.set(key, value)
  return u.href
}

/** A subID a hálózat paraméternevével és hosszkorlátjával. */
export function subid(merchant: MerchantRow, clickId: string, fallbackParam: string): [string, string] {
  const param = merchant.subidParam || fallbackParam
  const value = merchant.subidMaxLen ? clickId.slice(0, merchant.subidMaxLen) : clickId
  return [param, value]
}
