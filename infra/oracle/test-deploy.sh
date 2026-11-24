#!/usr/bin/env bash
# Runs deploy.sh against a throwaway copy of the production stack and checks every path it can take: a fresh
# deploy, a duplicate, a --force redeploy, a good deploy and its pruning, a failing migration, an API that crashes,
# and an `up` that fails. Needs Docker; uses the published :main images (pulled if missing) as the known-good build.
#   infra/oracle/test-deploy.sh            # CI and local; leaves nothing behind
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
A=ghcr.io/zachhung/travelbliss-api
W=ghcr.io/zachhung/travelbliss-web
PORT=${TEST_PORT:-18080}
WORK=$(mktemp -d)

export COMPOSE_PROJECT_NAME=tbdeploytest ENV_FILE=test.vars WEB_BIND=127.0.0.1:$PORT
export TRAVELBLISS_DIR=$WORK TRAVELBLISS_ENV_FILE=test.vars TRAVELBLISS_SITE=http://127.0.0.1:$PORT

cleanup() {
  (cd "$WORK" && TAG=none docker compose --env-file test.vars down -v --remove-orphans >/dev/null 2>&1) || true
  docker images --format '{{.Repository}}:{{.Tag}}' | grep -E "^($A|$W):t-" | xargs -r docker rmi >/dev/null 2>&1 || true
  rm -rf -- "${WORK:?}"
}
trap cleanup EXIT

cp "$HERE/compose.yml" "$WORK/"
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
api_tag() { docker inspect -f '{{.Config.Image}}' "$COMPOSE_PROJECT_NAME-api-1" | sed 's/.*://'; }

failures=0
# step <name> <expected exit> <expected live tag> <expected output (grep -E)> -- <deploy.sh args>
step() {
  local name=$1 want_rc=$2 want_live=$3 want_out=$4 rc=0
  shift 5
  bash "$HERE/deploy.sh" "$@" >"$WORK/out.log" 2>&1 || rc=$?
  local live api ok=true
  live=$(cat "$WORK/.deployed-tag")
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
step 'fresh deploy' 0 t-a '== Live: t-a' -- t-a
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

[ "$failures" = 0 ] && echo "all deploy paths pass" || { echo "$failures failed"; exit 1; }
