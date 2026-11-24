#!/usr/bin/env bash
# Runs on the VM, as root: deploy.sh <tag>. Copied here with compose.yml by .github/workflows/deploy.yml (#180).
# Migrates with the new image first, switches to it, and switches back if the site doesn't answer (ADR 0006).
set -euo pipefail
NEW=${1:?usage: deploy.sh <tag>}
cd /opt/travelbliss
OLD=$(cat .deployed-tag 2>/dev/null || echo main)
compose() { TAG=$1 docker compose --env-file .env.production "${@:2}"; }
# Through Caddy, as a visitor would: checks web and api together
site_answers() {
  local deadline=$((SECONDS + ${1:-60}))
  while ((SECONDS < deadline)); do
    curl -sf -m 2 -X POST http://127.0.0.1:8080/graphql -H 'content-type: application/json' \
      -H 'apollo-require-preflight: true' -d '{"query":"{ __typename }"}' | grep -q '"Query"' && return 0
    sleep 2
  done
  return 1
}

# Both "Run test" and "Images" trigger the workflow, so the same commit can arrive twice. Deploying it again would
# restart a live site, and make it its own "previous" version, so the real previous images would be pruned.
if [ "$NEW" = "$OLD" ] && site_answers 10; then
  echo "== $NEW is already live"
  exit 0
fi

echo "== Deploying $NEW (running: $OLD)"
compose "$NEW" pull web api
# Before `up`: up replaces the api container before migrate finishes, so a failed migration would take the site down.
# Here it stops the deploy with the old version still serving. Migrations only move forward.
compose "$NEW" run --rm migrate
# A failed `up` can leave the stack half-replaced: don't exit here, switch back below (even if the site answers)
up_ok=true
compose "$NEW" up -d --remove-orphans || up_ok=false

if $up_ok && site_answers; then
  echo "$NEW" >.deployed-tag
  echo "== Live: $NEW"
  # Keep the new and previous images (and :main, which first boot runs) for a switch back; the disk is small
  stale=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^ghcr.io/zachhung/travelbliss-' |
    grep -vE ":($NEW|$OLD|main)$" || true)
  if [ -n "$stale" ]; then
    # shellcheck disable=SC2086 # one image per word
    docker rmi $stale >/dev/null || echo "== Prune skipped: docker rmi failed (the deploy itself succeeded)" >&2
  fi
  exit 0
fi

if $up_ok; then
  echo "== $NEW didn't answer within 60s; switching back to $OLD" >&2
else
  echo "== up failed for $NEW; switching back to $OLD" >&2
fi
compose "$NEW" logs --tail 50 api >&2 || true
# --no-deps: the old image's migrate must not run against the schema the new one already moved forward.
# The old images now run under this deploy's compose.yml; fine while compose.yml changes stay compatible with them.
compose "$OLD" up -d --no-deps api web
site_answers && echo "== Back on $OLD" >&2 || echo "== $OLD isn't answering either: check the VM" >&2
exit 1
