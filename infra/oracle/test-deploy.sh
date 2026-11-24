#!/usr/bin/env bash
# Runs deploy.sh against a throwaway copy of the production stack and checks every path it can take: a fresh
# deploy, a duplicate, a --force redeploy, a good deploy and its pruning, a failing migration, an API that crashes,
# and an `up` that fails. Needs Docker; uses the published :main images (pulled if missing) as the known-good build.
#   infra/oracle/test-deploy.sh            # CI and local; removes its stack and its t-* test images afterwards
# deploy.sh prunes every local travelbliss image but the new, the live and :main, so on a machine holding other
# travelbliss tags (a pulled SHA, a local build) this refuses to run, outside CI, rather than delete them.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
A=ghcr.io/zachhung/travelbliss-api
W=ghcr.io/zachhung/travelbliss-web
PORT=${TEST_PORT:-18080}

others=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E "^($A|$W):" | grep -vE ':(main|t-.*)$' || true)
if [ -n "$others" ] && [ -z "${CI:-}" ]; then
  echo "Refusing to run: deploy.sh's pruning would delete these local images:" >&2
  echo "$others" >&2
  echo "Remove them (docker rmi), or run in CI." >&2
  exit 2
fi
WORK=$(mktemp -d)

export COMPOSE_PROJECT_NAME=tbdeploytest ENV_FILE=test.vars WEB_BIND=127.0.0.1:$PORT
export TRAVELBLISS_DIR=$WORK TRAVELBLISS_ENV_FILE=test.vars TRAVELBLISS_SITE=http://127.0.0.1:$PORT
export TRAVELBLISS_NO_PULL=1 # the t-* images exist only locally
# Backups go to a local folder standing in for Google Drive, once rclone.conf exists (the backup checks below)
export RCLONE_CONFIG=$WORK/rclone.conf TRAVELBLISS_BACKUP_REMOTE=gdrive:$WORK/drive TRAVELBLISS_BACKUP_PASS=$WORK/pass

cleanup() {
  (cd "$WORK" && TAG=none docker compose --env-file test.vars down -v --remove-orphans >/dev/null 2>&1) || true
  docker images --format '{{.Repository}}:{{.Tag}}' | grep -E "^($A|$W):t-" | xargs -r docker rmi >/dev/null 2>&1 || true
  rm -rf -- "${WORK:?}"
}
trap cleanup EXIT

cp "$HERE/compose.yml" "$HERE/backup.sh" "$WORK/"
cat >"$WORK/test.vars" <<'EOF'
API_POSTGRES_USER=travelbliss
API_POSTGRES_PASSWORD=test-db-password
API_POSTGRES_DB=travelbliss
API_REDIS_PASSWORD=test-redis-password
API_SALT_ROUND=4
API_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
API_SECRET_JWT=test-jwt
API_JWT_EXPIRED=5minutes
API_SECRET_REFRESH=test-refresh
API_REFRESH_EXPIRED=30d
API_SESSION_MAX_AGE=90d
API_COOKIE_NAME=travelBliss
EOF

docker image inspect "$A:main" >/dev/null 2>&1 || docker pull -q "$A:main" >/dev/null
docker image inspect "$W:main" >/dev/null 2>&1 || docker pull -q "$W:main" >/dev/null

# Test builds, made just before each step: a deploy prunes every tag but the new, the live and :main
good() { docker tag "$A:main" "$A:$1" && docker tag "$W:main" "$W:$1"; }
derived() { # <tag> <Dockerfile line>: an API image that differs from :main by one line
  printf 'FROM %s:main\n%s\n' "$A" "$2" | docker build -q -t "$A:$1" - >/dev/null && docker tag "$W:main" "$W:$1"
}
answers() {
  curl -sf -m 3 -X POST "$TRAVELBLISS_SITE/graphql" -H 'content-type: application/json' \
    -H 'apollo-require-preflight: true' -d '{"query":"{ __typename }"}' | grep -q '"Query"'
}
# Both fall back, so a step that fails before deploying anything still prints its FAIL line and deploy.sh's output
api_tag() { docker inspect -f '{{.Config.Image}}' "$COMPOSE_PROJECT_NAME-api-1" 2>/dev/null | sed 's/.*://' || echo none; }
live_tag() { cat "$WORK/.deployed-tag" 2>/dev/null || echo none; }

