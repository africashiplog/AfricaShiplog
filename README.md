# AfricaShiplog — نظام إدارة وكالة النقل والشحن

A production-oriented, Arabic-first (RTL) transport agency management system:
ticketing & seat management, parcel/shipment tracking, multi-branch operations,
cash registers & daily closing, accounting, WhatsApp notifications, reporting,
and role-based access control.

This is being built incrementally, phase by phase (see **Project status**
below) — each phase adds real, database-backed functionality, not mockups.

## Tech stack

| Layer          | Choice                                                   |
| -------------- | --------------------------------------------------------- |
| Frontend       | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend        | Next.js Route Handlers (REST-style API), service layer in `src/services` |
| Database       | PostgreSQL 16                                              |
| ORM            | Prisma 6                                                   |
| Auth           | Custom JWT (access + rotating refresh tokens via `jose`), bcrypt password hashing, RBAC enforced server-side |
| Money          | `Decimal(14,2)` columns everywhere — never floating point  |
| WhatsApp       | WhatsApp Business Cloud API (official), pluggable service layer |
| Barcode/QR     | `qrcode`, `bwip-js` (server-generated) |
| Testing        | Vitest |
| Deployment     | Docker (multi-stage, standalone Next.js output) + docker-compose |

## Getting started (local development)

### 1. Database

Either run PostgreSQL via Docker:

```bash
docker compose up -d db
```

...or use a local PostgreSQL 16 install. Then create `.env` from the example:

```bash
cp .env.example .env
# edit DATABASE_URL, JWT_SECRET, SECRETS_ENCRYPTION_KEY
```

Generate strong secrets:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # SECRETS_ENCRYPTION_KEY
```

### 2. Install & migrate

```bash
npm install
npm run db:migrate     # applies prisma/migrations, generates the client
npm run db:seed        # creates default roles/permissions, an admin user, demo branches
```

### 3. Run

```bash
npm run dev
```

Visit http://localhost:3000 — you'll be redirected to `/login`.

## Environment variables

See `.env.example` for the full list and descriptions. Nothing sensitive is
committed; `.env` is gitignored.

## Scripts

| Command             | What it does                                   |
| -------------------- | ----------------------------------------------- |
| `npm run dev`         | Start the dev server                            |
| `npm run build`       | Production build                                |
| `npm start`           | Run the production build                        |
| `npm run db:migrate`  | Create/apply a Prisma migration (dev)           |
| `npm run db:deploy`   | Apply migrations in production (no prompts)     |
| `npm run db:studio`   | Prisma Studio (inspect the database)            |
| `npm run db:seed`     | Seed roles/permissions/admin user/demo data     |
| `npm test`            | Run the automated test suite once               |

## Project structure

```
prisma/schema.prisma      Full data model (see inline comments for conventions)
prisma/seed.ts            Seed script: roles, permissions, default admin, demo data
src/app/                  Pages (App Router) — Arabic RTL UI
src/app/api/              Route handlers (REST-style API)
src/lib/auth/             JWT sessions, password hashing, permission guard (`requireAuth`)
src/lib/i18n/             Arabic dictionary (structured for future locales)
src/lib/db.ts             Prisma client singleton
src/lib/audit.ts          Audit log writer
src/services/             Business logic layer (ticketing, parcels, cash, WhatsApp, ...)
src/components/           Shared UI components
src/proxy.ts              Route protection (session presence) + is edge of the request pipeline
```

## Testing

Integration tests exercise the service layer (business logic + real
Postgres, not mocks) for the workflows where correctness matters most:
seat double-booking, ticket refunds, parcel COD/delivery validation, cash
register closing math and locking, and expense voiding.

```bash
# one-time setup
sudo -u postgres psql -c "CREATE DATABASE africashiplog_test OWNER postgres;"
DATABASE_URL="postgresql://postgres:<pw>@localhost:5432/africashiplog_test?schema=public" npx prisma migrate deploy

npm test
```

`tests/setup.ts` points `DATABASE_URL` at `africashiplog_test` by default
(override with `TEST_DATABASE_URL`); each test file truncates all tables in
`beforeEach`, so tests never touch your development data. Plain unit tests
(no DB) live alongside their source files as `*.test.ts`.

## Security notes

- All permission checks are enforced server-side in route handlers via
  `requireAuth(permissionCode)` — the UI hiding a button is never the only
  gate. Every list/report/analytics endpoint that accepts a `branchId`
  query parameter validates it against `userCanAccessBranch()` before using
  it, so a branch-scoped user can't page through another branch's data by
  editing the query string.
- Passwords are hashed with bcrypt (12 rounds). Refresh tokens are stored
  hashed (SHA-256) — a database leak alone cannot be replayed as a session.
  Login is rate-limited per IP.
- The WhatsApp access token is encrypted at rest (AES-256-GCM) and only
  ever exposed to the UI in masked form (`••••1234`).
- Financial records (`FinancialTransaction`, `Expense`) are never hard-deleted;
  corrections are recorded as reversal/adjustment rows, preserving history.
  There is no update/delete endpoint for `FinancialTransaction` anywhere in
  the API — closing a cash session "locks" its transactions simply because
  nothing can ever modify them, closed or not.
- Security headers (CSP, X-Frame-Options, etc.) are set globally in
  `next.config.ts`. Auth cookies are `httpOnly`, `SameSite=Lax`, and
  `Secure` in production, which blocks cross-site state-changing requests
  without a separate CSRF token.
- All database access goes through Prisma's parameterized query builder;
  the only raw SQL in the repo is a `TRUNCATE` in the test helpers, built
  from table names read back from `pg_catalog`, never from user input.
- `npm audit` reports advisories in Prisma's CLI-only dependency chain
  (`prisma` → `@prisma/config` → `deepmerge-ts`, a stack-exhaustion DoS in a
  config-merging helper). This package is invoked only by `npx prisma ...`
  commands during development/deployment and is never imported by the
  running application, so it does not reach production request handling.
  Re-check `npm audit` before pinning a newer Prisma release that resolves
  it.

## Project status

Being implemented phase by phase per the project brief. Each phase is
committed once it is working end-to-end (migrations run, core flows
exercised). Track progress in the PR/commit history; a running checklist of
what's implemented vs. pending is kept up to date as phases land.
