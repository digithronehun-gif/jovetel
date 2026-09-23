/**
 * Minőségi kapu (ARCHITECTURE 3.8): ha a tételszám az előző sikeres futás 60%-a alá esik, vagy az elutasítás
 * aránya 20% fölött van, a futás `blocked`: nem publikálunk, és riasztás megy ki. Az első futásnál nincs
 * összevetési alap, ott csak az elutasítási arány számít. Üres feed mindig blokkol.
 */
export const MIN_ITEM_RATIO = 0.6
export const MAX_REJECT_RATIO = 0.2

export interface GateInput {
  seen: number
  valid: number
  rejected: number
  previousCount: number | null
}

export type GateResult = { ok: true } | { ok: false; reason: string }

export function evaluateGate(g: GateInput): GateResult {
  if (g.valid === 0) return { ok: false, reason: 'A feedben nincs egyetlen érvényes tétel sem.' }
  if (g.previousCount && g.valid < g.previousCount * MIN_ITEM_RATIO) {
    const pct = Math.round((g.valid / g.previousCount) * 100)
    return {
      ok: false,
      reason: `A tételszám (${g.valid}) az előző sikeres futás (${g.previousCount}) ${pct}%-a, a határ ${MIN_ITEM_RATIO * 100}%.`,
    }
  }
  const ratio = g.seen > 0 ? g.rejected / g.seen : 0
  if (ratio > MAX_REJECT_RATIO) {
    return {
      ok: false,
      reason: `Az elutasított sorok aránya ${Math.round(ratio * 100)}% (${g.rejected}/${g.seen}), a határ ${MAX_REJECT_RATIO * 100}%.`,
    }
  }
  return { ok: true }
}
