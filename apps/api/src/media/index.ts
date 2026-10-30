import { env } from '../env.ts'
import { MemoryImageStore, type ImageStore } from './imageStore.ts'
import { S3ImageStore } from './s3ImageStore.ts'

export * from './imageStore.ts'

/** Store chosen by IMAGE_STORE: R2/MinIO ("s3") or memory (tests). */
export const imageStore: ImageStore =
  env.IMAGE_STORE === 'memory'
    ? new MemoryImageStore()
    : new S3ImageStore({
        endpoint: env.R2_ENDPOINT!,
        bucket: env.R2_BUCKET!,
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      })
