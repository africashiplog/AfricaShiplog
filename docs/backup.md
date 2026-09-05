# Backup & disaster recovery

Everything the system needs to reconstruct state lives in the PostgreSQL
database — there is no other persistent store (uploaded files like
delivery signatures/expense attachments are referenced by URL fields today;
if you wire those to actual object storage, back that up too, following
its own provider's snapshot/versioning mechanism).

## What must never be lost

- All operational data: tickets, parcels, customers, financial
  transactions, cash register sessions/closings, expenses, audit logs.
- `SystemSetting` and `WhatsAppSettings` rows — the latter holds the
  encrypted (not plaintext) WhatsApp access token; losing
  `SECRETS_ENCRYPTION_KEY` makes any already-stored encrypted token
  unrecoverable even with a database backup, so back up that key
  separately, in your secret manager, with the same rigor as the database.

## Backup process

Use PostgreSQL's own logical dump — it's consistent, portable across minor
versions, and restorable into an empty database with one command.

```bash
# Full dump, custom format (supports parallel restore, selective table restore)
pg_dump -h <host> -U <user> -d africashiplog -F c -f "africashiplog_$(date +%Y%m%d_%H%M%S).dump"
```

If PostgreSQL runs via the provided `docker-compose.yml`:

```bash
docker compose exec db pg_dump -U africashiplog -F c -d africashiplog > backup.dump
```

### Automated scheduled backups

Run the dump command above on a schedule (cron, a Kubernetes CronJob, or
your managed Postgres provider's built-in snapshot feature — RDS,
Cloud SQL, etc. all support automated snapshots and are the preferred
option over a hand-rolled cron job wherever available, since they also
handle point-in-time recovery). A minimal cron-based example:

```cron
0 2 * * * docker compose exec -T db pg_dump -U africashiplog -F c -d africashiplog > /backups/africashiplog_$(date +\%Y\%m\%d).dump
```

Store dumps somewhere other than the same host/volume as the database
(object storage with versioning, e.g. S3 + lifecycle rules) — a backup
that dies with the same disk as the database it's backing up isn't a
backup.

### Retention

A reasonable starting policy, adjust to your compliance requirements:

- Daily dumps kept 14 days.
- One dump per week kept 3 months.
- One dump per month kept 1–2 years (financial records — check your
  jurisdiction's record-keeping requirements before shortening this).

### Backup access

Dumps contain full customer and financial data — store them encrypted at
rest (most object storage does this by default) and restrict read access
the same way you'd restrict production database access. Never expose a
backup location publicly.

## Restore process

```bash
# Into a fresh, empty database:
pg_restore -h <host> -U <user> -d africashiplog_restored --clean --if-exists -1 backup.dump
```

Then point `DATABASE_URL` at the restored database and start the app —
no additional migration step is needed for a dump taken from a
schema-compatible version; if restoring an older dump into a newer
schema, run `npx prisma migrate deploy` after the restore to bring it
current.

## Disaster recovery drill

Periodically (quarterly is a reasonable cadence) actually restore a
recent backup into a scratch database and verify:

1. `pg_restore` completes without error.
2. The app boots against the restored database and login works.
3. Row counts on a few key tables (`Ticket`, `Parcel`,
   `FinancialTransaction`) look plausible for the backup's date.

A backup you've never restored is a hypothesis, not a plan.
