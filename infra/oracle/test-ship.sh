#!/usr/bin/env bash
# Runs ship.sh into a local folder through a stand-in ssh that runs the command with sh, as the VM would (#216).
# Checks contents and modes, that other files survive, and that a dropped connection replaces nothing.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
export TRAVELBLISS_DIR="$WORK/vm"
failures=0

# ssh [-o opt]... <host> <command>: runs <command> here with sh. CUT_AFTER=<bytes> drops the stream after that many
mkdir -p "$WORK/bin"
cat >"$WORK/bin/ssh" <<'EOF'
#!/usr/bin/env bash
while [ "$1" = -o ]; do shift 2; done
shift
if [ -n "${CUT_AFTER:-}" ]; then
  head -c "$CUT_AFTER" | sh -c "$*"
else
  sh -c "$*"
fi
EOF
chmod +x "$WORK/bin/ssh"
export PATH="$WORK/bin:$PATH"

check() {
  if eval "$2"; then
    echo "ok    $1"
  else
    echo "FAIL  $1"
    failures=$((failures + 1))
  fi
}
leftovers() { find "$TRAVELBLISS_DIR" -maxdepth 1 -name '.ship.*' | grep -q .; }

mkdir -p "$TRAVELBLISS_DIR"
echo 'SECRET=keep' >"$TRAVELBLISS_DIR/.env.production"
check 'ship succeeds' "'$HERE/ship.sh' vm"
while read -r file mode; do
  case $file in '' | '#'*) continue ;; esac
  check "$file arrives as in the repo" "cmp -s '$HERE/$file' '$TRAVELBLISS_DIR/$file'"
  check "$file is mode $mode" "[ \"\$(stat -c %a '$TRAVELBLISS_DIR/$file')\" = '${mode#0}' ]"
done <"$HERE/vm-files.txt"
check 'files it does not ship are left alone' "grep -qx SECRET=keep '$TRAVELBLISS_DIR/.env.production'"
check 'no temp folder left behind' '! leftovers'

echo 'old compose' >"$TRAVELBLISS_DIR/compose.yml"
if CUT_AFTER=2048 "$HERE/ship.sh" vm 2>/dev/null; then
  check 'a dropped connection fails the ship' false
else
  check 'a dropped connection fails the ship' true
fi
check 'a dropped connection replaces nothing' "grep -qx 'old compose' '$TRAVELBLISS_DIR/compose.yml'"
check 'a dropped connection leaves no temp folder' '! leftovers'

# main.tf builds a new VM's files from the same list, instead of naming them itself
check 'main.tf reads vm-files.txt' "grep -q 'vm-files.txt' '$HERE/main.tf'"
check 'main.tf names none of its files itself' "! grep -qE '\"/opt/travelbliss/[a-z]+\\.(yml|sh)\"' '$HERE/main.tf'"

if [ "$failures" != 0 ]; then
  echo "$failures failed"
  exit 1
fi
echo "All passed"
