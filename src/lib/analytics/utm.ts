/** Az UTM-paraméterek, amiket a várólista `source` mezőjébe mentünk (süti nélkül, rejtett mezőből). */
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

export function pickUtm(get: (k: string) => unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of UTM_KEYS) {
    const v = get(k)
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 80)
  }
  return out
}
