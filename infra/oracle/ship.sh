#!/usr/bin/env bash
# ship.sh <ssh-host>: copies the files vm-files.txt lists to the VM's /opt/travelbliss, before each deploy (#216).
# One tar stream into a temp folder there, then each file moved into place: a dropped connection fails the extract
# and replaces nothing, so the VM never runs a half-written compose.yml. Tested by test-ship.sh.
set -euo pipefail
HOST=${1:?usage: ship.sh <ssh-host>}
HERE=$(cd "$(dirname "$0")" && pwd)
# test-ship.sh points this at a local folder
DIR=${TRAVELBLISS_DIR:-/opt/travelbliss}

files=()
modes=()
while read -r file mode; do
  case $file in '' | '#'*) continue ;; esac
  files+=("$file")
  modes+=("$file" "$mode")
done <"$HERE/vm-files.txt"

# Runs on the VM, in plain sh: <dir> then <file> <mode> pairs, the tar stream on stdin. One line, so printf %q
# quotes it with backslashes any shell reads, not bash's $'…'.
# shellcheck disable=SC2016 # expanded there, not here
receive='set -eu; dir=$1; shift; tmp=$(mktemp -d "$dir/.ship.XXXXXX");'
# shellcheck disable=SC2016
receive+=' trap '"'"'rm -rf "$tmp"'"'"' EXIT; tar -xf - -C "$tmp";'
# shellcheck disable=SC2016
receive+=' while [ $# -gt 0 ]; do chmod "$2" "$tmp/$1"; mv -f "$tmp/$1" "$dir/$1"; shift 2; done'

# ssh joins its arguments into one command line, so each is quoted for the remote shell
tar -C "$HERE" -cf - "${files[@]}" |
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 "$HOST" \
    "sh -c $(printf %q "$receive") ship $(printf '%q ' "$DIR" "${modes[@]}")"
