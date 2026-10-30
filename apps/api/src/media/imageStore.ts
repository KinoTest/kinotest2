// Port for image storage (Cloudflare R2 / S3 / memory). Keys are `<contentId>/<sha256>.webp`.
export interface ImageStore {
  /** True if an object with this key already exists. */
  exists(key: string): Promise<boolean>
  /** Presigned PUT URL so the browser uploads straight to the bucket. */
  createUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>
}

export const UPLOAD_URL_TTL_SECONDS = 300

const HASH_RE = /^[a-f0-9]{64}$/

/** Immutable key: the hash makes it content-addressed, so there are no duplicates. */
export function buildImageKey(contentId: string, sha256: string): string {
  if (!HASH_RE.test(sha256)) throw new Error('Invalid image hash')
  return `${contentId}/${sha256}.webp`
}

/** In-memory store for tests. `put` simulates an upload. */
export class MemoryImageStore implements ImageStore {
  readonly keys = new Set<string>()

  put(key: string): void {
    this.keys.add(key)
  }

  async exists(key: string): Promise<boolean> {
    return this.keys.has(key)
  }

  async createUploadUrl(key: string, contentType: string): Promise<string> {
    return `memory://upload/${key}?contentType=${encodeURIComponent(contentType)}`
  }
}
