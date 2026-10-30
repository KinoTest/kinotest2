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

### First time

```bash
cp .env.example .env
npm install
npm run db:up                           # PostgreSQL and Garage (image store) in containers
npm run db:migrate -w @kinotest/api     # applies the migrations
node scripts/dev-storage.mjs            # once: public read + CORS for the local image bucket
```

### Every day

```bash
npm run db:up                           # if the containers are not running
npm run dev:api                         # http://localhost:3000/health
npm run dev:admin                       # http://localhost:5174 (private control panel)
npm run dev:mobile                      # http://localhost:5173
npm run dev:site                        # http://localhost:4321
```

Sign in at the panel: with `MAIL_PROVIDER=console` (default) the magic link is printed in the API
terminal. Use the email set in `OWNER_EMAIL` to become `owner`, which is needed to manage content.

`npm run db:up|db:down|db:logs` auto-detect `docker compose`, `podman compose`, `podman-compose` or
`docker-compose`. To force one: `COMPOSE_CMD="podman compose" npm run db:up`. Podman needs a compose
provider installed (`podman-compose` or `docker-compose`).

### Images locally

Images live in an S3-compatible bucket: Cloudflare R2 in Staging/Production and
[Garage](https://garagehq.deuxfleurs.fr) locally (`docker-compose.yml`, `scripts/garage.toml`). The
defaults in `.env.example` already point to it: S3 API on `localhost:3900`, bucket `kinotest-dev`,
public URL `http://kinotest-dev.web.garage.localhost:3902` (`VITE_MEDIA_URL`).

### Common problems

- **Thumbnails do not show:** the panel reads `VITE_*` from the `.env` at the repo root (not from
  `apps/admin/`) and only at startup. Check `VITE_MEDIA_URL` and restart `npm run dev:admin`.
- **Image upload fails with a CORS error:** run `node scripts/dev-storage.mjs` again (and check that
  the panel origin is in `CORS_ORIGINS`).
- **`db:up` cannot pull an image:** MinIO removed its images from the public registries in 2026;
  that is why Garage is used. Pin or mirror the image if a registry becomes unavailable.

## Tests

```bash
npm run db:up
npm test -w apps/api       # API (Vitest + Supertest, needs PostgreSQL)
npm test -w apps/admin     # control panel (Vitest + Testing Library)
npm run typecheck          # all workspaces
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
The admin panel uploads each image straight to the bucket: the browser converts it to WebP,
asks the API for a presigned URL (`POST /api/content/images/presign`) and sends a `PUT`.

## Not done yet

- Capacitor (Android/iOS). The apps already read the API URL from `VITE_API_URL`.
- Production environment on Railway and its R2 bucket (Staging already runs; the configuration
  lives in the Railway dashboard, not in the repo).
- Migration of the existing images to R2 (`scripts/import-images.mjs`).

## License

No license specified: all rights reserved.
