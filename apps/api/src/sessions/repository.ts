import type { SessionRemedy } from '@kinotest/shared'
import { prisma } from '../db.ts'

const detail = { id: true, date: true, notes: true, remedies: true, createdAt: true, updatedAt: true } as const

// A session is reached through its patient, and the patient through its therapist: every query checks both.
const owned = (therapistId: string, patientId: string, id: string) => ({ id, patientId, patient: { therapistId } })

type Data = { date?: Date; notes?: string; remedies?: SessionRemedy[] }

export const sessionRepository = {
  patientExists: async (therapistId: string, patientId: string) =>
    (await prisma.patient.count({ where: { id: patientId, therapistId } })) > 0,

  /** Newest first. */
  list: (patientId: string) =>
    prisma.therapySession.findMany({
      where: { patientId },
      select: { id: true, date: true, notes: true, createdAt: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),

  get: (therapistId: string, patientId: string, id: string) =>
    prisma.therapySession.findFirst({ where: owned(therapistId, patientId, id), select: detail }),

  create: (patientId: string, data: Required<Data>) =>
    prisma.therapySession.create({ data: { patientId, ...data }, select: detail }),

  /** The caller has already checked that the session is the therapist's (get). */
  update: (id: string, data: Data) => prisma.therapySession.update({ where: { id }, data, select: detail }),

  async remove(therapistId: string, patientId: string, id: string) {
    const { count } = await prisma.therapySession.deleteMany({ where: owned(therapistId, patientId, id) })
    return count > 0
  },
}
