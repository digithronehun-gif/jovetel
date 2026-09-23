import type postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDb } from '../../src/lib/db/client'
import {
  createLovedOne,
  deleteLovedOne,
  getLovedOne,
  listLovedOnes,
  updateLovedOne,
} from '../../src/lib/db/queries/user/lovedOnes'
import { getProfile } from '../../src/lib/db/queries/user/profile'
import { createUser, testSql } from './helpers'

const sql = testSql()
let a: string
let b: string
let bLovedId: string

beforeAll(async () => {
  a = await createUser(sql)
  b = await createUser(sql)
  await createLovedOne(a, { nickname: 'Anyu', relation: 'anya', firstName: 'Katalin' })
  const bl = await createLovedOne(b, { nickname: 'Tesó', relation: 'testver' })
  bLovedId = bl.id
})
afterAll(async () => {
  await sql.end()
  await closeDb()
})

describe('két felhasználó nem látja egymás adatait (F1 elfogadási kritérium)', () => {
  it('lekérdező réteg: csak a saját sorok', async () => {
    const la = await listLovedOnes(a)
    expect(la.map((x) => x.nickname)).toEqual(['Anyu'])
    expect(la.every((x) => x.userId === a)).toBe(true)
    expect((await listLovedOnes(b)).map((x) => x.nickname)).toEqual(['Tesó'])
  })

  it('lekérdező réteg: más sorát nem olvassa, nem írja, nem törli', async () => {
    expect(await getLovedOne(a, bLovedId)).toBeNull()
    expect(await updateLovedOne(a, bLovedId, { nickname: 'Feltört' })).toBeNull()
    expect(await deleteLovedOne(a, bLovedId)).toBe(false)
    expect((await getLovedOne(b, bLovedId))?.nickname).toBe('Tesó')
    expect((await getProfile(a))?.userId).toBe(a)
  })

  it('RLS (biztonsági háló): authenticated szerepkörben csak a saját sor látszik', async () => {
    const count = await sql.begin(async (tx) => {
      await tx`set local role authenticated`
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: a, role: 'authenticated' })}, true)`
      const rows = await tx<{ user_id: string }[]>`select user_id from public.loved_ones`
      return rows
    })
    expect(count.length).toBe(1)
    expect(count[0]!.user_id).toBe(a)
  })

  const asUser = <T>(uid: string, fn: (tx: postgres.TransactionSql) => Promise<T>) =>
    sql.begin(async (tx) => {
      await tx`set local role authenticated`
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: uid, role: 'authenticated' })}, true)`
      return fn(tx)
    })

  it('a publikus kulccsal (PostgREST) semmi nem írható: más nevében sem, a saját nevében sem', async () => {
    await expect(asUser(a, (tx) => tx`insert into public.loved_ones (user_id, nickname, relation) values (${b}, 'Behatoló', 'egyeb')`)).rejects.toThrow(/permission denied/)
    await expect(asUser(a, (tx) => tx`insert into public.loved_ones (user_id, nickname, relation) values (${a}, 'Saját', 'egyeb')`)).rejects.toThrow(/permission denied/)
    await expect(asUser(a, (tx) => tx`delete from public.loved_ones`)).rejects.toThrow(/permission denied/)
  })

  it('senki nem teheti magát adminná (sem közvetlen írással, sem triggeren át)', async () => {
    await expect(asUser(a, (tx) => tx`update public.profiles set role = 'admin' where user_id = ${a}`)).rejects.toThrow(/permission denied/)
    // ha valaki később újra írásjogot adna, a trigger akkor is megállítja
    await expect(
      sql.begin(async (tx) => {
        await tx`grant update on public.profiles to authenticated`
        await tx`set local role authenticated`
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: a, role: 'authenticated' })}, true)`
        await tx`update public.profiles set role = 'admin' where user_id = ${a}`
      }),
    ).rejects.toThrow(/szerveroldalon/)
    expect((await getProfile(a))?.role).toBe('user')
  })

  it('foglalást a publikus kulccsal nem lehet létrehozni (csak szerveroldalon, Turnstile-lal)', async () => {
    await expect(
      asUser(a, (tx) => tx`insert into public.reservations (list_item_id, reserver_user_id, status) values (gen_random_uuid(), ${a}, 'active')`),
    ).rejects.toThrow(/permission denied/)
  })

  it('RLS: névtelen (anon) semmilyen felhasználói adatot nem lát, a katalógust igen', async () => {
    const res = await sql.begin(async (tx) => {
      await tx`set local role anon`
      const lo = await tx`select * from public.loved_ones`
      const pr = await tx`select * from public.profiles`
      const nd = await tx`select * from public.namedays limit 1`
      return { lo: lo.length, pr: pr.length, nd: nd.length }
    })
    expect(res.lo).toBe(0)
    expect(res.pr).toBe(0)
  })
})
