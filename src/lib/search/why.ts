import { FREE_FROM_LABEL, SKIN_CONCERN_WHY, SKIN_TYPE_WHY, WHY_LABEL } from '@/content/labels'
import type { VerdictKind } from '../pricing/types'
import type { SearchProfile } from './types'

export interface WhyInput {
  tags: string[]
  totalHuf: number
  verdict: VerdictKind | null
  merchantId: string
}

function pick<T extends Record<string, string>>(labels: T, key: string): string | undefined {
  return Object.hasOwn(labels, key) ? labels[key as keyof T] : undefined
}

/**
 * „Miért neked” címkék (PRODUCT_SPEC 7.1): determinisztikus, max. 3, prioritás szerint. Nem AI: a termék
 * címkéiből és a profilból. Vendégnél csak a keret (ha a szűrőben megadta) és az ítélet.
 */
export function whyForYou(input: WhyInput, ctx: { profile?: SearchProfile | null; budgetMaxHuf?: number | null }): string[] {
  const out: string[] = []
  const p = ctx.profile
  const has = (prefix: string, values: string[]) => values.filter((v) => input.tags.includes(`${prefix}:${v}`))
  if (p) {
    // 1. profil-egyezés: bőrtípus
    if (p.skinType) {
      const label = has('skin_type', [p.skinType]).map((v) => pick(SKIN_TYPE_WHY, v))[0]
      if (label) out.push(label)
    }
    // 2. mentes-egyezés: a kerülendők közül az első, amitől mentes
    const free = has('free_from', p.avoidIngredients).map((v) => pick(FREE_FROM_LABEL, v)).find(Boolean)
    if (free) out.push(free)
    // 3. gond-egyezés
    const concern = has('concern', p.skinConcerns).map((v) => pick(SKIN_CONCERN_WHY, v)).find(Boolean)
    if (concern) out.push(concern)
  }
  // 4. keret
  const budget = ctx.budgetMaxHuf ?? p?.budgetMaxHuf ?? null
  if (budget !== null && input.totalHuf <= budget) out.push(WHY_LABEL.budget)
  // 5. ítélet
  if (input.verdict === 'deal') out.push(WHY_LABEL.deal)
  // 6. kedvenc bolt
  if (p?.favoriteMerchantIds.includes(input.merchantId)) out.push(WHY_LABEL.favoriteMerchant)
  return out.slice(0, 3)
}
