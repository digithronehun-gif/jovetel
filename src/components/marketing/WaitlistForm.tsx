'use client'

import { CircleCheck } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useEffect, useId } from 'react'
import { joinWaitlist, type WaitlistState } from '@/app/actions/waitlist'
import { useTrack } from '@/components/consent/ConsentProvider'
import { Turnstile } from '@/components/security/Turnstile'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { describedBy, Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'

const USE_CASES = [
  { value: 'gifts', label: 'Ajándékozás' },
  { value: 'beauty', label: 'Szépségápolás' },
  { value: 'both', label: 'Mindkettő' },
] as const

/** Várólista-űrlap (PRODUCT_SPEC 3.11). JavaScript nélkül is elküldhető (Server Action). */
export function WaitlistForm({
  nonce,
  utm = {},
  className,
}: {
  nonce?: string
  utm?: Record<string, string>
  className?: string
}) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { status: 'idle' })
  const id = useId()
  const track = useTrack()
  useEffect(() => {
    if (state.status === 'success') track('waitlist_submit')
  }, [state.status, track])

  if (state.status === 'success') {
    return (
      <div role="status" data-waitlist-success className={cn('flex items-start gap-3 rounded-lg border border-line bg-surface p-5', className)}>
        <CircleCheck aria-hidden className="mt-0.5 size-6 shrink-0 text-deal" />
        <div>
          <p className="text-body font-bold text-ink">Köszönjük! Küldtünk egy megerősítő levelet.</p>
          <p className="text-small font-normal text-ink-muted">Nyisd meg, és kattints a „Megerősítem” gombra.</p>
        </div>
      </div>
    )
  }

  const fe = state.status === 'error' ? state.fieldErrors : undefined
  const emailId = `${id}-email`
  return (
    <form action={action} noValidate className={cn('flex flex-col gap-5', className)} data-waitlist-form>
      <Field id={emailId} label="E-mail-cím" error={fe?.email}>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="nev@pelda.hu"
          aria-invalid={fe?.email ? true : undefined}
          aria-describedby={describedBy(emailId, false, fe?.email)}
        />
      </Field>
      <fieldset className="flex flex-col gap-2" aria-describedby={fe?.useCase ? `${id}-uc-error` : undefined}>
        <legend className="mb-1.5 text-small text-ink">Mire használnád?</legend>
        <div className="flex flex-wrap gap-2">
          {USE_CASES.map((u) => (
            <label key={u.value} className="relative cursor-pointer">
              <input type="radio" name="useCase" value={u.value} required className="peer sr-only" defaultChecked={u.value === 'both'} />
              <span className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-small text-ink transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-deep">
                {u.label}
              </span>
            </label>
          ))}
        </div>
        {fe?.useCase ? (
          <p id={`${id}-uc-error`} role="alert" className="text-small text-pricier">
            {fe.useCase}
          </p>
        ) : null}
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-small font-normal text-ink">
        <input type="checkbox" name="marketing" className="mt-0.5 size-5 shrink-0 accent-[var(--ink)]" />
        <span>
          Kérem a heti válogatást ajánlatokkal és ötletekkel. <span className="text-ink-muted">(nem kötelező, bármikor leiratkozhatsz)</span>
        </span>
      </label>
      {Object.entries(utm).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {/* mézesbödön: embernek láthatatlan */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Weboldal
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Turnstile nonce={nonce} />
      {state.status === 'error' && !fe?.email && !fe?.useCase ? (
        <p role="alert" className="text-small text-pricier">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" loading={pending} loadingText="Küldjük…" className="w-full sm:w-auto" data-cta="waitlist">
          Feliratkozom a várólistára
        </Button>
        <p className="text-xs text-ink-muted">
          A feliratkozással elfogadod az{' '}
          <Link href="/adatvedelem" className="underline underline-offset-2 hover:text-ink">
            adatkezelési tájékoztatót
          </Link>
          . Double opt-in: csak a megerősítés után kerülsz a listára.
        </p>
      </div>
    </form>
  )
}
