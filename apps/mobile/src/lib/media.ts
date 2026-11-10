// Public base URL of the image bucket (VITE_MEDIA_URL, a build variable). Documents store only object keys.
const base = (import.meta.env.VITE_MEDIA_URL as string | undefined)?.replace(/\/$/, '') || undefined

/** Full URL of an image key, or null when VITE_MEDIA_URL is not set. */
export const mediaUrl = (key: string): string | null => (base ? `${base}/${key}` : null)
