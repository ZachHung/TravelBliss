#!/usr/bin/env bash
# First boot (cloud-init, as root): host setup (converge.sh), Tailscale (+ Funnel), .env.production, the first-boot
# restore, then the newest main images.
# Written by Terraform: /root/travelbliss.env, /root/travelbliss-secrets.env, and vm-files.txt's files in
# /opt/travelbliss.
# Log: /var/log/cloud-init-output.log
set -euo pipefail
# shellcheck source=/dev/null # written by Terraform, only on the VM
. /root/travelbliss.env
DIR=/opt/travelbliss
cd "$DIR"

echo "== Host setup: swap, Docker, rclone, jq, the backup cron"
# The same step every deploy runs (#217)
./converge.sh

echo "== Tailscale"
command -v tailscale >/dev/null || curl -fsSL https://tailscale.com/install.sh | sh
# --ssh: deploys (#180) and you reach the VM over Tailscale SSH; no port is open to the internet
tailscale up --auth-key="$TS_AUTHKEY" --hostname="$TS_NAME" --advertise-tags=tag:travelbliss --ssh
TS_HOST=$(tailscale status --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')
# Fatal, before anything stores the name: API_PUBLIC_URL, CORS and Google's redirect URI are all built from it, and
# an old '$TS_NAME' machine still in the tailnet makes Tailscale hand out '$TS_NAME-1' instead
case "$TS_HOST" in
  "$TS_NAME".*) ;;
  *)
    echo "ERROR: got $TS_HOST, not $TS_NAME.<tailnet>.ts.net. Delete the old '$TS_NAME' machine in Tailscale, then rebuild." >&2
    exit 1
    ;;
esac

echo "== .env.production"
# Kept on a rebuild that reuses the disk; root only (ADR 0006: secrets exist only on the VM)
if [ ! -f .env.production ]; then
  umask 077
  { cat /root/travelbliss-secrets.env
    echo "API_PUBLIC_URL=https://$TS_HOST"
    echo "API_CORS_ORIGIN=https://$TS_HOST"; } >.env.production
  umask 022
fi

echo "== Funnel (before the app, so networking is done even if a pull fails)"
# shortcut: Funnel may want a one-time approval link on a tailnet that never used it; the guide (#183) covers it
timeout 60 tailscale funnel --bg 8080 || echo "WARNING: tailscale funnel did not finish, see the guide"

echo "== TravelBliss (newest main)"
# :main is the image of the newest commit on main; the deploy (#180) switches to exact commits from then on
export TAG=main
compose() { docker compose --env-file .env.production "$@"; }
compose pull
# The same check each deploy runs (#215): stop here, naming what's missing, rather than migrate with a broken setup
compose run --rm --no-deps api node dist/config/check-env.js
compose up -d --wait db cache
# A rebuilt VM picks up where the old one stopped: the newest backup goes in before migrations run (#181). Once per
# VM (#217), and a VM that can't list its backups stops here rather than start empty: its nightly backups would then
# replace the real ones.
./backup.sh first-boot
# up runs the migrate service first and starts api only once it succeeds (compose.yml). No --wait: older
# Compose releases (Ubuntu's docker-compose-v2) may count migrate's intended exit as a failure.
compose up -d
echo "$TAG" >.deployed-tag

echo "== Done: https://$TS_HOST"
