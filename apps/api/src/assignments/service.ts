import type { AssignmentPatch, CreateAssignments, DeleteAssignments } from '@kinotest/shared'
import { authService, roleForEmail } from '../auth/service.ts'
import { assignmentRepository as repo } from './repository.ts'

type Row = NonNullable<Awaited<ReturnType<typeof repo.update>>>

const toDate = (value?: string | null) => (value ? new Date(value) : null)
const unique = (ids: string[]) => [...new Set(ids)]
// Prisma returns Decimal; the API speaks plain numbers (EUR).
const toDto = (row: Row) => ({ ...row, amount: row.amount === null ? null : row.amount.toNumber() })

async function invite(emails: string[]) {
  const invited: string[] = []
  const failed: string[] = []
  for (const email of emails) {
    try {
      await authService.sendInvitation(email)
      invited.push(email)
    } catch (err) {
      console.error('[assignments] invitation failed:', email, err)
      failed.push(email)
    }
  }
  return { invited, failed }
}

export const assignmentService = {
  async list(where: { userId?: string; contentItemId?: string }) {
    return (await repo.list(where)).map(toDto)
  },

  /** Assigns, creating unconfirmed accounts for unknown emails and inviting them (a failed email never undoes the assignment). */
  async create(input: CreateAssignments, assignedById: string) {
    const result = await repo.createMany(
      unique(input.userIds),
      unique(input.emails),
      unique(input.contentItemIds),
      { expiresAt: toDate(input.expiresAt), note: input.note || null, amount: input.amount ?? null },
      assignedById,
      roleForEmail,
    )
    if (result.status === 'not_found') return result
    const { newEmails, ...counts } = result
    const { invited, failed } = await invite(newEmails)
    return { ...counts, invited, inviteFailed: failed }
  },

  /** Resends the invitation to the unconfirmed accounts among `userIds`. */
  async resendInvitations(userIds: string[]) {
    return invite(await repo.unconfirmedEmails(unique(userIds)))
  },

  remove: (input: DeleteAssignments) => repo.deleteMany(unique(input.userIds), unique(input.contentItemIds)),

  async update(id: string, patch: AssignmentPatch) {
    const data: { expiresAt?: Date | null; note?: string | null; amount?: number | null } = {}
    if (patch.expiresAt !== undefined) data.expiresAt = toDate(patch.expiresAt)
    if (patch.note !== undefined) data.note = patch.note || null
    if (patch.amount !== undefined) data.amount = patch.amount
    const row = await repo.update(id, data)
    return row && toDto(row)
  },

  /** Therapies the user can read now (assigned and not expired). */
  async listMine(userId: string) {
    const rows = await repo.listActive(userId, new Date())
    return rows.map((r) => ({ ...r.contentItem, expiresAt: r.expiresAt }))
  },

  async getMine(userId: string, contentItemId: string) {
    const row = await repo.getActive(userId, contentItemId, new Date())
    return row?.contentItem ?? null
  },
}
