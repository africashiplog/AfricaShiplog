# Deployment

## Prerequisites

- A PostgreSQL 16 instance (managed service or self-hosted).
- Docker + Docker Compose (or any container runtime that can run the image
  built from `Dockerfile`).
- Real secrets (never reuse the values in `.env.example`):
  ```bash
  openssl rand -base64 48   # JWT_SECRET
  openssl rand -hex 32      # SECRETS_ENCRYPTION_KEY
  ```
- A WhatsApp Business Cloud API phone number + access token, if WhatsApp
  notifications are needed at launch (the app runs fine without them —
  outbound messages simply queue as `PENDING` until configured, see
  `src/services/whatsapp-service.ts`).

## Building and running

```bash
cp .env.example .env   # then fill in real values
docker compose build
docker compose --profile tools run --rm migrate   # applies prisma/migrations
docker compose --profile tools run --rm seed       # OPTIONAL, dev/demo data only — do not run against production
docker compose up -d
```

`docker compose up` only starts `db` and `app` — `migrate` and `seed` are
one-off jobs (`profiles: ["tools"]`) run explicitly, not on every restart.
Re-run `migrate` after every deploy that includes new Prisma migrations;
never run `seed` against a database that already holds real operational
data (it deliberately no-ops on an existing admin account, but it is meant
for bootstrapping, not routine deploys).

### Why the runtime image is Debian-based, not Alpine

Prisma's query engine binary is generated for the platform that runs
`prisma generate` (the `build` Docker stage), which links against glibc.
Alpine uses musl libc, a different dynamic linker — running an
Alpine-based container with a glibc-built engine binary fails at runtime.
Rather than juggle `binaryTargets` in `prisma/schema.prisma`, the
`Dockerfile` uses `node:22-slim` (Debian, glibc) for every stage, so the
binary generated during build matches the runtime exactly.

### Multi-stage build

- `deps` — installs dependencies (`npm ci`; the `prisma generate`
  postinstall hook needs `prisma/schema.prisma`, so it's copied in before
  this stage runs).
- `build` — full source, runs `prisma generate` again against the final
  schema and `next build` with `output: "standalone"`. This stage is also
  what the `migrate`/`seed` compose services target, since it still carries
  the `prisma` CLI (a devDependency the pruned runtime image drops).
- `runtime` — copies only `.next/standalone`, `.next/static`, and
  `public/`; runs as a non-root user (`nextjs`); no source code or
  devDependencies ship in the final image.

## Environment variables

See `.env.example` for the full list. `docker-compose.yml` passes
through everything the app reads from `process.env` with sensible
defaults for optional values (WhatsApp credentials, currency, timezone) —
override them in `.env` or your platform's secret manager.

## Zero-downtime notes for a real rollout

- Run `migrate` before swapping traffic to the new `app` version — Prisma
  migrations here are additive/backward-compatible by convention (a
  column rename, for instance, should be two migrations: add-and-backfill,
  then drop-old, deployed across two releases) so the previous app version
  keeps working against the migrated schema during a rolling deploy.
- The app is stateless (sessions live in the `UserSession` table, not
  in-memory) except for the in-memory login rate limiter
  (`src/lib/rate-limit.ts`), which is per-instance — fine for a single
  container, but replace it with a shared store (Redis) before running
  more than one `app` replica behind a load balancer.
- Put a real reverse proxy / load balancer in front of `app` for TLS
  termination; the container itself serves plain HTTP on `PORT` (default
  3000).

## Health checks

There is no dedicated `/api/health` route yet — point a liveness check at
any unauthenticated page response (e.g. `GET /login` returning 200) or add
a minimal health endpoint before wiring this into an orchestrator that
requires one.
