import { contentDocumentSchema, type ContentDocument } from '@kinotest/shared'

/** Reads a therapy from a JSON file and validates it, with a message ready to show if it is not valid. */
export async function readContentFile(file: File): Promise<{ doc: ContentDocument } | { error: string }> {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    return { error: 'O ficheiro non é un JSON válido.' }
  }
  const parsed = contentDocumentSchema.safeParse(json)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: `Formato non válido (${issue?.path.map(String).join('.') || 'raíz'}): ${issue?.message}` }
  }
  return { doc: parsed.data }
}
