#!/usr/bin/env bash
# Recreates the throwaway e2e database (never point this at the real database).
set -euo pipefail
DB=${E2E_DB:-igidi_e2e}
su postgres -c "psql -q -c 'DROP DATABASE IF EXISTS $DB WITH (FORCE);' -c 'CREATE DATABASE $DB OWNER igidi;'"
su postgres -c "psql -q -d $DB -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'"
export DATABASE_URL="postgresql://igidi:igidi@localhost:5432/$DB?schema=public"
npx prisma migrate deploy >/dev/null
SEED_ADMIN_EMAIL=e2e-admin@example.org SEED_ADMIN_PASSWORD=E2e-Admin-Pass-2026 npx tsx prisma/seed.ts
