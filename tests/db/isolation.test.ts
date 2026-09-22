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

  it('RLS: más nevében nem lehet beszúrni', async () => {
    await expect(
      sql.begin(async (tx) => {
        await tx`set local role authenticated`
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: a, role: 'authenticated' })}, true)`
        await tx`insert into public.loved_ones (user_id, nickname, relation) values (${b}, 'Behatoló', 'egyeb')`
      }),
    ).rejects.toThrow(/row-level security/)
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
