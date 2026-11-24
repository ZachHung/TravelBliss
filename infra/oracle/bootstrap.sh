#!/usr/bin/env bash
# First boot (cloud-init, as root): swap, Docker, Tailscale (+ Funnel), .env.production, then the newest main images.
# Written by Terraform: /root/travelbliss.env, /root/travelbliss-secrets.env, /opt/travelbliss/compose.yml.
# Log: /var/log/cloud-init-output.log
set -euo pipefail
# shellcheck source=/dev/null # written by Terraform, only on the VM
. /root/travelbliss.env
DIR=/opt/travelbliss
cd "$DIR"

echo "== Swap"
# The 1 GB micro VM runs out of memory pulling images without it; harmless on ARM
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

echo "== Docker"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2
systemctl enable --now docker

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
# up runs the migrate service first and starts api only once it succeeds (compose.yml). No --wait: older
# Compose releases (Ubuntu's docker-compose-v2) may count migrate's intended exit as a failure.
compose up -d
echo "$TAG" >.deployed-tag

echo "== Done: https://$TS_HOST"
