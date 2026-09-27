'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { SLOT_IDS } from '@/lib/assets/manifest'
import { requireAdmin } from '@/lib/auth/guards'
import {
  addGuideItem,
  createGuide,
  deleteGuide,
  GuideSlugTakenError,
  guideExistsForAdmin,
  moveGuideItem,
  removeGuideItem,
  setGuidePublished,
  updateGuide,
  updateGuideItemNote,
} from '@/lib/db/queries/admin/guides'
import { slugify } from '@/lib/format/slug'

/**
 * Az útmutató-szerkesztő Server Actionjei (4. vasszabály: jogosultság itt ÉS az adatrétegben). Minden bemenet Zoddal
 * validált; a szerkesztői szöveg sima szöveg (vezérlőkarakter nélkül), markup nem lesz belőle.
 */
const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}]/gu, '').trim())
    .pipe(z.string().max(max))
const id = z.string().uuid()
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80)

function refresh(guideId: string, publicSlug?: string | null) {
  revalidatePath('/admin/utmutatok')
  revalidatePath(`/admin/utmutatok/${guideId}`)
  revalidatePath('/utmutatok')
  if (publicSlug) revalidatePath(`/utmutatok/${publicSlug}`)
}

export async function createGuideAction(form: FormData): Promise<void> {
  const admin = await requireAdmin()
  const title = text(120).pipe(z.string().min(1)).safeParse(form.get('title') ?? '')
  if (!title.success) redirect('/admin/utmutatok?hiba=cim')
  const s = slugify(title.data)
  if (!slug.safeParse(s).success) redirect('/admin/utmutatok?hiba=cim')
  let newId: string
  try {
    newId = await createGuide(admin.userId, { title: title.data, slug: s })
  } catch (e) {
    if (e instanceof GuideSlugTakenError) redirect('/admin/utmutatok?hiba=foglalt')
    throw e
  }
  refresh(newId)
  redirect(`/admin/utmutatok/${newId}`)
}

const UpdateInput = z.object({
  guideId: id,
  title: text(120).pipe(z.string().min(1)),
  slug,
  intro: text(8000),
  coverSlot: z.enum(SLOT_IDS as [string, ...string[]]),
})

export async function updateGuideAction(form: FormData): Promise<void> {
  const admin = await requireAdmin()
  const parsed = UpdateInput.safeParse(Object.fromEntries(['guideId', 'title', 'slug', 'intro', 'coverSlot'].map((k) => [k, form.get(k) ?? ''])))
  const guideId = String(form.get('guideId') ?? '')
  if (!parsed.success) redirect(`/admin/utmutatok/${id.safeParse(guideId).success ? guideId : ''}?hiba=ervenytelen`)
  const d = parsed.data
  try {
    await updateGuide(admin.userId, d.guideId, { title: d.title, slug: d.slug, intro: d.intro || null, coverSlot: d.coverSlot })
  } catch (e) {
    if (e instanceof GuideSlugTakenError) redirect(`/admin/utmutatok/${d.guideId}?hiba=foglalt`)
    throw e
  }
  refresh(d.guideId, d.slug)
  redirect(`/admin/utmutatok/${d.guideId}?mentve=1`)
}

const PublishInput = z.object({ guideId: id, publish: z.enum(['1', '0']) })

export async function publishGuideAction(form: FormData): Promise<void> {
  const admin = await requireAdmin()
  const parsed = PublishInput.safeParse({ guideId: form.get('guideId'), publish: form.get('publish') })
  if (!parsed.success) return
  await setGuidePublished(admin.userId, parsed.data.guideId, parsed.data.publish === '1')
  refresh(parsed.data.guideId, String(form.get('slug') ?? '') || null)
}

export async function deleteGuideAction(form: FormData): Promise<void> {
  const admin = await requireAdmin()
  const parsed = z.object({ guideId: id, confirm: z.literal('torles') }).safeParse({ guideId: form.get('guideId'), confirm: form.get('confirm') })
  if (!parsed.success) return
  await deleteGuide(admin.userId, parsed.data.guideId)
  refresh(parsed.data.guideId)
  redirect('/admin/utmutatok')
}

export async function addGuideItemAction(form: FormData): Promise<void> {
  const admin = await requireAdmin()
  const parsed = z.object({ guideId: id, productId: id }).safeParse({ guideId: form.get('guideId'), productId: form.get('productId') })
  if (!parsed.success) return
  if (!(await guideExistsForAdmin(admin.userId, parsed.data.guideId))) return
  await addGuideItem(admin.userId, parsed.data.guideId, parsed.data.productId)
  refresh(parsed.data.guideId, String(form.get('slug') ?? '') || null)
}

export async function updateGuideItemNoteAction(form: FormData): Promise<void> {
  const admin = await requireAdmin()
  const parsed = z
    .object({ guideId: id, itemId: id, note: text(500) })
    .safeParse({ guideId: form.get('guideId'), itemId: form.get('itemId'), note: form.get('note') ?? '' })
  if (!parsed.success) return
  await updateGuideItemNote(admin.userId, parsed.data.guideId, parsed.data.itemId, parsed.data.note || null)
  refresh(parsed.data.guideId, String(form.get('slug') ?? '') || null)
}

export async function moveGuideItemAction(form: FormData): Promise<void> {
  const admin = await requireAdmin()
  const parsed = z
    .object({ guideId: id, itemId: id, direction: z.enum(['up', 'down']) })
    .safeParse({ guideId: form.get('guideId'), itemId: form.get('itemId'), direction: form.get('direction') })
  if (!parsed.success) return
  await moveGuideItem(admin.userId, parsed.data.guideId, parsed.data.itemId, parsed.data.direction)
  refresh(parsed.data.guideId, String(form.get('slug') ?? '') || null)
}

export async function removeGuideItemAction(form: FormData): Promise<void> {
  const admin = await requireAdmin()
  const parsed = z.object({ guideId: id, itemId: id }).safeParse({ guideId: form.get('guideId'), itemId: form.get('itemId') })
  if (!parsed.success) return
  await removeGuideItem(admin.userId, parsed.data.guideId, parsed.data.itemId)
  refresh(parsed.data.guideId, String(form.get('slug') ?? '') || null)
}
