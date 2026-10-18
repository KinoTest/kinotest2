import { app } from './app.ts'
import { prisma } from './db.ts'
import { env } from './env.ts'

const server = app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`)
})

const shutdown = () => {
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
