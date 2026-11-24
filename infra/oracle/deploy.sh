#!/usr/bin/env bash
# Runs on the VM, as root: deploy.sh <tag> [--force]. Copied here with compose.yml by .github/workflows/deploy.yml.
# Migrates with the new image first, switches to it, and switches back unless that build answers healthy (ADR 0006).
# --force (a manual run of the workflow) redeploys even when <tag> is already live.
set -euo pipefail
NEW=${1:?usage: deploy.sh <tag> [--force]}
FORCE=${2:-}
# The VM's values; test-deploy.sh points them at a throwaway stack
DIR=${TRAVELBLISS_DIR:-/opt/travelbliss}
SITE=${TRAVELBLISS_SITE:-http://127.0.0.1:8080}
# Exported: compose.yml's env_file reads ENV_FILE too
export ENV_FILE=${TRAVELBLISS_ENV_FILE:-.env.production}
cd "$DIR"
# What's live now: the version to switch back to, even on a --force redeploy of it (an older build could predate
# the live one's migrations). Its images and NEW's are the only ones a switch back can need.
OLD=$(cat .deployed-tag 2>/dev/null || echo main)
compose() { TAG=$1 docker compose --env-file "$ENV_FILE" "${@:2}"; }
# healthy <seconds> <tag>: GET /health through Caddy, as a visitor would, answers 200 (Postgres and Redis reachable)
# from the image built from that commit (#201): an old container still answering doesn't count.
healthy() {
  local deadline=$((SECONDS + $1))
  while ((SECONDS < deadline)); do
    curl -sf -m 3 "$SITE/health" | jq -e --arg tag "$2" '.status == "pass" and .version == $tag' >/dev/null &&
      return 0
    sleep 2
  done
  return 1
}
# answers <seconds>: after a switch back, any working build will do. OLD may be :main, whose commit isn't its tag, or
# a build from before /health, which only answers GraphQL.
# shortcut: the GraphQL probe is only for builds from before #201; drop it once none can be switched back to.
answers() {
  local deadline=$((SECONDS + $1))
  while ((SECONDS < deadline)); do
    curl -sf -m 3 "$SITE/health" | jq -e '.status == "pass"' >/dev/null && return 0
    curl -sf -m 3 -X POST "$SITE/graphql" -H 'content-type: application/json' -H 'apollo-require-preflight: true' \
      -d '{"query":"{ __typename }"}' | jq -e '.data.__typename == "Query"' >/dev/null && return 0
    sleep 2
  done
  return 1
}

# On the VM only: the nightly backup (#181), and jq for `healthy`. Terraform doesn't reach a running VM, so each deploy
# keeps this in place.
if [ "$(id -u)" = 0 ] && [ "$DIR" = /opt/travelbliss ]; then
  if ! command -v rclone >/dev/null || ! command -v jq >/dev/null; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq rclone jq >/dev/null
  fi
  echo "30 3 * * * root $DIR/backup.sh backup >>/var/log/travelbliss-backup.log 2>&1" >/etc/cron.d/travelbliss
fi

# Both "Run test" and "Images" trigger the workflow, so the same commit can arrive twice: don't touch a live site
if [ "$FORCE" != --force ] && [ "$NEW" = "$OLD" ] && healthy 10 "$NEW"; then
  echo "== $NEW is already live (run the Deploy workflow manually to redeploy it)"
  exit 0
fi

echo "== Deploying $NEW (running: $OLD)"
# A failed pull stops the deploy: a stale local copy of a moving tag (:main) must never go live as if current.
# TRAVELBLISS_NO_PULL is for test-deploy.sh only, whose test images exist only locally.
if [ -z "${TRAVELBLISS_NO_PULL:-}" ]; then
  compose "$NEW" pull web api
fi
# Migrations only move forward, so a backup comes first and a failed one stops the deploy (#181). Until the VM has an
# rclone remote (a one-time step in the guide, #183), there is nothing to back up to: say so and carry on.
if "$DIR/backup.sh" configured; then
  "$DIR/backup.sh" backup
else
  echo "== WARNING: backups aren't set up on this VM (no rclone remote): migrating without one" >&2
fi
# Before `up`: up replaces the api container before migrate finishes, so a failed migration would take the site down.
# Here it stops the deploy with the old version still serving.
compose "$NEW" run --rm migrate
# A failed `up` can leave the stack half-replaced: don't exit here, switch back below (even if the site answers)
up_ok=true
compose "$NEW" up -d --remove-orphans || up_ok=false

if $up_ok && healthy 60 "$NEW"; then
  echo "$NEW" >.deployed-tag
  echo "== Live: $NEW"
  # Keep the new images and the ones they replaced (and :main, which first boot runs); the disk is small
  stale=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^ghcr.io/zachhung/travelbliss-' |
    grep -vE ":($NEW|$OLD|main)$" || true)
  if [ -n "$stale" ]; then
    # shellcheck disable=SC2086 # one image per word
    docker rmi $stale >/dev/null || echo "== Prune skipped: docker rmi failed (the deploy itself succeeded)" >&2
  fi
  exit 0
fi

if $up_ok; then
  echo "== $NEW didn't answer healthy as itself within 60s; switching back to $OLD" >&2
else
  echo "== up failed for $NEW; switching back to $OLD" >&2
fi
compose "$NEW" logs --tail 50 api >&2 || true
# --no-deps: the old image's migrate must not run against the schema the new one already moved forward.
# The old images now run under this deploy's compose.yml; fine while compose.yml changes stay compatible with them.
compose "$OLD" up -d --no-deps api web
answers 60 && echo "== Back on $OLD" >&2 || echo "== $OLD isn't answering either: check the VM" >&2
exit 1
