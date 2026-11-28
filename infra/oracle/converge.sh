#!/usr/bin/env bash
# converge.sh: the VM's host setup, as root, safe to run again (#217): swap, the packages the stack needs, Docker, and
# the nightly backup's cron line once the VM has restored or served. First boot (bootstrap.sh) and every deploy
# (deploy.sh) run it; Terraform doesn't reach a running VM, so a change here reaches it with the next deploy. Installs
# only what's missing, never upgrades.
set -euo pipefail
DIR=/opt/travelbliss

# The 1 GB micro VM runs out of memory pulling images without it; harmless on ARM
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

# By command, not package: a VM whose Docker came from elsewhere must not get a second one
missing=()
command -v docker >/dev/null || missing+=(docker.io)
docker compose version >/dev/null 2>&1 || missing+=(docker-compose-v2)
command -v rclone >/dev/null || missing+=(rclone) # backups (#181)
command -v jq >/dev/null || missing+=(jq)         # deploy.sh's health check
if [ ${#missing[@]} -gt 0 ]; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${missing[@]}" >/dev/null
fi
systemctl enable --now docker >/dev/null

# Only once the first-boot restore has settled (backup.sh first-boot, or a deploy, marks it): on a new VM that couldn't
# list its backups, a nightly dump of its empty database would become the newest backup, and a rerun would restore it.
# An existing cron line is left alone.
if [ -f "$DIR/.first-boot-restore-done" ]; then
  echo "30 3 * * * root $DIR/backup.sh backup >>/var/log/travelbliss-backup.log 2>&1" >/etc/cron.d/travelbliss
fi
