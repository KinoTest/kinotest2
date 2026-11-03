import { z } from 'zod'

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

const withinLimit = (v: { userIds: string[]; contentItemIds: string[] }) =>
  v.userIds.length * v.contentItemIds.length <= MAX_ASSIGNMENT_COMBINATIONS
const limitMessage = { message: `Máximo ${MAX_ASSIGNMENT_COMBINATIONS} asignacións por petición` }

/** Assigns every therapy in `contentItemIds` (rows of ContentItem) to every user in `userIds`. */
export const createAssignmentsSchema = z
  .object({
    userIds: idListSchema,
    contentItemIds: idListSchema,
    expiresAt: expiresAtSchema.nullish(),
    note: noteSchema.nullish(),
    amount: amountSchema.nullish(),
  })
  .refine(withinLimit, limitMessage)
export type CreateAssignments = z.infer<typeof createAssignmentsSchema>

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
