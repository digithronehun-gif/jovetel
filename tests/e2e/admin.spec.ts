import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { createTestUser, signIn } from './helpers/auth'

test.describe('admin: /admin/feedek (requireAdmin: szerepkör + MFA)', () => {
  test('bejelentkezés nélkül 404 (az admin felület létezését sem áruljuk el)', async ({ page }) => {
    for (const path of ['/admin', '/admin/feedek', '/admin/mfa']) {
      const res = await page.goto(path)
      expect(res?.status(), path).toBe(404)
    }
  })

  test('sima felhasználónak 404', async ({ page, context, baseURL }) => {
    const u = await createTestUser()
    await signIn(context, baseURL!, u.session)
    const res = await page.goto('/admin/feedek')
    expect(res?.status()).toBe(404)
  })

  test('admin MFA nélkül: a kétlépcsős azonosítás oldalára kerül', async ({ page, context, baseURL }) => {
    const u = await createTestUser({ admin: true })
    await signIn(context, baseURL!, u.session)
    await page.goto('/admin/feedek')
    await expect(page).toHaveURL(/\/admin\/mfa$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Kétlépcsős azonosítás')
  })

  test('lejárt access token: a proxy frissíti a sessiont, és új sütit ad', async ({ page, context, baseURL }) => {
    const u = await createTestUser({ admin: true, mfa: true })
    await signIn(context, baseURL!, u.session, { expired: true })
    const res = await page.goto('/admin/feedek')
    expect(res?.status()).toBe(200)
    const setCookie = (await res!.allHeaders())['set-cookie'] ?? ''
    expect(setCookie).toMatch(/sb-[\w-]+-auth-token/)
    await expect(page.locator('[data-admin-feeds]')).toBeVisible()
  })

  test('admin aal2-vel: feedlista, részletek hibamintával, [Futtatás most] naplózva', async ({ page, context, baseURL }) => {
    const u = await createTestUser({ admin: true, mfa: true })
    await signIn(context, baseURL!, u.session)
    await page.goto('/admin/feedek')
    const table = page.locator('[data-admin-feeds]')
    await expect(table).toBeVisible()
    const row = table.locator('tbody tr', { hasText: 'awin · awin' })
    await expect(row.getByRole('link', { name: '[DEMO] Napfény Drogéria' })).toBeVisible()
    await row.getByRole('link', { name: '[DEMO] Napfény Drogéria' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('[DEMO] Napfény Drogéria')
    const sample = page.locator('[data-error-sample]')
    await expect(sample).toContainText('Hibás kódolás')
    await expect(sample).toContainText('Idegen domain')
    // a hibaminta szöveg, nem markup
    expect(await sample.locator('script, img, a').count()).toBe(0)

    // 390 px-en az admin oldal sem lóg ki vízszintesen (a táblázat a saját keretében görget)
    for (const path of ['/admin/feedek', page.url()]) {
      await page.goto(path)
      const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
      expect(scroll, path).toBeLessThanOrEqual(client)
    }

    const runsBefore = await page.locator('[data-admin-runs] tbody tr').count()
    await page.locator('[data-run-now]').click()
    await expect(page.getByRole('status')).toContainText('elindult')
    await expect
      .poll(async () => {
        await page.reload()
        return page.locator('[data-admin-runs] tbody tr').count()
      }, { timeout: 20_000 })
      .toBeGreaterThan(runsBefore)

    const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false })
    const [log] = await sql<{ n: number }[]>`select count(*)::int as n from public.audit_log where actor_user_id = ${u.id} and action = 'feed.run_now'`
    await sql.end()
    expect(log!.n).toBe(1)
  })
})
