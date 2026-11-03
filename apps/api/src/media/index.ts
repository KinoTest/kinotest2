import { env } from '../env.ts'
import { MemoryImageStore, type ImageStore } from './imageStore.ts'
import { S3ImageStore } from './s3ImageStore.ts'

export * from './imageStore.ts'

// The memory store hands out `memory://` upload URLs that no browser can use: it only makes sense in tests.
if (env.IMAGE_STORE === 'memory' && process.env.NODE_ENV !== 'test') {
  console.warn('IMAGE_STORE=memory: image uploads will fail in the browser. Use IMAGE_STORE=s3 (Garage locally, R2 in Staging/Production).')
}

/** Store chosen by IMAGE_STORE: R2/Garage ("s3") or memory (tests). */
export const imageStore: ImageStore =
  env.IMAGE_STORE === 'memory'
    ? new MemoryImageStore()
    : new S3ImageStore({
        endpoint: env.R2_ENDPOINT!,
        bucket: env.R2_BUCKET!,
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      })
