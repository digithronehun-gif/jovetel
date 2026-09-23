'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { runFeedNow, type RunNowState } from './actions'

export function RunNowButton({ feedId, disabled }: { feedId: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState<RunNowState, FormData>(runFeedNow, { status: 'idle' })
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="feedId" value={feedId} />
      <Button type="submit" size="sm" loading={pending} loadingText="Indítás…" disabled={disabled} data-run-now>
        Futtatás most
      </Button>
      {state.status !== 'idle' ? (
        <p role="status" className={state.status === 'error' ? 'text-small text-pricier' : 'text-small text-ink-muted'}>
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
