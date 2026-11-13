#!/bin/bash
# AGENTS.md: the package manager is pnpm. Block npm, yarn and npx.
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))')

# Only match at the start of a command or after ; & | ( so "pnpm" and quoted text don't trip it.
if echo "$COMMAND" | grep -Eq '(^|[;&|(])[[:space:]]*(npm|yarn|npx)([[:space:]]|$)'; then
  echo "Blocked: this project uses pnpm. Use pnpm (or pnpm exec / pnpm dlx instead of npx)." >&2
  exit 2
fi

exit 0
