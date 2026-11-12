# Kinotest

TypeScript monorepo (npm workspaces).

| Path | What |
|---|---|
| `apps/mobile` | Ionic + React app for therapists: web, and Android via Capacitor (iOS later) |
| `apps/admin` | Ionic + React private control panel (web) |
| `apps/site` | Public information site (Astro) |
| `apps/api` | Express + Prisma + PostgreSQL |
| `packages/shared` | Zod schemas, roles and permissions shared by all apps |
| `packages/ui` | React components shared by `mobile` and `admin` (Markdown editor) |

## Local development

Requires Node 22.18+ and Docker or Podman.

### First time

```bash
cp .env.example .env
npm install
npm run db:up                           # PostgreSQL, Adminer and Garage (image store) in containers
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
terminal. Use an email listed in `OWNER_EMAILS` to become `owner`, which is needed to manage content.
`OWNER_EMAILS` is a comma-separated list (`OWNER_EMAILS=one@x.com,two@x.com`), so there can be several
owners. An account that already exists as `user` is promoted at its next login; removing an email from the
list does not demote it. `OWNER_EMAIL` (a single email) still works too.

`npm run db:up|db:down|db:logs` auto-detect `docker compose`, `podman compose`, `podman-compose` or
`docker-compose`. To force one: `COMPOSE_CMD="podman compose" npm run db:up`. Podman needs a compose
provider installed (`podman-compose` or `docker-compose`).

Adminer, a web UI for the local database, starts with `db:up` at http://localhost:8080 (bound to
`127.0.0.1`). Log in with System **PostgreSQL**, Server `db`, and `kinotest` as username, password and
database.

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
npm test -w apps/mobile    # therapist app, pure logic in src/lib (Vitest)
npm run typecheck          # all workspaces
```

The API tests use a separate `kinotest_test` database (created and migrated automatically;
set `TEST_DATABASE_URL` to change it, its name must end in `_test`).

## Authentication

Passwordless: the user asks for a magic link by email and signs in by opening it (open sign-up).
With `MAIL_PROVIDER=console` (default) the link is printed in the API terminal. The emails listed in
`OWNER_EMAILS` (and `OWNER_EMAIL`) become `owner`; everyone else is a `user`.

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

## Android app (Capacitor)

`apps/mobile` is wrapped with Capacitor (`apps/mobile/capacitor.config.ts`, app id `me.kinotest.app`); the
native project lives in `apps/mobile/android` and is committed. Inside the app the web code is served from
`https://localhost`.

### Test APK from GitHub Actions

Actions → **Android APK (debug)** → *Run workflow* (manual only; pick the branch). The APK is uploaded as an
artifact, kept 14 days. The workflow needs:

- Repository variables (Settings → Secrets and variables → Actions → *Variables*): `VITE_API_URL` and
  `VITE_MEDIA_URL`. Both are baked into the build and must be reachable from the phone, never `localhost`.
  They can be overridden per run with the `api_url` / `media_url` inputs.
- `https://localhost` in the API's `CORS_ORIGINS` (comma-separated, no trailing slash).

### Building locally

Requires the Android SDK (`ANDROID_HOME`) and JDK 21 (newer JDKs may not work with the Android Gradle
Plugin).

```bash
VITE_API_URL=https://… VITE_MEDIA_URL=https://… npm run android:apk -w @kinotest/mobile
# → apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
npm run android:sync -w @kinotest/mobile   # only build the web and copy it into the Android project
```

### Sign-in link (App Links)

The magic link (`APP_URL/auth/verify?token=…`) opens the app instead of the browser:

- `AndroidManifest.xml` declares the host (Staging for now:
  `kinotest2-app-staging.up.railway.app`, path `/auth/verify`).
- That host serves `/.well-known/assetlinks.json` (`apps/mobile/public/.well-known/`) with the SHA-256 of
  the signing key. Android checks it **when the app is installed**: deploy the web first, then install.
- Debug builds are signed with `apps/mobile/android/app/debug.keystore`, committed on purpose so the
  fingerprint is the same on every machine and CI run. It is not a secret (password `android`) and can
  never publish to the Play Store; a release key must be created separately and its fingerprint added to
  `assetlinks.json`.
- `src/components/DeepLinks.tsx` (`@capacitor/app`) routes the link to the verify page.

To add another environment, add its host to the manifest; `assetlinks.json` ships with each web deploy.

## Not done yet

- iOS (Capacitor), release signing and Play Store; secure token storage on the device (tokens are still in
  `localStorage`); App Links for Production.
- Production environment on Railway and its R2 bucket (Staging already runs; the configuration
  lives in the Railway dashboard, not in the repo).
- Migration of the existing images to R2 (`scripts/import-images.mjs`).

## License

No license specified: all rights reserved.
