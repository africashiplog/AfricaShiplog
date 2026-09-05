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
tests/                    Integration tests (real Postgres, service layer) — see Testing below
docs/deployment.md        Docker build/runtime notes, why the runtime image is Debian-based
docs/backup.md            Backup/restore process, retention policy, DR drill checklist
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

## Deployment & backups

See [`docs/deployment.md`](docs/deployment.md) (Docker build, environment
variables, zero-downtime notes) and [`docs/backup.md`](docs/backup.md)
(dump/restore commands, retention policy, disaster-recovery drill).

## Project status

Built phase by phase, each phase committed once working end-to-end against
a real PostgreSQL database (migrations applied, core flows exercised
manually and — from Phase 11 on — by the automated test suite). Full detail
is in the commit history; this is an honest summary of what's real today
versus what's intentionally out of scope or partial.

**Fully implemented:** authentication (JWT access + rotating refresh
tokens, forced password change), RBAC with custom roles/permissions,
multi-branch management, customer management with ticket/parcel history,
vehicles/drivers, trips with generated seat maps, ticket sales with
server-computed totals and atomic double-booking prevention, ticket
cancel/refund, parcel creation/tracking workflow/delivery with COD
validation, barcode+QR generation and a printable parcel label, cash
registers with full daily-closing (expected/actual/difference, lock,
reopen, resume), expenses with void-as-reversal, WhatsApp Business Cloud
API integration (encrypted credentials, configurable templates, honest
PENDING-vs-FAILED status when not yet configured), a real management
dashboard, three report types with CSV export, and profitability
analytics (explicitly labeled revenue-only where no cost allocation
exists, per the brief's own caution against overstating profitability).

**Partial / deliberately simplified:**
- **Printing** — the parcel label and generic report tables (via the
  browser's print dialog) are covered; dedicated print layouts for a
  single ticket, a trip manifest, or a cash-closing receipt are not built.
- **Excel/PDF export** — reports export as CSV (which Excel opens
  natively) rather than a native `.xlsx` binary; "PDF" is the browser's
  print-to-PDF on the same report view, not a server-rendered PDF file.
- **Barcode scanning** — works with any USB/Bluetooth scanner configured
  as a keyboard-wedge (typed input + Enter into the tracking-number search
  box); there's no camera-based in-browser scanning UI.
- **Global search** — customers (name/phone) and parcels
  (tracking/name/phone) each have their own search; there's no single
  search bar spanning tickets + parcels + customers + payments at once.
- **Financial adjustments** — corrections exist as reversals tied to a
  specific operation (ticket refund, expense void); there's no free-form
  "create an arbitrary adjustment" screen for corrections that don't map
  to one of those flows.
- **Commissions** (employee/partner) — not implemented; the schema and
  reports don't compute or track commission amounts.
- Automated test coverage focuses on the highest-risk financial/workflow
  logic (Phase 11); it is not an exhaustive test of every screen and
  permission combination.

**Not started:** a dedicated health-check endpoint (noted in
`docs/deployment.md`), and any English (or other) locale — the i18n
structure (`src/lib/i18n/`) supports adding one, but only Arabic exists
today, matching the brief's Arabic-first scope.
