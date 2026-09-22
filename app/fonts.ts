import { Bodoni_Moda, Manrope } from 'next/font/google'

// A latin-ext KÖTELEZŐ: a latin készletből hiányzik az ő és az ű (CLAUDE.md 8. pont).
// A CSS-változók neve szándékosan eltér a Tailwind `font-display` / `font-sans` tokenjétől,
// hogy ne hivatkozzon önmagára (lásd app/globals.css → @theme).
export const display = Bodoni_Moda({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bodoni',
  display: 'swap',
})

export const sans = Manrope({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})
