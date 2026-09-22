import { createHash } from 'node:crypto'

/** A kliens IP-címe a proxy-fejlécekből (Vercel: x-forwarded-for első eleme). Csak hash-eléshez! */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return headers.get('x-real-ip') ?? '0.0.0.0'
}

/** IP csak sózott hash-ként tárolható (CLAUDE.md 10. pont). */
export function hashIdentifier(value: string, salt = process.env.IP_HASH_SALT ?? ''): string {
  if (!salt && process.env.NODE_ENV === 'production') {
    console.warn('IP_HASH_SALT nincs beállítva: a hash kevésbé védett.')
  }
  return createHash('sha256').update(`${salt}:${value}`).digest('base64url').slice(0, 32)
}
