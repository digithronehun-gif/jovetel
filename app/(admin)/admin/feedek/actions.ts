'use server'

import { join } from 'node:path'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { getSqlAdmin } from '@/lib/db/admin'
import { feedExistsForAdmin, recordAdminAction } from '@/lib/db/queries/admin/feeds'
import { deploymentEnv } from '@/lib/env'
import { defaultRawStore } from '@/lib/ingestion/pipeline/raw-store'
import { runFeed } from '@/lib/ingestion/pipeline/run'

export type RunNowState = { status: 'idle' } | { status: 'queued' | 'started'; message: string } | { status: 'error'; message: string }

const Input = z.object({ feedId: z.string().uuid() })

/**
 * [Futtatás most]: élesben a GitHub Actions `ingest` workflow-t indítja (workflow_dispatch, ugyanabban a
 * concurrency-csoportban, mint a cron); fejlesztésben, token nélkül, a futás közvetlenül indul a válasz után.
 */
export async function runFeedNow(_prev: RunNowState, form: FormData): Promise<RunNowState> {
  const admin = await requireAdmin()
  const parsed = Input.safeParse({ feedId: form.get('feedId') })
  if (!parsed.success) return { status: 'error', message: 'Érvénytelen feed-azonosító.' }
  const { feedId } = parsed.data
  if (!(await feedExistsForAdmin(admin.userId, feedId))) return { status: 'error', message: 'Nincs ilyen feed.' }

  const token = process.env.INGEST_DISPATCH_TOKEN
  const repo = process.env.INGEST_DISPATCH_REPO
  if (token && repo && /^[\w.-]+\/[\w.-]+$/.test(repo)) {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/ingest.yml/dispatches`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
      body: JSON.stringify({ ref: process.env.INGEST_DISPATCH_REF || 'main', inputs: { feed: feedId } }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { status: 'error', message: `A GitHub nem indította el a futást (${res.status}).` }
    await recordAdminAction(admin.userId, 'feed.run_now', 'feed', feedId, { via: 'workflow_dispatch' })
    return { status: 'queued', message: 'A futás elindult a GitHub Actionsben; pár perc múlva frissítsd az oldalt.' }
  }
  // a feed letöltése csak az ingest scriptben történhet: webes függvényben (preview, production) soha
  if (deploymentEnv() !== 'development') {
    return { status: 'error', message: 'A futtatáshoz INGEST_DISPATCH_TOKEN és INGEST_DISPATCH_REPO kell (GitHub Actions).' }
  }
  await recordAdminAction(admin.userId, 'feed.run_now', 'feed', feedId, { via: 'in_process' })
  after(async () => {
    // helyben a fixture-feedek is futtathatók (csak development környezetben jut ide a kód)
    await runFeed(feedId, { sql: getSqlAdmin(), rawStore: defaultRawStore(), fileRoots: [join(process.cwd(), 'tests/fixtures/feeds')] })
    revalidatePath(`/admin/feedek/${feedId}`)
  })
  return { status: 'started', message: 'A futás elindult (helyi mód). Pár másodperc múlva frissítsd az oldalt.' }
}
