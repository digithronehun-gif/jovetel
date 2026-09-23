/**
 * SSRF-védett, streamelt letöltés (csak az ingest scriptből fut). A kapcsolódás egyedi DNS-feloldással
 * történik: minden feloldott címet ellenőrzünk, és csak nyilvános címre kapcsolódunk. Átirányításonként
 * újra ellenőrzünk; méret- és időkorlát; a gzip automatikusan kicsomagolódik (a bájtok alapján is).
 */
import { lookup as dnsLookup, type LookupAddress } from 'node:dns'
import { createReadStream, realpathSync } from 'node:fs'
import { request } from 'node:https'
import type { IncomingMessage } from 'node:http'
import { resolve, sep } from 'node:path'
import { PassThrough, Readable, Transform, pipeline } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { createGunzip } from 'node:zlib'
import { FeedUrlError, assertFeedUrl, isPrivateAddress, redactUrl } from './ssrf'

export interface DownloadOptions {
  allowlist: readonly string[]
  /** a tömörített válasz felső határa (alapértelmezés 512 MB) */
  maxBytes?: number
  /** kicsomagolt felső határ (tömörítési bomba ellen, alapértelmezés 4 GB) */
  maxDecompressedBytes?: number
  /** a teljes letöltés határideje (alapértelmezés 20 perc) */
  timeoutMs?: number
  /** tétlen kapcsolat határa (alapértelmezés 60 s) */
  idleTimeoutMs?: number
  maxRedirects?: number
  headers?: Record<string, string>
  /** `file:` forrás csak ezekből a könyvtárakból (csak `--fixtures` / teszt) */
  allowFileRoots?: readonly string[]
}

export class DownloadError extends Error {
  constructor(
    message: string,
    readonly code: 'status' | 'too_large' | 'timeout' | 'redirects' | 'network',
  ) {
    super(message)
    this.name = 'DownloadError'
  }
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void

/** DNS-feloldás, ami minden címet ellenőriz: ha BÁRMELYIK nem nyilvános, a kapcsolat nem jön létre. */
export function safeLookup(
  hostname: string,
  options: { all?: boolean; family?: number } | number,
  callback: LookupCb,
): void {
  dnsLookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err, [])
    const list = addresses as LookupAddress[]
    const bad = list.find((a) => isPrivateAddress(a.address))
    if (bad || list.length === 0) {
      const e = new FeedUrlError(`A host nem nyilvános címre mutat: ${hostname}`, 'private_address') as unknown as NodeJS.ErrnoException
      e.code = 'EPRIVATEADDR'
      return callback(e, [])
    }
    const wantAll = typeof options === 'object' && options.all
    if (wantAll) return callback(null, list)
    callback(null, list[0]!.address, list[0]!.family)
  })
}

function byteLimit(max: number, onExceed: () => Error): Transform {
  let seen = 0
  return new Transform({
    transform(chunk: Buffer, _enc, cb) {
      seen += chunk.length
      if (seen > max) return cb(onExceed())
      cb(null, chunk)
    },
  })
}

/** Az első bájtok alapján dönt a gzip-kicsomagolásról (a kiterjesztés és a fejléc nem mindig megbízható). */
export async function maybeGunzip(src: Readable, maxDecompressed: number): Promise<Readable> {
  const it = src[Symbol.asyncIterator]()
  const first = await it.next()
  const head: Buffer = first.done ? Buffer.alloc(0) : Buffer.from(first.value as Buffer)
  async function* rest() {
    if (head.length) yield head
    for (;;) {
      const r = await it.next()
      if (r.done) return
      yield r.value as Buffer
    }
  }
  const body = Readable.from(rest(), { objectMode: false })
  if (head[0] === 0x1f && head[1] === 0x8b) {
    const out = new PassThrough()
    pipeline(
      body,
      createGunzip(),
      byteLimit(maxDecompressed, () => new DownloadError('A kicsomagolt feed túl nagy.', 'too_large')),
      out,
      () => {},
    )
    return out
  }
  return body
}

