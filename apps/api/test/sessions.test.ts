import { notesPreview } from '@kinotest/shared'
import { describe, expect, it } from 'vitest'
import { prisma } from '../src/db.ts'
import { api, login } from './helpers.ts'

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

const remedy = (name: string) => ({ type: 'remedy', name, description: `Descrición de ${name}`, images: ['a/b.webp'] })

// Terapia
//  ├─ 0: Cabeza (catalog)
//  │   ├─ 0: Arnica (remedy)
//  │   └─ 1: Ollos (catalog)
//  │       └─ 0: Eufrasia (remedy)
//  └─ 1: Calendula (remedy)
const doc = (contentId: string) => ({
  id: contentId,
  lang: 'gl-ES',
  formatVersion: 1,
  type: 'catalog',
  name: 'Terapia',
  contents: [
    { type: 'catalog', name: 'Cabeza', contents: [remedy('Arnica'), { type: 'catalog', name: 'Ollos', contents: [remedy('Eufrasia')] }] },
    remedy('Calendula'),
  ],
})

/** A therapist with one patient and one therapy assigned (optionally already expired). */
async function setup(n = 1, expired = false) {
  const owner = await login('owner@test.com')
  const session = await login(`t${n}@test.com`)
  const item = await prisma.contentItem.create({
    data: { contentId: `c${n}`, lang: 'gl-ES', title: `Terapia ${n}`, data: doc(`c${n}`) as never, authorId: owner.user.id },
  })
  await prisma.therapyAssignment.create({
    data: {
      userId: session.user.id,
      contentItemId: item.id,
      assignedById: owner.user.id,
      expiresAt: expired ? new Date(Date.now() - 1000) : null,
    },
  })
  const auth = bearer(session.accessToken)
  const { body: patient } = await api().post('/api/me/patients').set(auth).send({ name: 'Ana' }).expect(201)
  const base = `/api/me/patients/${patient.id}/sessions`
  return { auth, item, base, userId: session.user.id }
}

const ref = (contentItemId: string, path: number[], name: string) => ({ contentItemId, path, name })

describe('sessions: access', () => {
  it('401 without token; 404 on a patient that is not mine', async () => {
    const t1 = await setup(1)
    const t2 = await setup(2)
    await api().get(t1.base).expect(401)

    const { body: s } = await api().post(t1.base).set(t1.auth).send({ date: '2026-11-10' }).expect(201)
    await api().get(t1.base).set(t2.auth).expect(404)
    await api().post(t1.base).set(t2.auth).send({ date: '2026-11-10' }).expect(404)
    await api().get(`${t1.base}/${s.id}`).set(t2.auth).expect(404)
    await api().patch(`${t1.base}/${s.id}`).set(t2.auth).send({ notes: 'x' }).expect(404)
    await api().delete(`${t1.base}/${s.id}`).set(t2.auth).expect(404)
    // Same session id under another patient of mine: not found either.
    const { body: other } = await api().post('/api/me/patients').set(t2.auth).send({ name: 'Bea' }).expect(201)
    await api().get(`/api/me/patients/${other.id}/sessions/${s.id}`).set(t2.auth).expect(404)
  })
})

