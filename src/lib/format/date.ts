/**
 * Magyar dátumformázók. Mindig `hu-HU` locale és `Europe/Budapest` időzóna (CLAUDE.md 9. pont).
 */
export const TIME_ZONE = 'Europe/Budapest'
export const LOCALE = 'hu-HU'

type DateInput = Date | string | number

function toDate(input: DateInput): Date {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) throw new RangeError(`Érvénytelen dátum: ${String(input)}`)
  return d
}

const formatters = {
  /** 2026. szept. 22. */
  short: new Intl.DateTimeFormat(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: TIME_ZONE,
  }),
  /** szeptember 22., kedd */
  long: new Intl.DateTimeFormat(LOCALE, {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: TIME_ZONE,
  }),
  /** szeptember 22. */
  monthDay: new Intl.DateTimeFormat(LOCALE, { month: 'long', day: 'numeric', timeZone: TIME_ZONE }),
  /** szept. 22. */
  monthDayShort: new Intl.DateTimeFormat(LOCALE, {
    month: 'short',
    day: 'numeric',
    timeZone: TIME_ZONE,
  }),
  /** szept. 22. 07:00 */
  dateTime: new Intl.DateTimeFormat(LOCALE, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }),
  /** 2026. szeptember */
  monthYear: new Intl.DateTimeFormat(LOCALE, {
    year: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  }),
} as const

export type DateStyle = keyof typeof formatters

export function formatDate(input: DateInput, style: DateStyle = 'short'): string {
  return formatters[style].format(toDate(input))
}

/** Hónap + nap (időzóna nélküli naptári nap, pl. névnap): „november 25.” */
export function formatMonthDay(
  month: number,
  day: number,
  style: 'long' | 'short' = 'long',
): string {
  // Déli UTC-időpont, hogy semmilyen időzónában ne csússzon át a szomszéd napra.
  const d = new Date(Date.UTC(2000, month - 1, day, 12))
  return (style === 'long' ? formatters.monthDay : formatters.monthDayShort).format(d)
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Budapesti naptári nap (YYYY-MM-DD) egy időpontra. */
export function budapestDayKey(input: DateInput): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TIME_ZONE,
  }).format(toDate(input))
  return parts // en-CA formátuma: 2026-09-22
}

function dayDiff(a: Date, b: Date): number {
  const ka = Date.parse(`${budapestDayKey(a)}T00:00:00Z`)
  const kb = Date.parse(`${budapestDayKey(b)}T00:00:00Z`)
  return Math.round((ka - kb) / DAY)
}

/**
 * Relatív idő, a magyar felület szokásai szerint: „most”, „5 perce”, „2 órája”, „tegnap”,
 * „3 napja”, „holnap”, „10 nap múlva”. Napokat budapesti naptári napként számol.
 */
export function formatRelative(input: DateInput, now: DateInput = new Date()): string {
  const d = toDate(input)
  const n = toDate(now)
  const diff = d.getTime() - n.getTime()
  const abs = Math.abs(diff)
  const future = diff > 0

  if (abs < MINUTE) return 'most'
  if (abs < HOUR) {
    const m = Math.floor(abs / MINUTE)
    return future ? `${m} perc múlva` : `${m} perce`
  }
  const days = dayDiff(d, n)
  if (abs < 6 * HOUR || days === 0) {
    const h = Math.floor(abs / HOUR)
    return future ? `${h} óra múlva` : `${h} órája`
  }
  if (days === -1) return 'tegnap'
  if (days === 1) return 'holnap'
  const ad = Math.abs(days)
  if (!future) {
    if (ad < 14) return `${ad} napja`
    if (ad < 60) return `${Math.floor(ad / 7)} hete`
    if (ad < 365) return `${Math.floor(ad / 30)} hónapja`
    return `${Math.floor(ad / 365)} éve`
  }
  if (ad < 60) return `${ad} nap múlva`
  if (ad < 365) return `${Math.floor(ad / 30)} hónap múlva`
  return `${Math.floor(ad / 365)} év múlva`
}

/** Hány naptári nap van hátra (budapesti idő szerint); a mai nap 0. */
export function daysUntil(input: DateInput, now: DateInput = new Date()): number {
  return dayDiff(toDate(input), toDate(now))
}