function fileSource(url: URL, roots: readonly string[]): Readable {
  const path = realpathSync(fileURLToPath(url))
  const ok = roots.some((r) => {
    const root = realpathSync(resolve(r))
    return path === root || path.startsWith(root + sep)
  })
  if (!ok) throw new FeedUrlError('A fájl nincs az engedélyezett fixture-könyvtárban.', 'file')
  return createReadStream(path)
}

function get(url: URL, opts: DownloadOptions, signal: AbortSignal): Promise<IncomingMessage> {
  return new Promise((resolvePromise, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        lookup: safeLookup as never,
        headers: { 'user-agent': 'JoVetel-FeedBot/1.0', 'accept-encoding': 'gzip', ...opts.headers },
        signal,
        timeout: opts.idleTimeoutMs ?? 60_000,
      },
      resolvePromise,
    )
    req.on('timeout', () => req.destroy(new DownloadError('A feed-szerver nem válaszol.', 'timeout')))
    req.on('error', reject)
    req.end()
  })
}

/**
 * Letöltés streamként. A visszaadott folyam a (kicsomagolt) tartalom; a hívó a nyers pillanatképet
 * ebből (újratömörítve) menti.
 */
export async function safeDownload(raw: string, opts: DownloadOptions): Promise<Readable> {
  const maxBytes = opts.maxBytes ?? 512 * 1024 * 1024
  const maxDecompressed = opts.maxDecompressedBytes ?? 4 * 1024 * 1024 * 1024

  if (raw.startsWith('file:')) {
    if (!opts.allowFileRoots?.length) throw new FeedUrlError('Fájl-forrás csak fixture-futásban engedélyezett.', 'file')
    return maybeGunzip(fileSource(new URL(raw), opts.allowFileRoots), maxDecompressed)
  }

  const controller = new AbortController()
  const deadline = setTimeout(
    () => controller.abort(new DownloadError('A letöltés túllépte az időkorlátot.', 'timeout')),
    opts.timeoutMs ?? 20 * 60_000,
  )
  deadline.unref()

  let url = assertFeedUrl(raw, opts.allowlist)
  let res: IncomingMessage | null = null
  for (let hop = 0; ; hop++) {
    try {
      res = await get(url, opts, controller.signal)
    } catch (e) {
      clearTimeout(deadline)
      if (e instanceof FeedUrlError || e instanceof DownloadError) throw e
      if ((e as NodeJS.ErrnoException).code === 'EPRIVATEADDR') throw new FeedUrlError((e as Error).message, 'private_address')
      throw new DownloadError(`Hálózati hiba: ${(e as Error).message} (${redactUrl(url.href)})`, 'network')
    }
    const status = res.statusCode ?? 0
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume()
      if (hop >= (opts.maxRedirects ?? 3)) {
        clearTimeout(deadline)
        throw new DownloadError('Túl sok átirányítás.', 'redirects')
      }
      // minden átirányítási célt újra ellenőrzünk
      url = assertFeedUrl(new URL(res.headers.location, url).href, opts.allowlist)
      continue
    }
    if (status !== 200) {
      res.resume()
      clearTimeout(deadline)
      throw new DownloadError(`A feed-szerver ${status} választ adott (${redactUrl(url.href)}).`, 'status')
    }
    break
  }
  const declared = Number(res.headers['content-length'] ?? 0)
  if (declared > maxBytes) {
    res.destroy()
    clearTimeout(deadline)
    throw new DownloadError('A feed túl nagy.', 'too_large')
  }
  const limited = new PassThrough()
  pipeline(res, byteLimit(maxBytes, () => new DownloadError('A feed túl nagy.', 'too_large')), limited, () =>
    clearTimeout(deadline),
  )
  return maybeGunzip(limited, maxDecompressed)
}
