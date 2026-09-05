// Runs before any test file is collected — must set env vars the app's
// modules read at import/construction time (Prisma's datasource URL is
// resolved from process.env.DATABASE_URL when `new PrismaClient()` runs).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:africashiplog@localhost:5432/africashiplog_test?schema=public";
process.env.JWT_SECRET ??= "test-secret-not-for-production-use-1234567890";
process.env.SECRETS_ENCRYPTION_KEY ??= "0".repeat(64);
