import { z } from 'zod'
import { emailSchema } from './auth.ts'

const idSchema = z.string().min(1).max(64)
const idListSchema = z.array(idSchema).min(1).max(200)

/** Upper bound of (therapists x therapies) created or deleted by one request. */
export const MAX_ASSIGNMENT_COMBINATIONS = 1000

// Price charged to the therapist: informational, in EUR. Non-negative, at most two decimals.
const amountSchema = z
  .number()
  .min(0)
  .max(99_999_999.99)
  .refine((v) => Math.round(v * 100) / 100 === v, { message: 'Máximo dous decimais' })
const noteSchema = z.string().trim().max(500)
const expiresAtSchema = z.string().datetime()

const withinLimit = (v: { userIds: string[]; emails?: string[]; contentItemIds: string[] }) =>
  (v.userIds.length + (v.emails?.length ?? 0)) * v.contentItemIds.length <= MAX_ASSIGNMENT_COMBINATIONS
const limitMessage = { message: `Máximo ${MAX_ASSIGNMENT_COMBINATIONS} asignacións por petición` }

/**
 * Assigns every therapy in `contentItemIds` (rows of ContentItem) to every user in `userIds`
 * and to every address in `emails`. Emails without an account get an unconfirmed account and an invitation.
 */
export const createAssignmentsSchema = z
  .object({
    userIds: z.array(idSchema).max(200).default([]),
    emails: z.array(emailSchema).max(200).default([]),
    contentItemIds: idListSchema,
    expiresAt: expiresAtSchema.nullish(),
    note: noteSchema.nullish(),
    amount: amountSchema.nullish(),
  })
  .refine((v) => v.userIds.length + v.emails.length > 0, { message: 'Indica polo menos un terapeuta ou email' })
  .refine(withinLimit, limitMessage)
export type CreateAssignments = z.infer<typeof createAssignmentsSchema>
/** What clients send: `userIds` and `emails` are optional (they default to `[]`). */
export type CreateAssignmentsInput = z.input<typeof createAssignmentsSchema>

/** Resends the invitation to unconfirmed accounts (confirmed ones are skipped). */
export const resendInvitationsSchema = z.object({ userIds: idListSchema })
export type ResendInvitations = z.infer<typeof resendInvitationsSchema>

export const deleteAssignmentsSchema = z
  .object({ userIds: idListSchema, contentItemIds: idListSchema })
  .refine(withinLimit, limitMessage)
export type DeleteAssignments = z.infer<typeof deleteAssignmentsSchema>

/** `null` clears a field; leaving it out keeps it. */
export const assignmentPatchSchema = z
  .object({
    expiresAt: expiresAtSchema.nullable().optional(),
    note: noteSchema.nullable().optional(),
    amount: amountSchema.nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Nada que cambiar' })
export type AssignmentPatch = z.infer<typeof assignmentPatchSchema>

export const assignmentListQuerySchema = z
  .object({ userId: idSchema.optional(), contentItemId: idSchema.optional() })
  .refine((q) => q.userId !== undefined || q.contentItemId !== undefined, {
    message: 'Indica userId ou contentItemId',
  })

export const userListQuerySchema = z.object({ search: z.string().trim().max(100).optional() })
