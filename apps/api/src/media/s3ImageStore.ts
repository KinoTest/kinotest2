import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { UPLOAD_URL_TTL_SECONDS, type ImageStore } from './imageStore.ts'

export interface S3ImageStoreOptions {
  endpoint: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

/** Works with Cloudflare R2 and MinIO (path-style, region "auto"). */
export class S3ImageStore implements ImageStore {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(o: S3ImageStoreOptions) {
    this.bucket = o.bucket
    this.client = new S3Client({
      region: 'auto',
      endpoint: o.endpoint,
      forcePathStyle: true,
      // The SDK adds a CRC32 of the (empty) body to presigned URLs by default; the browser then sends
      // another body and Garage/R2 reject it with InvalidDigest. Only checksum when the API requires it.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: { accessKeyId: o.accessKeyId, secretAccessKey: o.secretAccessKey },
    })
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch (err) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } }
      if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false
      throw err
    }
  }

  createUploadUrl(key: string, contentType: string, expiresInSeconds = UPLOAD_URL_TTL_SECONDS): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: expiresInSeconds },
    )
  }
}
