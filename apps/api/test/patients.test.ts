import { randomUUID } from 'node:crypto'
import { MAX_PATIENT_NOTES } from '@kinotest/shared'
import { describe, expect, it } from 'vitest'
import { api, login } from './helpers.ts'

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })
const asTherapist = async (n = 1) => bearer((await login(`t${n}@test.com`)).accessToken)

const create = (auth: Record<string, string>, name: string) =>
  api().post('/api/me/patients').set(auth).send({ name })

describe('patients: access control', () => {
  it('401 without token on every route', async () => {
    await api().get('/api/me/patients').expect(401)
    await api().post('/api/me/patients').send({ name: 'Ana' }).expect(401)
    await api().get('/api/me/patients/x').expect(401)
    await api().patch('/api/me/patients/x').send({ notes: 'x' }).expect(401)
    await api().delete('/api/me/patients/x').expect(401)
  })

  it("another therapist's patient behaves as if it did not exist", async () => {
    const t1 = await asTherapist(1)
    const t2 = await asTherapist(2)
    const { body: p } = await create(t1, 'Ana').expect(201)

    expect((await api().get('/api/me/patients').set(t2).expect(200)).body).toEqual([])
    await api().get(`/api/me/patients/${p.id}`).set(t2).expect(404)
    await api().patch(`/api/me/patients/${p.id}`).set(t2).send({ notes: 'x' }).expect(404)
    await api().delete(`/api/me/patients/${p.id}`).set(t2).expect(404)

    const own = await api().get(`/api/me/patients/${p.id}`).set(t1).expect(200)
    expect(own.body).toMatchObject({ name: 'Ana', notes: '' })
  })
})

describe('patients: CRUD', () => {
  it('creates with only a name (trimmed) and empty notes', async () => {
    const auth = await asTherapist()
    const res = await create(auth, '  Ana Pérez  ').expect(201)
    expect(res.body).toMatchObject({ name: 'Ana Pérez', notes: '' })
    expect(res.body.id).toEqual(expect.any(String))
  })

  it('rejects an empty or missing name', async () => {
    const auth = await asTherapist()
    await create(auth, '   ').expect(400)
    await api().post('/api/me/patients').set(auth).send({}).expect(400)
  })

  it('lists by name, without notes', async () => {
    const auth = await asTherapist()
    await create(auth, 'Xoán').expect(201)
    const { body: ana } = await create(auth, 'Ana').expect(201)
    await api().patch(`/api/me/patients/${ana.id}`).set(auth).send({ notes: 'privado' }).expect(200)

    const list = await api().get('/api/me/patients').set(auth).expect(200)
    expect(list.body.map((p: { name: string }) => p.name)).toEqual(['Ana', 'Xoán'])
    expect(list.body[0]).not.toHaveProperty('notes')
  })

  it('updates notes and name; leaving a field out keeps it', async () => {
    const auth = await asTherapist()
    const { body: p } = await create(auth, 'Ana').expect(201)
    const url = `/api/me/patients/${p.id}`

    const notes = '## Antecedentes\n\n* **Dor** lumbar'
    expect((await api().patch(url).set(auth).send({ notes }).expect(200)).body).toMatchObject({ name: 'Ana', notes })
    expect((await api().patch(url).set(auth).send({ name: 'Ana P.' }).expect(200)).body).toMatchObject({
      name: 'Ana P.',
      notes,
    })
    expect((await api().patch(url).set(auth).send({ notes: '' }).expect(200)).body.notes).toBe('')
    await api().patch(url).set(auth).send({}).expect(400)
    await api().patch(url).set(auth).send({ name: '' }).expect(400)
    await api().patch(`/api/me/patients/${randomUUID()}`).set(auth).send({ notes: 'x' }).expect(404)
  })

  it('takes long notes (beyond the global 100 KB body limit) up to the maximum', async () => {
    const auth = await asTherapist()
    const { body: p } = await create(auth, 'Ana').expect(201)
    const url = `/api/me/patients/${p.id}`
    const long = 'ñ'.repeat(MAX_PATIENT_NOTES) // 2 bytes each in UTF-8: ~100 KB
    expect((await api().patch(url).set(auth).send({ notes: long }).expect(200)).body.notes).toHaveLength(MAX_PATIENT_NOTES)
    await api().patch(url).set(auth).send({ notes: `${long}x` }).expect(400)
  })

  it('deletes', async () => {
    const auth = await asTherapist()
    const { body: p } = await create(auth, 'Ana').expect(201)
    await api().delete(`/api/me/patients/${p.id}`).set(auth).expect(204)
    await api().get(`/api/me/patients/${p.id}`).set(auth).expect(404)
    await api().delete(`/api/me/patients/${p.id}`).set(auth).expect(404)
  })
})
