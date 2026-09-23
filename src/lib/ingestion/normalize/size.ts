/**
 * Kiszerelés-kinyerő: „30 ml”, „1,5 l” → 1500 ml, „2 x 50 ml” → 100 ml, „200 g”, „0,5 kg” → 500 g,
 * „60 db / kapszula / tabletta” → db. Először a névben keres, aztán a leírásban. A „mg” hatóanyag-mennyiség,
 * nem kiszerelés, ezért nem vesszük figyelembe.
 */
export interface Size {
  value: number
  unit: 'ml' | 'g' | 'db'
}

const UNIT = '(ml|cl|dl|l|liter|g|gr|kg|db|darab|kapszula|tabletta|pár|par)'
const NUM = '(\\d+(?:[.,]\\d+)?)'
const MULTI = new RegExp(`(?<![\\w.,])(\\d{1,3})\\s*[x×]\\s*${NUM}\\s*${UNIT}(?![\\p{L}\\d])`, 'iu')
const SINGLE = new RegExp(`(?<![\\w.,])${NUM}\\s*${UNIT}(?![\\p{L}\\d])`, 'iu')

function convert(value: number, unit: string): Size | null {
  const u = unit.toLowerCase()
  const r = (v: number) => Math.round(v * 100) / 100
  if (u === 'ml') return { value: r(value), unit: 'ml' }
  if (u === 'cl') return { value: r(value * 10), unit: 'ml' }
  if (u === 'dl') return { value: r(value * 100), unit: 'ml' }
  if (u === 'l' || u === 'liter') return { value: r(value * 1000), unit: 'ml' }
  if (u === 'g' || u === 'gr') return { value: r(value), unit: 'g' }
  if (u === 'kg') return { value: r(value * 1000), unit: 'g' }
  return { value: Math.round(value), unit: 'db' }
}

function fromText(text: string): Size | null {
  const num = (s: string) => Number(s.replace(',', '.'))
  const multi = text.match(MULTI)
  if (multi) {
    const s = convert(num(multi[1]!) * num(multi[2]!), multi[3]!)
    if (s && s.value > 0 && s.value < 100_000) return s
  }
  const single = text.match(SINGLE)
  if (single) {
    const s = convert(num(single[1]!), single[2]!)
    if (s && s.value > 0 && s.value < 100_000) return s
  }
  return null
}

export function extractSize(name: string, description?: string | null): Size | null {
  return fromText(name) ?? (description ? fromText(description.slice(0, 2000)) : null)
}
