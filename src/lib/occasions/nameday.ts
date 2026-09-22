/**
 * Névnap-javaslat a keresztnévből (PRODUCT_SPEC 4.2, 7.6). A `lib/occasions` az alkalmak egyetlen forrása.
 * Bemenet: a névhez tartozó összes névnap-sor (DB: namedays). Kimenet: rangsorolt választási lehetőségek.
 */
export interface NamedayRowLike {
  month: number
  day: number
  isPrimary: boolean
  inCalendar: boolean
  calendarRank: number | null
}

export interface NamedayOption {
  month: number
  day: number
  isPrimary: boolean
  inCalendar: boolean
}

export interface NamedaySuggestion {
  /** ha egyértelmű: ezt mutatjuk azonnal („Névnap: november 25.”) */
  suggestion: NamedayOption | null
  /** több fő / naptári nap esetén választó kell („Melyiket tartja?”) */
  needsChoice: boolean
  /** a választóban megjelenő napok (fő napok és a közkeletű naptár napjai), rangsorolva */
  options: NamedayOption[]
  /** a név összes további napja („Más nap…”) */
  more: NamedayOption[]
}

const toOption = (r: NamedayRowLike): NamedayOption => ({
  month: r.month,
  day: r.day,
  isPrimary: r.isPrimary,
  inCalendar: r.inCalendar,
})

/** Rangsor: fő névnap → a közkeletű naptárban szerepel → a nap listájában elöl áll → naptári sorrend. */
export function rankNamedays<T extends NamedayRowLike>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) ||
      Number(b.inCalendar) - Number(a.inCalendar) ||
      (a.calendarRank ?? 99) - (b.calendarRank ?? 99) ||
      a.month - b.month ||
      a.day - b.day,
  )
}

export function suggestNameday(rows: NamedayRowLike[]): NamedaySuggestion {
  if (rows.length === 0) return { suggestion: null, needsChoice: false, options: [], more: [] }
  const ranked = rankNamedays(rows)
  const primary = ranked.filter((r) => r.isPrimary)
  const featured = ranked.filter((r) => r.isPrimary || r.inCalendar)
  const options = (featured.length > 0 ? featured : ranked).map(toOption)
  const more = ranked.filter((r) => !(r.isPrimary || r.inCalendar)).map(toOption)
  if (primary.length === 1 && options.length === 1) {
    return { suggestion: options[0]!, needsChoice: false, options, more }
  }
  if (options.length === 1) return { suggestion: options[0]!, needsChoice: false, options, more }
  // Egy fő nap, de a naptárban más napokon is szerepel: a fő napot javasoljuk, a többi választható
  if (primary.length === 1)
    return { suggestion: toOption(primary[0]!), needsChoice: true, options, more }
  return { suggestion: null, needsChoice: true, options, more }
}
