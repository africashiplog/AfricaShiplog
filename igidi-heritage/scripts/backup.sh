#!/bin/sh
# Backs up the PostgreSQL database (custom format) and the uploaded files.
# Usage: DB_HOST=localhost DB_USER=igidi DB_NAME=igidi PGPASSWORD=... sh scripts/backup.sh
set -eu
STAMP=$(date +%Y%m%d-%H%M%S)
DIR=${BACKUP_DIR:-/backups}
UPLOADS=${UPLOAD_DIR:-/data/uploads}
KEEP_DAYS=${KEEP_DAYS:-30}
mkdir -p "$DIR"
pg_dump -h "${DB_HOST:-localhost}" -U "${DB_USER:-igidi}" -d "${DB_NAME:-igidi}" -Fc -f "$DIR/igidi-db-$STAMP.dump"
if [ -d "$UPLOADS" ]; then tar -czf "$DIR/igidi-uploads-$STAMP.tar.gz" -C "$UPLOADS" .; fi
find "$DIR" -name 'igidi-*' -mtime +"$KEEP_DAYS" -delete
echo "Backup written to $DIR ($STAMP)"
