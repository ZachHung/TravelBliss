#!/usr/bin/env bash
# Runs on the VM, as root: deploy.sh <tag>. Copied here with compose.yml by .github/workflows/deploy.yml (#180).
# Migrates with the new image first, switches to it, and switches back if the API doesn't answer (ADR 0006).
set -euo pipefail
NEW=${1:?usage: deploy.sh <tag>}
cd /opt/travelbliss
OLD=$(cat .deployed-tag 2>/dev/null || echo main)
compose() { TAG=$1 docker compose --env-file .env.production "${@:2}"; }
healthy() {
  for _ in $(seq 1 30); do
    curl -sf -X POST http://127.0.0.1:8080/graphql -H 'content-type: application/json' \
      -H 'apollo-require-preflight: true' -d '{"query":"{ __typename }"}' | grep -q '"Query"' && return 0
    sleep 2
  done
  return 1
}

echo "== Deploying $NEW (running: $OLD)"
compose "$NEW" pull web api
# Before `up`: up replaces the api container before migrate finishes, so a failed migration would take the site down.
# Here it stops the deploy with the old version still serving. Migrations only move forward.
compose "$NEW" run --rm migrate
compose "$NEW" up -d --remove-orphans

if healthy; then
  echo "$NEW" >.deployed-tag
  echo "== Live: $NEW"
  # Keep the new and previous images (and :main, which first boot runs) for a switch back; the disk is small
  docker images --format '{{.Repository}}:{{.Tag}}' | grep '^ghcr.io/zachhung/travelbliss-' |
    grep -vE ":($NEW|$OLD|main)$" | xargs -r docker rmi >/dev/null || true
  exit 0
fi

echo "== $NEW didn't answer within 60s; switching back to $OLD" >&2
compose "$NEW" logs --tail 50 api >&2 || true
# --no-deps: the old image's migrate must not run against the schema the new one already moved forward
compose "$OLD" up -d --no-deps api web
healthy && echo "== Back on $OLD" >&2 || echo "== $OLD isn't answering either: check the VM" >&2
exit 1
