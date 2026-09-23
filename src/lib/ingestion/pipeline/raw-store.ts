/**
 * A nyers feed-pillanatképek tárolása (ARCHITECTURE 3.1): `feeds/<feedId>/<runId>.<ext>.gz`, 30 nap megőrzés.
 * Élesben Supabase Storage (privát `feeds` bucket, service role kulccsal, csak az ingest scriptből);
 * helyben és teszben a `.local/raw-feeds/` könyvtár. Választás: `FEED_RAW_STORE=supabase|local`
 * (alapértelmezés: production-ben supabase, egyébként local).
 */
import { createReadStream } from 'node:fs'
import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { isProductionDeployment } from '../../env'

export const RAW_RETENTION_DAYS = 30
export const RAW_BUCKET = 'feeds'

export interface RawStore {
  kind: 'local' | 'supabase'
  /** a tömörített nyers fájl feltöltése; visszaadja az objektum útvonalát */
  save(objectPath: string, localFile: string): Promise<string>
  /** a megőrzési időn túli pillanatképek törlése; a törölt darabszám */
  prune(olderThanDays?: number): Promise<number>
}

export function rawObjectPath(feedId: string, runId: string, ext: string): string {
  return `${feedId}/${runId}.${ext}.gz`
}

export class LocalRawStore implements RawStore {
  kind = 'local' as const
  constructor(readonly root = join(process.cwd(), '.local/raw-feeds')) {}
  async save(objectPath: string, localFile: string): Promise<string> {
    const dest = join(this.root, RAW_BUCKET, objectPath)
    await mkdir(dirname(dest), { recursive: true })
    await copyFile(localFile, dest)
    return `${RAW_BUCKET}/${objectPath}`
  }
  async prune(olderThanDays = RAW_RETENTION_DAYS): Promise<number> {
    const base = join(this.root, RAW_BUCKET)
    const cutoff = Date.now() - olderThanDays * 864e5
    let removed = 0
    let feedsDirs: string[] = []
    try {
      feedsDirs = await readdir(base)
    } catch {
      return 0
    }
    for (const d of feedsDirs) {
      for (const f of await readdir(join(base, d))) {
        const p = join(base, d, f)
        if ((await stat(p)).mtimeMs < cutoff) {
          await rm(p)
          removed++
        }
      }
    }
    return removed
  }
}

export class SupabaseRawStore implements RawStore {
  kind = 'supabase' as const
  private ensured = false
  constructor(
    private readonly url: string,
    private readonly serviceKey: string,
  ) {}
  private headers(extra: Record<string, string> = {}) {
    return { authorization: `Bearer ${this.serviceKey}`, apikey: this.serviceKey, ...extra }
  }
  private async ensureBucket() {
    if (this.ensured) return
    const res = await fetch(`${this.url}/storage/v1/bucket/${RAW_BUCKET}`, { headers: this.headers() })
    if (res.status === 404 || res.status === 400) {
      const c = await fetch(`${this.url}/storage/v1/bucket`, {
        method: 'POST',
        headers: this.headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ id: RAW_BUCKET, name: RAW_BUCKET, public: false }),
      })
      if (!c.ok && c.status !== 409) throw new Error(`Storage bucket létrehozása sikertelen: ${c.status}`)
    }
    this.ensured = true
  }
  async save(objectPath: string, localFile: string): Promise<string> {
    await this.ensureBucket()
    const size = (await stat(localFile)).size
    const res = await fetch(`${this.url}/storage/v1/object/${RAW_BUCKET}/${objectPath}`, {
      method: 'POST',
      headers: this.headers({ 'content-type': 'application/gzip', 'content-length': String(size), 'x-upsert': 'true' }),
      body: createReadStream(localFile) as unknown as BodyInit,
      duplex: 'half',
    } as RequestInit)
    if (!res.ok) throw new Error(`Storage feltöltés sikertelen: ${res.status}`)
    return `${RAW_BUCKET}/${objectPath}`
  }
  async prune(olderThanDays = RAW_RETENTION_DAYS): Promise<number> {
    await this.ensureBucket()
    const cutoff = Date.now() - olderThanDays * 864e5
    const list = async (prefix: string) => {
      const res = await fetch(`${this.url}/storage/v1/object/list/${RAW_BUCKET}`, {
        method: 'POST',
        headers: this.headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: 'created_at', order: 'asc' } }),
      })
      if (!res.ok) throw new Error(`Storage lista sikertelen: ${res.status}`)
      return (await res.json()) as { name: string; id: string | null; created_at?: string }[]
    }
    const old: string[] = []
    for (const dir of await list('')) {
      if (dir.id) continue // fájl a gyökérben: nem a mi szerkezetünk
      for (const f of await list(`${dir.name}/`)) {
        if (f.created_at && Date.parse(f.created_at) < cutoff) old.push(`${dir.name}/${f.name}`)
      }
    }
    if (old.length) {
      const res = await fetch(`${this.url}/storage/v1/object/${RAW_BUCKET}`, {
        method: 'DELETE',
        headers: this.headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ prefixes: old }),
      })
      if (!res.ok) throw new Error(`Storage törlés sikertelen: ${res.status}`)
    }
    return old.length
  }
}

export function defaultRawStore(env: Record<string, string | undefined> = process.env): RawStore {
  const kind = env.FEED_RAW_STORE ?? (isProductionDeployment(env) ? 'supabase' : 'local')
  if (kind === 'supabase') {
    const url = env.NEXT_PUBLIC_SUPABASE_URL
    const key = env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('A Supabase Storage-hoz NEXT_PUBLIC_SUPABASE_URL és SUPABASE_SERVICE_ROLE_KEY kell.')
    return new SupabaseRawStore(url.replace(/\/$/, ''), key)
  }
  return new LocalRawStore()
}
