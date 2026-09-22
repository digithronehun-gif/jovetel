import type { ReactNode } from 'react'
import { formatDate } from '@/lib/format/date'

/** Szöveges oldal (DESIGN_SYSTEM 4. pont: 680 px széles), a jogi oldalak és a leírások közös kerete. */
export function LegalPage({
  title,
  intro,
  updated,
  draft = true,
  children,
}: {
  title: ReactNode
  intro?: ReactNode
  updated: string
  /** ügyvédi átnézésig jól látható jelölés (LAUNCH_CHECKLIST) */
  draft?: boolean
  children: ReactNode
}) {
  return (
    <main id="tartalom" className="mx-auto max-w-prose px-4 py-10 sm:px-6 md:py-16">
      <header className="flex flex-col gap-4 border-b border-line pb-8">
        <h1 className="text-display-l text-ink">{title}</h1>
        {intro ? <p className="text-body-l text-ink-muted">{intro}</p> : null}
        <p className="text-small text-ink-muted">Utolsó frissítés: {formatDate(`${updated}T12:00:00Z`)}</p>
        {draft ? (
          <p className="rounded-md border border-line bg-stone px-4 py-3 text-small text-ink">
            Tervezet: ügyvédi átnézés előtt. A <strong>[KITÖLTENDŐ]</strong> részeket a tulajdonos adja meg.
          </p>
        ) : null}
      </header>
      <div className="legal-prose mt-8 flex flex-col gap-8">{children}</div>
    </main>
  )
}

export function LegalSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-3">
      <h2 className="text-title text-ink">{title}</h2>
      <div className="flex flex-col gap-3 text-body text-ink [&_a]:text-amber-deep [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  )
}

/** Jól látható helykitöltő a hiányzó cégadatokhoz (OPEN_QUESTIONS #2). */
export function Fill({ children = 'KITÖLTENDŐ' }: { children?: ReactNode }) {
  return <mark className="rounded-sm bg-peach px-1 text-ink">[{children}]</mark>
}
