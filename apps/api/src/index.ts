import { app } from './app.ts'
import { startAuthCleanup } from './auth/cleanup.ts'
import { prisma } from './db.ts'
import { env } from './env.ts'

const server = app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`)
  startAuthCleanup()
})

const shutdown = () => {
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)