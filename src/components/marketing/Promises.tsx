import { HeartHandshake, ScanSearch, Scale } from 'lucide-react'
import { PROMISES } from '@/content/landing'

const ICONS = { arak: ScanSearch, emlekszik: HeartHandshake, atlathato: Scale } as const

/** Három ígéret (PRODUCT_SPEC 3.3). */
export function Promises() {
  return (
    <section aria-labelledby="igeretek" className="mx-auto max-w-landing px-4 sm:px-6 md:px-8">
      <h2 id="igeretek" className="sr-only">
        Három ígéretünk
      </h2>
      <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
        {PROMISES.map((p) => {
          const Icon = ICONS[p.key]
          return (
            <li key={p.key} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-peach text-ink">
                <Icon aria-hidden className="size-5" strokeWidth={1.75} />
              </span>
              <h3 className="text-title text-ink">{p.title}</h3>
              <p className="text-body text-ink-muted">{p.text}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
