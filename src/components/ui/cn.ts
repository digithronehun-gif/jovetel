import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// A saját tipográfiai utility-ket (text-display-xl, text-price…) betűméretként kezeljük,
// hogy a tailwind-merge ne dobja el őket egy szín-osztály (text-ink) mellett.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-xl',
            'display-l',
            'display-m',
            'title',
            'body-l',
            'body',
            'small',
            'eyebrow',
            'price-l',
            'price',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
