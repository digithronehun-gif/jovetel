import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/components/ui/cn'
import type { SearchState } from '@/lib/search'
import type { HrefFor } from './FilterPanel'

/** Lapozás: előző / következő és a közeli oldalszámok (a lapozás maximuma MAX_PAGE). */
export function Pagination({ state, pageCount, hrefFor }: { state: SearchState; pageCount: number; hrefFor: HrefFor }) {
  if (pageCount <= 1) return null
  const page = Math.min(state.page, pageCount)
  const to = (p: number) => hrefFor({ ...state, page: p })
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount].filter((p) => p >= 1 && p <= pageCount))].sort((a, b) => a - b)
  const item = 'inline-flex size-11 items-center justify-center rounded-full text-body tabular-nums'
  return (
    <nav aria-label="Lapozás" className="flex items-center justify-center gap-1 pt-4">
      {page > 1 ? (
        <Link href={to(page - 1)} rel="prev" className={cn(item, 'text-ink hover:bg-stone')} aria-label="Előző oldal">
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
      ) : null}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - pages[i - 1]! > 1 ? <span aria-hidden className="px-1 text-ink-subtle">…</span> : null}
          {p === page ? (
            <span aria-current="page" className={cn(item, 'bg-ink text-paper')}>
              {p}
            </span>
          ) : (
            <Link href={to(p)} className={cn(item, 'text-ink hover:bg-stone')} aria-label={`${p}. oldal`}>
              {p}
            </Link>
          )}
        </span>
      ))}
      {page < pageCount ? (
        <Link href={to(page + 1)} rel="next" className={cn(item, 'text-ink hover:bg-stone')} aria-label="Következő oldal">
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      ) : null}
    </nav>
  )
}
