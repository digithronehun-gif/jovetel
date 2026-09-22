/** Determinisztikus álvéletlen (mulberry32), hogy a seed minden futáskor ugyanazt adja. */
export function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)]!,
    chance: (p: number) => next() < p,
  }
}
export type Rng = ReturnType<typeof rng>

/** Érvényes EAN-13 (599 = magyar GS1-előtag), ellenőrző számjeggyel. */
export function ean13(r: Rng): string {
  const digits = [5, 9, 9, ...Array.from({ length: 9 }, () => r.int(0, 9))]
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0)
  return [...digits, (10 - (sum % 10)) % 10].join('')
}

/** Magyar kerekítés „…90”-re (pl. 4 990 Ft). */
export function roundPrice(huf: number): number {
  return Math.max(290, Math.round(huf / 100) * 100 - 10)
}
