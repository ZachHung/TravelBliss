#!/usr/bin/env bash
# The VM's Postgres backups (ADR 0006, #181): backup.sh backup | restore [file] | configured
#   backup     pg_dump, encrypt with the Terraform-generated passphrase, upload to Google Drive, keep about 15 days
#   restore    the newest backup (or the one named) into the db service; the app is stopped while it runs
#   configured exit 0 when an rclone remote for backups exists (deploy.sh and bootstrap.sh ask this first)
#   has-backups exit 0: the remote holds a backup; 1: it holds none; 2: it couldn't be listed (a rebuild must stop)
#   first-boot the newest backup into a new VM's database, once: bootstrap.sh runs it before the app starts (#217)
# Cron runs `backup` nightly; deploy.sh runs it before every migration. Redis is not backed up (sessions only).
# Same encryption as openGym's backups: openssl aes-256-cbc with pbkdf2.
set -euo pipefail
DIR=${TRAVELBLISS_DIR:-/opt/travelbliss}
export ENV_FILE=${TRAVELBLISS_ENV_FILE:-.env.production}
REMOTE=${TRAVELBLISS_BACKUP_REMOTE:-gdrive:travelbliss-backups}
PASS=${TRAVELBLISS_BACKUP_PASS:-/root/.travelbliss-backup-pass}
export RCLONE_CONFIG=${RCLONE_CONFIG:-/root/.config/rclone/rclone.conf}
BACKUPS='travelbliss-*.dump.enc' # retention and listing touch only these, never other files in the folder
tmp=
trap '[ -z "$tmp" ] || rm -f -- "$tmp"' EXIT # also when a step fails partway
cd "$DIR"
# TAG only names images; db and cache don't use it
compose() { TAG=${TAG:-main} docker compose --env-file "$ENV_FILE" "$@"; }

configured() { [ -f "$RCLONE_CONFIG" ] && rclone listremotes | grep -qx "${REMOTE%%:*}:"; }
# Fails when the remote can't be listed: "can't tell" must never read as "no backups" (a rebuild would start empty)
# Explicit returns: set -e doesn't apply inside $(...), where newest always runs.
newest() {
  local list
  rclone mkdir "$REMOTE" || return 2 # a brand-new remote has no folder yet: that is "no backups", not an error
  list=$(rclone lsf "$REMOTE" --include "$BACKUPS") || return 2
  sort <<<"$list" | tail -1
}

backup() {
  local name
  name=travelbliss-$(date -u +%Y%m%dT%H%M%SZ).dump.enc
  tmp=$(mktemp)
  # -Fc: pg_restore's custom format, compressed; the db container knows its own user and database
  # shellcheck disable=SC2016 # expands inside the db container
  compose exec -T db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' |
    openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$PASS" -out "$tmp"
  rclone copyto "$tmp" "$REMOTE/$name"
  rclone delete "$REMOTE" --include "$BACKUPS" --min-age 15d
  echo "== Backed up: $REMOTE/$name"
}

restore() {
  local name=${1:-}
  if [ -z "$name" ]; then
    name=$(newest)
  fi
  if [ -z "$name" ]; then
    echo "== No backup in $REMOTE" >&2
    return 1
  fi
  tmp=$(mktemp)
  rclone copyto "$REMOTE/$name" "$tmp"
  compose stop api web >/dev/null 2>&1 || true
  # --clean --if-exists: replaces what's there, so a restore over a live database ends exactly as the backup
  # shellcheck disable=SC2016 # expands inside the db container
  openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:$PASS" -in "$tmp" |
    compose exec -T db sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  echo "== Restored: $REMOTE/$name. api and web are stopped: start them with TAG=\$(cat .deployed-tag) docker compose --env-file $ENV_FILE up -d"
}

# Once per VM, marked by a file: rerunning bootstrap on a VM that has served must never restore over its data.
# Marked when it restored, when there was nothing to restore, and when backups aren't set up. Not when the backups
# couldn't be listed: that stops the boot before the app starts, and a rerun after fixing rclone tries again.
first_boot() {
  local marker=$DIR/.first-boot-restore-done name
  if [ -f "$marker" ]; then
    echo "== First-boot restore already done on this VM ($marker): skipping"
    return 0
  fi
  if ! configured; then
    echo "== Backups aren't set up: starting with an empty database"
  elif ! name=$(newest); then
    echo "ERROR: couldn't list the backups in $REMOTE; fix rclone, then rerun travelbliss-bootstrap" >&2
    return 2
  elif [ -n "$name" ]; then
    restore "$name"
  else
    echo "== No backups yet: starting with an empty database"
  fi
  touch "$marker"
}

case ${1:-} in
  backup) backup ;;
  first-boot) first_boot ;;
  restore) restore "${2:-}" ;;
  configured) configured ;;
  has-backups)
    found=$(newest) || exit 2
    [ -n "$found" ]
    ;;
  *)
    echo "usage: backup.sh backup | restore [file] | configured | has-backups | first-boot" >&2
    exit 2
    ;;
esac
