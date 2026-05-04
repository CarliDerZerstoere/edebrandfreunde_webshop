#!/bin/bash
# Saleor Backup Script
#   - PostgreSQL: pg_dump → custom format (komprimiert), 7 Tage Retention
#   - Media: tar → gzip, 7 Tage Retention
#
# Cron-Setup (in `crontab -e`):
#   30 3 * * *  /home/webshopadmin/saleor-production/backup.sh >> /home/webshopadmin/backups/backup.log 2>&1
#
# Restore:
#   DB:    docker exec -i saleor-production-db-1 pg_restore -U saleor -d saleor --clean --if-exists < backup.dump
#   Media: tar xzf media-YYYY-MM-DD.tgz -C /var/lib/docker/volumes/saleor-production_saleor-media/_data/

set -euo pipefail

BACKUP_ROOT="/home/webshopadmin/backups"
DB_DIR="${BACKUP_ROOT}/db"
MEDIA_DIR="${BACKUP_ROOT}/media"
RETENTION_DAYS=7

DB_CONTAINER="saleor-production-db-1"
MEDIA_VOLUME="saleor-production_saleor-media"

TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
START_EPOCH=$(date +%s)

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

err_handler() {
  log "❌ ERROR on line $1 (exit $2)"
}
trap 'err_handler $LINENO $?' ERR

log "=== Backup gestartet ==="

# ---------- PostgreSQL ----------
DB_FILE="${DB_DIR}/saleor-${TS}.dump"
log "PostgreSQL dump → ${DB_FILE}"
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-saleor}" "${DB_CONTAINER}" \
  pg_dump -U saleor -d saleor --format=custom --compress=9 --no-owner --no-acl \
  > "${DB_FILE}"
chmod 600 "${DB_FILE}"

DB_SIZE=$(du -h "${DB_FILE}" | cut -f1)
log "PostgreSQL ✓ (${DB_SIZE})"

# ---------- Media volume ----------
MEDIA_FILE="${MEDIA_DIR}/media-${TS}.tgz"
log "Media volume tar → ${MEDIA_FILE}"
# Read-only sidecar container that runs as the host user, so output files
# are owned by webshopadmin instead of root.
HOST_UID=$(id -u)
HOST_GID=$(id -g)
docker run --rm \
  --user "${HOST_UID}:${HOST_GID}" \
  -v "${MEDIA_VOLUME}:/src:ro" \
  -v "${MEDIA_DIR}:/dest" \
  alpine:3 \
  sh -c "cd /src && tar czf /dest/media-${TS}.tgz . 2>/dev/null"
chmod 600 "${MEDIA_FILE}"

MEDIA_SIZE=$(du -h "${MEDIA_FILE}" | cut -f1)
log "Media ✓ (${MEDIA_SIZE})"

# ---------- Retention ----------
log "Retention: lösche Backups älter als ${RETENTION_DAYS} Tage"
DELETED_DB=$(find "${DB_DIR}" -type f -name "saleor-*.dump" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
DELETED_MEDIA=$(find "${MEDIA_DIR}" -type f -name "media-*.tgz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
log "Gelöscht: ${DELETED_DB} DB-Files, ${DELETED_MEDIA} Media-Files"

# ---------- Disk usage report ----------
TOTAL=$(du -sh "${BACKUP_ROOT}" | cut -f1)
DB_TOTAL=$(du -sh "${DB_DIR}" | cut -f1)
MEDIA_TOTAL=$(du -sh "${MEDIA_DIR}" | cut -f1)
log "Disk: ${TOTAL} total (db=${DB_TOTAL}, media=${MEDIA_TOTAL})"

DURATION=$(($(date +%s) - START_EPOCH))
log "✅ Backup OK in ${DURATION}s — Size DB: ${DB_SIZE}, Media: ${MEDIA_SIZE}"
