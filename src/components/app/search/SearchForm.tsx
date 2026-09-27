import { Search } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { MAX_QUERY_LENGTH } from '@/lib/search'

/** Keresőmező (PRODUCT_SPEC 5.2): sima GET-űrlap a /kereses-re; új kérdésnél a szűrők alaphelyzetbe állnak. */
export function SearchForm({ q, className, autoFocus = false }: { q: string; className?: string; autoFocus?: boolean }) {
  return (
    <form action="/kereses" method="get" role="search" className={cn('relative flex w-full', className)}>
      <label htmlFor="kereses-q" className="sr-only">
        Mit keresel?
      </label>
      <input
        id="kereses-q"
        name="q"
        type="search"
        defaultValue={q}
        maxLength={MAX_QUERY_LENGTH}
        autoFocus={autoFocus}
        enterKeyHint="search"
        placeholder="Mit keresel? Pl. szérum zsíros bőrre"
        className="h-13 w-full rounded-full border border-line bg-surface pr-14 pl-5 text-body-l text-ink placeholder:text-ink-subtle hover:border-ink-subtle focus-visible:border-amber-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep"
      />
      <button
        type="submit"
        aria-label="Keresés"
        className="absolute top-1 right-1 inline-flex size-11 items-center justify-center rounded-full bg-ink text-paper hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-deep"
      >
        <Search aria-hidden className="size-5" />
      </button>
    </form>
  )
}
