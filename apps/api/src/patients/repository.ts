import { prisma } from '../db.ts'

const summary = { id: true, name: true, createdAt: true, updatedAt: true } as const
const detail = { ...summary, notes: true } as const

// Every query filters by therapistId: a patient of another therapist behaves as if it did not exist.
export const patientRepository = {
  list: (therapistId: string) =>
    prisma.patient.findMany({ where: { therapistId }, select: summary, orderBy: { name: 'asc' } }),

  get: (therapistId: string, id: string) => prisma.patient.findFirst({ where: { id, therapistId }, select: detail }),

  create: (therapistId: string, name: string) =>
    prisma.patient.create({ data: { therapistId, name }, select: detail }),

  /** Returns null if the patient does not exist or is not this therapist's. */
  async update(therapistId: string, id: string, data: { name?: string; notes?: string }) {
    const { count } = await prisma.patient.updateMany({ where: { id, therapistId }, data })
    return count ? prisma.patient.findFirst({ where: { id, therapistId }, select: detail }) : null
  },

  async remove(therapistId: string, id: string) {
    const { count } = await prisma.patient.deleteMany({ where: { id, therapistId } })
    return count > 0
  },
}
