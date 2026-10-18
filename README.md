# Kinotest

TypeScript monorepo (npm workspaces).

| Path | What |
|---|---|
| `apps/mobile` | Ionic + React app (Android/iOS later via Capacitor) |
| `apps/admin` | Ionic + React private control panel (web) |
| `apps/site` | Public information site (Astro) |
| `apps/api` | Express + Prisma + PostgreSQL |
| `packages/shared` | Zod schemas, roles and permissions shared by all apps |

## Local development

Requires Node 22.18+ and Docker or Podman.

```bash
cp .env.example .env
npm install
npm run db:up                           # PostgreSQL in a container (Docker or Podman)
npm run db:migrate -w @kinotest/api     # creates and applies the first migration
npm run dev:api                         # http://localhost:3000/health
npm run dev:mobile                      # http://localhost:5173
npm run dev:admin                       # http://localhost:5174
npm run dev:site                        # http://localhost:4321
```

`npm run db:up|db:down|db:logs` auto-detect `docker compose`, `podman compose`, `podman-compose` or
`docker-compose`. To force one: `COMPOSE_CMD="podman compose" npm run db:up`. Podman needs a compose
provider installed (`podman-compose` or `docker-compose`).

## Roles

Roles and permissions live in `packages/shared/src/roles.ts`. To add a role (e.g. `editor`),
add it there and to the `Role` enum in `apps/api/prisma/schema.prisma`, then migrate.
Routes are protected with `requirePermission(...)` (see `apps/api/src/routes/content.ts`).

## Not done yet

- Authentication: `requirePermission` expects `req.user`, which nothing sets yet (routes return 401).
- Capacitor (Android/iOS). The apps already read the API URL from `VITE_API_URL`.
- Railway setup (Staging and Production). Services need the monorepo root, so use root-based
  build/start commands, e.g. `npm run build -w @kinotest/api` and `npm run start -w @kinotest/api`,
  with `npm run db:deploy -w @kinotest/api` as the migration step. Verify against Railway's docs.
