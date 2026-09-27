'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

/** Rendezés: választáskor a megfelelő URL-re navigál (a lehetőségek linkjei szerveroldalon készülnek). */
export function SortSelect({ value, options }: { value: string; options: { value: string; label: string; href: string }[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <label className="flex min-w-0 items-center gap-2 text-small text-ink-muted">
      <span className="sr-only shrink-0 sm:not-sr-only">Rendezés</span>
      <select
        value={value}
        aria-busy={pending || undefined}
        onChange={(e) => {
          const href = options.find((o) => o.value === e.target.value)?.href
          if (href) start(() => router.push(href, { scroll: false }))
        }}
        className="h-10 w-full max-w-44 min-w-0 truncate rounded-full border sm:max-w-none border-line bg-surface px-3 text-small text-ink hover:border-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
