import { IMAGE_CONTENT_TYPE } from '@kinotest/shared'
import { presignImage } from './content.ts'

const MAX_SIDE = 1600 // px, longest side
const QUALITY = 0.85

/** Resizes (never enlarges) and encodes the image as WebP in the browser. */
export async function toWebp(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('O ficheiro non é unha imaxe válida.')
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('O navegador non pode procesar a imaxe.')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, IMAGE_CONTENT_TYPE, QUALITY))
    if (!blob || blob.type !== IMAGE_CONTENT_TYPE) throw new Error('O navegador non pode xerar imaxes WebP.')
    return blob
  } finally {
    bitmap.close()
  }
}

/** SHA-256 in hex (needs a secure context: HTTPS or localhost). */
export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Converts, hashes and uploads straight to the bucket (skipped if it is already there). Returns the key. */
export async function uploadImage(contentId: string, file: Blob): Promise<string> {
  const webp = await toWebp(file)
  const presign = await presignImage(contentId, await sha256Hex(webp))
  if (!presign.exists) {
    if (!presign.uploadUrl) throw new Error('A API non devolveu a URL de subida.')
    const res = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': IMAGE_CONTENT_TYPE }, body: webp })
    if (!res.ok) throw new Error(`Non se puido subir a imaxe (${res.status}).`)
  }
  return presign.key
}
