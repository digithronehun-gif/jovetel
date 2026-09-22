/**
 * A tokenek szín-értékeinek TÜKRE azokra a helyekre, ahol CSS-változó nem használható
 * (e-mail sablonok, OG-kép, favicon, <meta name="theme-color">). A forrás a
 * `src/styles/tokens.css`; a `tests/unit/palette.test.ts` ellenőrzi, hogy a kettő egyezik.
 */
export const palette = {
  light: {
    paper: '#f6f1ea',
    surface: '#fffcf7',
    stone: '#eae0d2',
    line: '#ddd0be',
    ink: '#2a201a',
    'ink-muted': '#6b5a4c',
    'ink-subtle': '#8a7a6c',
    amber: '#d9822b',
    'amber-deep': '#a8581a',
    peach: '#f0c3a4',
    sky: '#a9cfe0',
    'sky-deep': '#2f6c87',
    'on-accent': '#ffffff',
    'on-ink': '#f6f1ea',
    deal: '#3f6b3a',
    'deal-bg': '#e3ebd9',
    usual: '#6b5a4c',
    'usual-bg': '#efe7db',
    pricier: '#9c3f2c',
    'pricier-bg': '#f5dfd6',
  },
  dark: {
    paper: '#17120f',
    surface: '#211a15',
    stone: '#2b231d',
    line: '#3a3028',
    ink: '#f3ebe0',
    'ink-muted': '#b9a999',
    'ink-subtle': '#8f8072',
    amber: '#e8994a',
    'amber-deep': '#f0ae68',
    peach: '#4a3226',
    sky: '#2d4a57',
    'sky-deep': '#9cc8dc',
    'on-accent': '#17120f',
    'on-ink': '#17120f',
    deal: '#a9cc98',
    'deal-bg': '#22301f',
    usual: '#cdbfb0',
    'usual-bg': '#2b231d',
    pricier: '#f0a08c',
    'pricier-bg': '#3a231c',
  },
} as const

export type ColorToken = keyof typeof palette.light
export const COLOR_TOKENS = Object.keys(palette.light) as ColorToken[]
