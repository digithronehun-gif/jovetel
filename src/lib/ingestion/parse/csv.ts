/**
 * Streaming CSV (RFC 4180, `csv-parse`): idézett sortörés, BOM, laza idézőjelek; a hibás sor nem állítja meg a
 * futást (`skip_records_with_error`), hanem `parse_error`-ként kerül a statisztikába. Az elválasztót a fejlécsorból
 * ismerjük fel, ha a beállítás nem adja meg.
 */
import { parse } from 'csv-parse'
import type { Readable } from 'node:stream'
import type { RawItem } from '../types'
import { decodeStream, textToReadable, type FeedEncoding } from './decode'

export interface ParseFailure {
  __parseError: string
}
export type ParsedRecord = RawItem | ParseFailure

export function isParseFailure(r: ParsedRecord): r is ParseFailure {
  return typeof (r as ParseFailure).__parseError === 'string'
}

const CANDIDATES = [',', ';', '\t', '|'] as const

/** Az elválasztó a fejlécsorban leggyakoribb jelölt (idézőjelen kívül). */
export function sniffDelimiter(headerLine: string): string {
  const counts = new Map<string, number>(CANDIDATES.map((c) => [c, 0]))
  let quoted = false
  for (const ch of headerLine) {
    if (ch === '"') quoted = !quoted
    else if (!quoted && counts.has(ch)) counts.set(ch, counts.get(ch)! + 1)
  }
  let best = ','
  let max = 0
  for (const [c, n] of counts) {
    if (n > max) {
      best = c
      max = n
    }
  }
  return best
}

export interface CsvOptions {
  delimiter?: string
  encoding?: FeedEncoding | 'auto'
  /** egy rekord legnagyobb mérete karakterben (egy 1 GB-os sor ne ölje meg a memóriát) */
  maxRecordSize?: number
}

export async function* parseCsv(src: Readable, opts: CsvOptions = {}): AsyncGenerator<ParsedRecord> {
  const { text } = await decodeStream(src, opts.encoding ?? 'auto')
  // az első darabból kiolvassuk a fejlécet az elválasztó felismeréséhez
  const iter = text[Symbol.asyncIterator]()
  const firstChunk = await iter.next()
  const first = firstChunk.done ? '' : firstChunk.value
  const delimiter = opts.delimiter ?? sniffDelimiter(first.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '')
  async function* all() {
    if (first) yield first
    for (;;) {
      const r = await iter.next()
      if (r.done) return
      yield r.value
    }
  }

  const skipped: string[] = []
  const parser = parse({
    delimiter,
    bom: true,
    columns: (header: string[]) => header.map((h) => h.trim().replace(/^﻿/, '')),
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
    skip_records_with_error: true,
    max_record_size: opts.maxRecordSize ?? 1_000_000,
    trim: false,
    cast: false,
  })
  parser.on('skip', (err: Error) => skipped.push(err.message.slice(0, 200)))
  textToReadable(all()).pipe(parser)

  for await (const rec of parser as AsyncIterable<Record<string, string | undefined>>) {
    while (skipped.length) yield { __parseError: skipped.shift()! }
    const out: RawItem = {}
    for (const [k, v] of Object.entries(rec)) if (k) out[k] = v ?? ''
    yield out
  }
  while (skipped.length) yield { __parseError: skipped.shift()! }
}
