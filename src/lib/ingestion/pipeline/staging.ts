/**
 * A normalizált tételek átmeneti tárolása lemezen (NDJSON): a minőségi kapu csak a teljes feed feldolgozása
 * után dönthet, a publikálás pedig kötegenként olvassa vissza — így a memória 50 000 tételnél is stabil.
 */
import { createReadStream, createWriteStream, type WriteStream } from 'node:fs'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import type { NormalizedItem } from '../types'

export class StagingWriter {
  private out: WriteStream
  count = 0
  constructor(readonly path: string) {
    this.out = createWriteStream(path, { encoding: 'utf8' })
  }
  async write(item: NormalizedItem): Promise<void> {
    this.count++
    if (!this.out.write(`${JSON.stringify(item)}\n`)) await once(this.out, 'drain')
  }
  async close(): Promise<void> {
    this.out.end()
    await once(this.out, 'finish')
  }
}

/** Kötegek a lemezről (a sorrend a feed sorrendje). */
export async function* readBatches(path: string, size: number): AsyncGenerator<NormalizedItem[]> {
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity })
  let batch: NormalizedItem[] = []
  for await (const line of rl) {
    if (!line) continue
    batch.push(JSON.parse(line) as NormalizedItem)
    if (batch.length >= size) {
      yield batch
      batch = []
    }
  }
  if (batch.length) yield batch
}
