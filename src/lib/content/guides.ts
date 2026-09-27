/**
 * Szerkesztői útmutatók szabályai (PRODUCT_SPEC 9. pont): indexelés csak, ha legalább 5 tétel és legalább 150 szó
 * szerkesztői szöveg (bevezető + tételmegjegyzések) van, és nem maradt benne kitöltendő helyőrző.
 */
export const GUIDE_MIN_ITEMS = 5
export const GUIDE_MIN_WORDS = 150
export const PLACEHOLDER_MARK = '[KITÖLTENDŐ]'

/** Szavak száma: szóközzel határolt, legalább egy betűt tartalmazó egységek (a számok és jelek nem számítanak). */
export function countWords(text: string | null | undefined): number {
  if (!text) return 0
  return text.split(/\s+/u).filter((w) => /\p{L}/u.test(w)).length
}

export interface GuideIndexability {
  indexable: boolean
  items: number
  words: number
  reasons: string[]
}

export function guideIndexability(input: { intro: string | null; notes: (string | null)[] }): GuideIndexability {
  const items = input.notes.length
  const texts = [input.intro, ...input.notes]
  const words = texts.reduce((n, t) => n + countWords(t), 0)
  const reasons: string[] = []
  if (items < GUIDE_MIN_ITEMS) reasons.push(`legalább ${GUIDE_MIN_ITEMS} tétel kell (most ${items})`)
  if (words < GUIDE_MIN_WORDS) reasons.push(`legalább ${GUIDE_MIN_WORDS} szó szerkesztői szöveg kell (most ${words})`)
  if (texts.some((t) => t?.includes(PLACEHOLDER_MARK))) reasons.push('kitöltendő helyőrző maradt a szövegben')
  return { indexable: reasons.length === 0, items, words, reasons }
}

/** A bevezető bekezdései (üres sor választja el őket). Szövegként renderelünk, markup nincs. */
export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/u)
    .map((p) => p.replace(/\s+/gu, ' ').trim())
    .filter(Boolean)
}
