import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Wordmark } from '@/components/brand/Wordmark'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin · JóVétel' },
  robots: { index: false, follow: false },
}

/**
 * Az admin kerete: könnyű felső sáv, nincs nehéz SaaS-oldalsáv (DESIGN_SYSTEM). A jogosultságot MINDEN oldal és
 * Server Action maga ellenőrzi (`requireAdmin()`), mert a layout kliensoldali navigációnál nem fut újra.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-app items-center gap-6 px-4 sm:px-6">
          <Link href="/admin/feedek" className="flex items-center gap-2 text-ink" aria-label="Admin kezdőlap">
            <Wordmark className="h-6" />
            <span className="text-xs font-bold tracking-wide text-ink-muted uppercase">Admin</span>
          </Link>
          <nav aria-label="Admin navigáció" className="flex gap-1 text-small">
            <Link href="/admin/feedek" className="rounded-full px-3 py-1.5 text-ink hover:bg-stone">
              Feedek
            </Link>
          </nav>
        </div>
      </header>
      <main id="tartalom" className="mx-auto max-w-app px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