failures=0
# step <name> <expected exit> <expected live tag> <expected output (grep -E)> -- <deploy.sh args>
step() {
  local name=$1 want_rc=$2 want_live=$3 want_out=$4 rc=0
  shift 5
  bash "$HERE/deploy.sh" "$@" >"$WORK/out.log" 2>&1 || rc=$?
  local live api ok=true
  live=$(live_tag)
  api=$(api_tag)
  [ "$rc" = "$want_rc" ] && [ "$live" = "$want_live" ] && [ "$api" = "$want_live" ] &&
    answers && grep -qE "$want_out" "$WORK/out.log" || ok=false
  if $ok; then
    echo "ok    $name"
  else
    failures=$((failures + 1))
    echo "FAIL  $name: exit $rc (want $want_rc), live $live, api $api (want $want_live), site $(answers && echo up || echo DOWN)"
    sed 's/^/      | /' "$WORK/out.log"
  fi
}

good t-a
step 'fresh deploy, warning that backups are not set up' 0 t-a "backups aren.t set up" -- t-a
step 'same commit again is a no-op' 0 t-a 'already live' -- t-a
step '--force redeploys the live commit' 0 t-a '== Live: t-a' -- t-a --force
good t-b
step 'good deploy' 0 t-b '== Live: t-b' -- t-b
derived t-badmig "RUN printf 'exports.M9999999999999 = class { name = \"M9999999999999\"; async up() { throw new Error(\"broken on purpose\"); } };\n' > dist/migration/9999999999999-broken.js"
step 'failing migration stops before switching' 1 t-b 'broken on purpose' -- t-badmig
derived t-crash 'CMD ["node", "-e", "process.exit(1)"]'
step 'API that crashes is switched back' 1 t-b 'switching back to t-b' -- t-crash
docker tag "$A:main" "$A:t-noweb" # no web image: up fails
step 'failed up is switched back' 1 t-b 'up failed for t-noweb' -- t-noweb
good t-c
step 'good deploy after failures' 0 t-c '== Live: t-c' -- t-c

# Pruning kept the new and the replaced build, and dropped the rest
kept=$(docker images --format '{{.Tag}}' "$A" | grep '^t-' | sort | tr '\n' ' ')
if [ "$kept" = "t-b t-c " ]; then echo "ok    pruning kept only t-b t-c"; else
  failures=$((failures + 1)) && echo "FAIL  pruning kept: $kept(want t-b t-c)"
fi

# Backups (#181), with rclone now configured
printf '[gdrive]\ntype = local\n' >"$RCLONE_CONFIG"
echo test-passphrase >"$TRAVELBLISS_BACKUP_PASS"
dc() { (cd "$WORK" && TAG=$(live_tag) docker compose --env-file test.vars "$@"); }
psql_db() { dc exec -T db sh -c "psql -qtA -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \"$1\""; }
# check <name> <expected exit> -- <command...>
check() {
  local name=$1 want=$2 rc=0
  shift 3
  "$@" >"$WORK/out.log" 2>&1 || rc=$?
  if [ "$rc" = "$want" ]; then echo "ok    $name"; else
    failures=$((failures + 1))
    echo "FAIL  $name: exit $rc (want $want)"
    sed 's/^/      | /' "$WORK/out.log"
  fi
}
check 'has-backups: none yet' 1 -- "$WORK/backup.sh" has-backups
good t-d
step 'deploy backs up before migrating' 0 t-d '== Backed up: ' -- t-d
check 'has-backups: one now' 0 -- "$WORK/backup.sh" has-backups
backup=$(find "$WORK/drive" -name 'travelbliss-*.dump.enc' | head -1)
check 'backup is encrypted (no pg_dump header)' 1 -- grep -q PGDMP "$backup"

psql_db "create table backup_probe (x text); insert into backup_probe values ('kept')" >/dev/null
check 'backup' 0 -- "$WORK/backup.sh" backup
psql_db 'drop table backup_probe' >/dev/null
check 'restore the newest backup' 0 -- "$WORK/backup.sh" restore
dc up -d >/dev/null 2>&1 # restore leaves api and web stopped; wait for them, or the next step sees the site down
for _ in $(seq 60); do if answers; then break; fi; sleep 2; done
check 'restore brought the data back' 0 -- test "$(psql_db 'select x from backup_probe')" = kept

export TRAVELBLISS_BACKUP_REMOTE=gdrive:/proc/travelbliss-no-such-drive # can't be written or listed
good t-e
step 'failed backup stops the deploy before migrating' 1 t-d '.' -- t-e
check "has-backups: can't list" 2 -- "$WORK/backup.sh" has-backups

if [ "$failures" != 0 ]; then
  echo "$failures failed"
  exit 1
fi
echo "all deploy and backup paths pass"