describe('sessions: create and list', () => {
  it('lists newest first, with a short plain preview of the notes', async () => {
    const { auth, base } = await setup()
    await api().post(base).set(auth).send({ date: '2026-11-01', notes: '## Primeira\n\nDor **lumbar**' }).expect(201)
    await api().post(base).set(auth).send({ date: '2026-11-10' }).expect(201)
    await api().post(base).set(auth).send({ date: '2026-10-20' }).expect(201)

    const { body } = await api().get(base).set(auth).expect(200)
    expect(body.map((s: { date: string }) => s.date)).toEqual(['2026-11-10', '2026-11-01', '2026-10-20'])
    expect(body[1].notesPreview).toBe('Primeira Dor lumbar')
    expect(body[0].notesPreview).toBe('')
    expect(body[0]).not.toHaveProperty('notes')
    expect(body[0]).not.toHaveProperty('remedies')
  })

  it('rejects an invalid date', async () => {
    const { auth, base } = await setup()
    await api().post(base).set(auth).send({}).expect(400)
    await api().post(base).set(auth).send({ date: '2026-02-30' }).expect(400)
    await api().post(base).set(auth).send({ date: '10/11/2026' }).expect(400)
  })

  it('stores a copy of each remedy, with its therapy and categories; duplicates count once', async () => {
    const { auth, base, item } = await setup()
    const res = await api()
      .post(base)
      .set(auth)
      .send({
        date: '2026-11-10',
        remedies: [ref(item.id, [0, 1, 0], 'Eufrasia'), ref(item.id, [1], 'Calendula'), ref(item.id, [1], 'Calendula')],
      })
      .expect(201)
    expect(res.body.remedies).toEqual([
      {
        contentItemId: item.id,
        therapyTitle: 'Terapia 1',
        path: [0, 1, 0],
        trail: ['Cabeza', 'Ollos'],
        remedy: remedy('Eufrasia'),
      },
      { contentItemId: item.id, therapyTitle: 'Terapia 1', path: [1], trail: [], remedy: remedy('Calendula') },
    ])
    const one = await api().get(`${base}/${res.body.id}`).set(auth).expect(200)
    expect(one.body).toMatchObject({ date: '2026-11-10', notes: '', remedies: res.body.remedies })
  })

  it('409 when the remedy is not where the app saw it; 422 when the therapy is not available', async () => {
    const { auth, base, item } = await setup()
    await api().post(base).set(auth).send({ date: '2026-11-10', remedies: [ref(item.id, [1], 'Outro')] }).expect(409)
    await api().post(base).set(auth).send({ date: '2026-11-10', remedies: [ref(item.id, [0], 'Cabeza')] }).expect(409) // a category
    await api().post(base).set(auth).send({ date: '2026-11-10', remedies: [ref(item.id, [9], 'X')] }).expect(409)
    await api().post(base).set(auth).send({ date: '2026-11-10', remedies: [ref('unknown', [1], 'Calendula')] }).expect(422)

    const expired = await setup(2, true)
    await api()
      .post(expired.base)
      .set(expired.auth)
      .send({ date: '2026-11-10', remedies: [ref(expired.item.id, [1], 'Calendula')] })
      .expect(422)
  })
})

describe('sessions: edit and delete', () => {
  it('keeps the stored copies of remedies already chosen, even when the therapy is no longer assigned', async () => {
    const { auth, base, item, userId } = await setup()
    const { body: s } = await api()
      .post(base)
      .set(auth)
      .send({ date: '2026-11-10', remedies: [ref(item.id, [1], 'Calendula')] })
      .expect(201)
    const url = `${base}/${s.id}`

    await prisma.therapyAssignment.deleteMany({ where: { userId } })

    // Notes only: the remedies stay.
    const notes = await api().patch(url).set(auth).send({ notes: 'Mellora' }).expect(200)
    expect(notes.body).toMatchObject({ notes: 'Mellora', date: '2026-11-10', remedies: s.remedies })
    // Resending the same selection works without the therapy...
    const same = await api().patch(url).set(auth).send({ remedies: [ref(item.id, [1], 'Calendula')] }).expect(200)
    expect(same.body.remedies).toEqual(s.remedies)
    // ...but adding a new remedy from it does not.
    await api()
      .patch(url)
      .set(auth)
      .send({ remedies: [ref(item.id, [1], 'Calendula'), ref(item.id, [0, 0], 'Arnica')] })
      .expect(422)
    // Removing all of them does.
    expect((await api().patch(url).set(auth).send({ remedies: [] }).expect(200)).body.remedies).toEqual([])
    await api().patch(url).set(auth).send({}).expect(400)
  })

  it('deletes a session, and deleting the patient deletes its sessions', async () => {
    const { auth, base } = await setup()
    const { body: a } = await api().post(base).set(auth).send({ date: '2026-11-10' }).expect(201)
    const { body: b } = await api().post(base).set(auth).send({ date: '2026-11-11' }).expect(201)
    await api().delete(`${base}/${a.id}`).set(auth).expect(204)
    await api().get(`${base}/${a.id}`).set(auth).expect(404)

    const patientUrl = base.replace(/\/sessions$/, '')
    await api().delete(patientUrl).set(auth).expect(204)
    expect(await prisma.therapySession.count({ where: { id: b.id } })).toBe(0)
  })
})

describe('notesPreview', () => {
  it('drops Markdown markers, joins lines and cuts long text', () => {
    expect(notesPreview('# Título\n\n* uno\n* [dous](https://x.y)\n\n> cita _aquí_')).toBe('Título uno dous cita aquí')
    expect(notesPreview('a'.repeat(200), 10)).toBe(`${'a'.repeat(10)}…`)
    expect(notesPreview('   ')).toBe('')
  })
})
