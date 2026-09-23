/**
 * Kódolás-felismerés és dekódolás streamként. A magyar feedek jelentős része Windows-1250 vagy ISO-8859-2;
 * ha a beállítás nem mondja meg, az első 64 KB alapján döntünk: érvényes UTF-8 → UTF-8, egyébként Windows-1250.
 * A hibás bájtok U+FFFD-vé válnak; az ilyen sorokat a normalizáló „encoding” okkal utasítja el.
 */
import { Readable } from 'node:stream'

export type FeedEncoding = 'utf-8' | 'windows-1250' | 'iso-8859-2'
export const REPLACEMENT_CHAR = '�'

/**
 * Egy-egy hibás bájt (egy rossz sor) ne fordítsa át az egész UTF-8 fájlt: akkor UTF-8, ha a minta hibátlan,
 * vagy a nem ASCII karakterek legalább kétszer annyian vannak, mint a hibás bájtsorozatok. A Windows-1250
 * szöveg UTF-8-ként olvasva szinte csak hibás sorozatot ad (az ékezetes bájtot ASCII követi).
 */
export function detectEncoding(sample: Uint8Array): FeedEncoding {
  // UTF-8 BOM
  if (sample[0] === 0xef && sample[1] === 0xbb && sample[2] === 0xbf) return 'utf-8'
  const text = new TextDecoder('utf-8').decode(sample, { stream: true })
  let bad = 0
  let good = 0
  for (const ch of text) {
    if (ch === REPLACEMENT_CHAR) bad++
    else if (ch.codePointAt(0)! > 0x7f) good++
  }
  if (bad === 0 || good >= bad * 2) return 'utf-8'
  return 'windows-1250'
}

export interface DecodedStream {
  encoding: FeedEncoding
  text: AsyncIterable<string>
}

const SAMPLE = 64 * 1024

/** Bájtfolyam → szövegdarabok, a megadott vagy felismert kódolással. */
export async function decodeStream(src: Readable, encoding: FeedEncoding | 'auto' = 'auto'): Promise<DecodedStream> {
  const it = src[Symbol.asyncIterator]()
  const head: Buffer[] = []
  let headLen = 0
  let done = false
  while (headLen < SAMPLE) {
    const r = await it.next()
    if (r.done) {
      done = true
      break
    }
    const b = Buffer.isBuffer(r.value) ? r.value : Buffer.from(r.value as Uint8Array)
    head.push(b)
    headLen += b.length
  }
  const first = Buffer.concat(head)
  const enc = encoding === 'auto' ? detectEncoding(first.subarray(0, SAMPLE)) : encoding
  const decoder = new TextDecoder(enc)
  async function* text() {
    if (first.length) yield decoder.decode(first, { stream: true })
    if (!done) {
      for (;;) {
        const r = await it.next()
        if (r.done) break
        yield decoder.decode(r.value as Uint8Array, { stream: true })
      }
    }
    const tail = decoder.decode()
    if (tail) yield tail
  }
  return { encoding: enc, text: text() }
}

/** Szöveg-iterátor → Readable (a csv-parse-nak). */
export function textToReadable(text: AsyncIterable<string>): Readable {
  return Readable.from(text, { objectMode: false, encoding: 'utf8' })
}
