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
npm run db:migrate -w @kinotest/api     # applies the migrations
npm run dev:api                         # http://localhost:3000/health
npm run dev:mobile                      # http://localhost:5173
npm run dev:admin                       # http://localhost:5174
npm run dev:site                        # http://localhost:4321
```

`npm run db:up|db:down|db:logs` auto-detect `docker compose`, `podman compose`, `podman-compose` or
`docker-compose`. To force one: `COMPOSE_CMD="podman compose" npm run db:up`. Podman needs a compose
provider installed (`podman-compose` or `docker-compose`).

## Tests

```bash
npm run db:up
npm test -w apps/api
```

The API tests use a separate `kinotest_test` database (created and migrated automatically;
set `TEST_DATABASE_URL` to change it, its name must end in `_test`).

## Authentication

Passwordless: the user asks for a magic link by email and signs in by opening it (open sign-up).
With `MAIL_PROVIDER=console` (default) the link is printed in the API terminal. The email set in
`OWNER_EMAIL` becomes the `owner`; everyone else is a `user`.

## Roles

Roles and permissions live in `packages/shared/src/roles.ts`. To add a role (e.g. `editor`),
add it there and to the `Role` enum in `apps/api/prisma/schema.prisma`, then migrate.
Routes are protected with `requirePermission(...)` (see `apps/api/src/content/routes.ts`).

## Content

A content item is a JSON document (a catalog of remedies, grouped in nested categories) with
Markdown text fields. Its format is the `contentDocumentSchema` in `packages/shared/src/schemas.ts`.
Images are referenced by object key, never by URL.

## Not done yet

- Capacitor (Android/iOS). The apps already read the API URL from `VITE_API_URL`.
- Image storage (Cloudflare R2) and the content editor in the admin panel.
- Railway setup (Staging and Production). Services need the monorepo root, so use root-based
  build/start commands, e.g. `npm run build -w @kinotest/api` and `npm run start -w @kinotest/api`,
  with `npm run db:deploy -w @kinotest/api` as the migration step. Verify against Railway's docs.

## License

No license specified: all rights reserved.
