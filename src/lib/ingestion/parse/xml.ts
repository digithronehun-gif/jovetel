/**
 * Streaming XML (`saxes`): a megadott elemnevű tételeket (`item`, `entry`, `SHOPITEM`, `offer`…) lapos
 * kulcs–érték rekorddá alakítja. Kulcsok: a tételen belüli elem-útvonal a névtér-előtag nélkül, pontokkal
 * (`shipping.price`); a tétel attribútumai `@név`; a `name` attribútumos gyermek `param[Térfogat]`.
 * Ismétlődő elem értékei sortöréssel fűződnek össze. Hibás XML esetén a hiba bekerül a statisztikába, és a
 * parser megpróbálja folytatni. DTD-entitásokat nem bont ki (XML-bomba ellen).
 */
import { SaxesParser } from 'saxes'
import type { Readable } from 'node:stream'
import type { RawItem } from '../types'
import type { ParsedRecord } from './csv'
import { decodeStream, type FeedEncoding } from './decode'

/** A feedekben gyakori HTML-entitások (a szabványos XML-ből hiányoznak). */
const HTML_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  deg: '°',
  times: '×',
  aacute: 'á',
  Aacute: 'Á',
  eacute: 'é',
  Eacute: 'É',
  iacute: 'í',
  Iacute: 'Í',
  oacute: 'ó',
  Oacute: 'Ó',
  ouml: 'ö',
  Ouml: 'Ö',
  odblac: 'ő',
  Odblac: 'Ő',
  uacute: 'ú',
  Uacute: 'Ú',
  uuml: 'ü',
  Uuml: 'Ü',
  udblac: 'ű',
  Udblac: 'Ű',
}

export interface XmlOptions {
  /** a tétel-elem(ek) helyi neve, pl. ['item', 'entry'] */
  itemTags: string[]
  encoding?: FeedEncoding | 'auto'
  /** egy tétel legnagyobb szövegmérete (karakter) */
  maxItemChars?: number
}

const localName = (name: string) => name.slice(name.indexOf(':') + 1)

export async function* parseXml(src: Readable, opts: XmlOptions): AsyncGenerator<ParsedRecord & { __tag?: string }> {
  const { text } = await decodeStream(src, opts.encoding ?? 'auto')
  const itemTags = new Set(opts.itemTags)
  const maxChars = opts.maxItemChars ?? 1_000_000

  const parser = new SaxesParser({ xmlns: false, position: true })
  Object.assign(parser.ENTITIES, HTML_ENTITIES)

  const ready: (ParsedRecord & { __tag?: string })[] = []
  let current: RawItem | null = null
  let currentTag = ''
  let size = 0
  let tooBig = false
  // a tétel-elem saját szövege (pl. YML: <category id="1">Arcápolás</category>)
  let ownText = ''
  // az aktuális tételen belüli útvonal (helyi nevek) és a nyitott elemek szövege
  const path: string[] = []
  const texts: string[] = []
  const errors: string[] = []

  parser.on('error', (e) => {
    if (errors.length < 50) errors.push(e.message.slice(0, 200))
  })
  parser.on('opentag', (tag) => {
    const name = localName(tag.name)
    if (!current && itemTags.has(name)) {
      current = {}
      currentTag = name
      size = 0
      tooBig = false
      ownText = ''
      for (const [k, v] of Object.entries(tag.attributes)) current[`@${localName(k)}`] = String(v)
      return
    }
    if (!current) return
    const nameAttr = (tag.attributes as Record<string, string>).name
    path.push(nameAttr ? `${name}[${nameAttr}]` : name)
    texts.push('')
    // a gyermek-elem attribútumai is elérhetők (pl. <price currency="HUF">)
    for (const [k, v] of Object.entries(tag.attributes)) {
      if (k !== 'name') current[`${path.join('.')}@${localName(k)}`] = String(v)
    }
  })
  const onText = (t: string) => {
    if (!current) return
    size += t.length
    if (size > maxChars) {
      tooBig = true
      return
    }
    if (texts.length === 0) ownText += t
    else texts[texts.length - 1] += t
  }
  parser.on('text', onText)
  parser.on('cdata', onText)
  parser.on('closetag', (tag) => {
    const name = localName(tag.name)
    if (!current) return
    if (path.length === 0 && name === currentTag) {
      if (tooBig) ready.push({ __parseError: `A tétel túl nagy (${maxChars} karakter felett).` })
      else {
        const own = ownText.trim()
        ready.push({ ...current, ...(own ? { __text: own } : {}), __tag: currentTag })
      }
      current = null
      return
    }
    const key = path.join('.')
    const value = (texts.pop() ?? '').trim()
    path.pop()
    if (value) current[key] = current[key] ? `${current[key]}\n${value}` : value
  })

  for await (const chunk of text) {
    parser.write(chunk)
    while (errors.length) ready.push({ __parseError: errors.shift()! })
    while (ready.length) yield ready.shift()!
  }
  parser.close()
  while (errors.length) ready.push({ __parseError: errors.shift()! })
  while (ready.length) yield ready.shift()!
}
