/**
 * SSRF-védelem a feed-letöltéshez (CLAUDE.md 11. pont, ARCHITECTURE 8. pont): csak https, host-engedélylista,
 * IP-literál nem, és a DNS-feloldás UTÁN is tiltott minden privát, loopback, link-local, CGNAT, dokumentációs
 * és multicast cím. A tiltást a kapcsolódáskor is alkalmazzuk (egyedi `lookup`), így a DNS-rebinding sem segít.
 */
import { isIP } from 'node:net'

export class FeedUrlError extends Error {
  constructor(
    message: string,
    readonly code: 'protocol' | 'host' | 'ip_literal' | 'private_address' | 'credentials' | 'port' | 'placeholder' | 'file',
  ) {
    super(message)
    this.name = 'FeedUrlError'
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, p) => (acc << 8) + Number(p), 0) >>> 0
}

const V4_BLOCKED: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]

function inV4Range(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask)
}

/** 8 db 16 bites csoport (a `::` kibontásával és a beágyazott IPv4 kezelésével). */
function ipv6Groups(ip: string): number[] {
  let s = ip.toLowerCase().split('%')[0]!
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/)
  if (v4) {
    const n = ipv4ToInt(v4[1]!)
    s = s.slice(0, -v4[1]!.length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`
  }
  const [head, tail] = s.split('::') as [string, string | undefined]
  const h = head ? head.split(':').filter(Boolean) : []
  const t = tail !== undefined ? tail.split(':').filter(Boolean) : []
  const fill = tail !== undefined ? 8 - h.length - t.length : 0
  return [...h, ...Array(fill).fill('0'), ...t].map((g) => parseInt(g, 16))
}

/** Igaz, ha a cím nem nyilvános unicast (ezekre soha nem kapcsolódunk). */
export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip)
  if (kind === 4) return V4_BLOCKED.some(([b, bits]) => inV4Range(ip, b, bits)) || ip === '255.255.255.255'
  if (kind !== 6) return true
  const g = ipv6Groups(ip)
  if (g.length !== 8 || g.some((x) => Number.isNaN(x))) return true
  const allZeroPrefix = (n: number) => g.slice(0, n).every((x) => x === 0)
  // :: és ::1
  if (allZeroPrefix(7) && (g[7] === 0 || g[7] === 1)) return true
  // IPv4-leképezett (::ffff:a.b.c.d) és IPv4-kompatibilis: a beágyazott IPv4 dönt
  if (allZeroPrefix(5) && (g[5] === 0xffff || g[5] === 0)) {
    return isPrivateAddress(`${g[6]! >> 8}.${g[6]! & 0xff}.${g[7]! >> 8}.${g[7]! & 0xff}`)
  }
  // NAT64 (64:ff9b::/96)
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    return isPrivateAddress(`${g[6]! >> 8}.${g[6]! & 0xff}.${g[7]! >> 8}.${g[7]! & 0xff}`)
  }
  const first = g[0]!
  if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 egyedi helyi
  if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((first & 0xffc0) === 0xfec0) return true // fec0::/10 elavult site-local
  if (first === 0x2002) return true // 6to4: privát IPv4-et is beágyazhat
  if (first === 0x2001 && g[1] === 0) return true // Teredo (2001::/32)
  if (first === 0x0100 && g.slice(1, 4).every((x) => x === 0)) return true // 100::/64 eldobó
  if ((first & 0xff00) === 0xff00) return true // multicast
  if (first === 0x2001 && g[1] === 0x0db8) return true // dokumentációs
  return false
}

export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, '')
}

/** A host pontosan egyezik egy engedélyezett domainnel, vagy annak aldomainje. */
export function hostAllowed(host: string, allowlist: readonly string[]): boolean {
  const h = normalizeHost(host)
  return allowlist.some((entry) => {
    const a = normalizeHost(entry)
    return a.length > 0 && (h === a || h.endsWith(`.${a}`))
  })
}

/**
 * `{AWIN_API_TOKEN}` jellegű helyőrzők cseréje környezeti változóra (a titok soha nem kerül a DB-be).
 * Csak a hálózat SAJÁT előtagú változója (pl. awin → `AWIN_*`), és csak akkor, ha az URL hostja a hálózat
 * saját feed-hosztja — így a titok nem mehet el a kereskedő szerverére vagy egy admin által felvett hosztra.
 */
export function resolvePlaceholders(
  url: string,
  env: Record<string, string | undefined> = process.env,
  scope?: { prefix: string; hosts: readonly string[] },
): string {
  const hasPlaceholder = /\{[A-Z0-9_]+\}/.test(url)
  if (!hasPlaceholder) return url
  if (!scope || !scope.prefix || scope.hosts.length === 0) {
    throw new FeedUrlError('Ez az adapter nem használhat titok-helyőrzőt.', 'placeholder')
  }
  let host = ''
  try {
    host = new URL(url.replace(/\{[A-Z0-9_]+\}/g, 'x')).hostname
  } catch {
    throw new FeedUrlError('Érvénytelen feed-URL.', 'protocol')
  }
  if (!hostAllowed(host, scope.hosts)) {
    throw new FeedUrlError(`Titok-helyőrző csak a hálózat saját feed-hosztjára mehet (${host}).`, 'placeholder')
  }
  return url.replace(/\{([A-Z0-9_]+)\}/g, (_, name: string) => {
    if (!name.startsWith(`${scope.prefix}_`)) throw new FeedUrlError(`Nem engedélyezett helyőrző: ${name}`, 'placeholder')
    const v = env[name]
    if (!v) throw new FeedUrlError(`Hiányzó környezeti változó a feed-URL-hez: ${name}`, 'placeholder')
    return encodeURIComponent(v)
  })
}

/** A feed-URL szerkezeti ellenőrzése (a DNS-ellenőrzés a kapcsolódáskor történik). */
export function assertFeedUrl(raw: string, allowlist: readonly string[]): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new FeedUrlError('Érvénytelen feed-URL.', 'protocol')
  }
  if (url.protocol !== 'https:') throw new FeedUrlError('Feed csak https-en tölthető le.', 'protocol')
  if (url.username || url.password) throw new FeedUrlError('A feed-URL nem tartalmazhat jelszót.', 'credentials')
  if (url.port && url.port !== '443') throw new FeedUrlError('Feed csak az alapértelmezett porton.', 'port')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (isIP(host)) throw new FeedUrlError('IP-címre nem töltünk le feedet.', 'ip_literal')
  if (!hostAllowed(host, allowlist)) throw new FeedUrlError(`A host nincs az engedélylistán: ${host}`, 'host')
  return url
}

/** URL titok nélkül, naplózáshoz: csak séma + host + az útvonal eleje. */
export function redactUrl(raw: string): string {
  try {
    const u = new URL(raw)
    return `${u.protocol}//${u.host}/…`
  } catch {
    return '[érvénytelen URL]'
  }
}
