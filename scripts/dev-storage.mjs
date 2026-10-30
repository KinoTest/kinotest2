// Prepares the local Garage bucket (docker-compose.yml): public read through the web endpoint
// and CORS so the panel can PUT with presigned URLs. Safe to run more than once.
//   node scripts/dev-storage.mjs
import { execFileSync } from 'node:child_process'
import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'

const bucket = process.env.R2_BUCKET ?? 'kinotest-dev'
const endpoint = process.env.R2_ENDPOINT ?? 'http://localhost:3900'
const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174').split(',').map((o) => o.trim())

const runtime = ['podman', 'docker'].find((r) => {
  try {
    execFileSync(r, ['--version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})
if (!runtime) throw new Error('Neither podman nor docker found')

async function retry(label, fn, tries = 30) {
  for (let i = 1; ; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i >= tries) throw err
      console.log(`${label}: waiting for Garage (${i}/${tries})...`)
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
}

await retry('website', () =>
  execFileSync(runtime, ['compose', 'exec', '-T', 'garage', '/garage', 'bucket', 'website', '--allow', bucket], { stdio: 'inherit' }),
)

const client = new S3Client({
  region: 'auto',
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? 'GK0123456789abcdef0123456789abcdef',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
})
await retry('cors', () =>
  client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [{ AllowedOrigins: origins, AllowedMethods: ['PUT', 'GET', 'HEAD'], AllowedHeaders: ['*'], MaxAgeSeconds: 3600 }],
      },
    }),
  ),
)

console.log(`Ready. Public URL (VITE_MEDIA_URL): http://${bucket}.web.garage.localhost:3902`)
