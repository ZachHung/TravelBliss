#!/usr/bin/env python3
"""Run: python3 .claude/hooks/block-env-read.test.py"""
import json, pathlib, subprocess, sys

HOOK = pathlib.Path(__file__).with_name('block-env-read.py')

def blocked(payload: dict) -> bool:
    return subprocess.run([sys.executable, HOOK], input=json.dumps(payload), capture_output=True, text=True).returncode == 2

def bash(command: str) -> dict:
    return {'tool_name': 'Bash', 'tool_input': {'command': command}}

def read(path: str) -> dict:
    return {'tool_name': 'Read', 'tool_input': {'file_path': path}}

cases = {
    True: [bash('cat .env'), bash('cat .env.local'), bash('cat .env.e2e.local'), bash('cat .env.e2e-prod'),
           bash('cat .env.example.local'), bash('grep KEY apps/api/.env.development'), read('/repo/.env.local'),
           read('/repo/.env.e2e.local'),
           bash('cat .env.local | head -3'), bash('docker compose --env-file .env.production config | cat'),
           bash('head -5 < .env.local'), bash('ls; source .env.local'), bash('ls && . .env.local'),
           bash('echo ok\ngrep SECRET apps/api/.env.production'),
           # the name and its reader in different shell words: only a whole-script check sees both
           bash('for f in .env.local; do cat "$f"; done'), bash('cat \\\n.env.local'), bash('f=.env.local; cat "$f"'),
           bash('echo "$(cat "$(ls -a | grep -m1 .env.local)")"'),
           # the name against shell syntax, and reads with no reading command
           bash('cat <.env.local'), bash('cat {.env.local}'), bash('cat {.env.local,.env}'), bash('echo $(<.env.local)'),
           bash('while read l; do echo "$l"; done <.env.local'), bash('mapfile -t lines <.env.local'),
           bash('diff <(sort .env.local) x'), bash('echo `cat .env.local`'), bash('cat .env.local>/tmp/copy'),
           # readers no list would name: any command naming a real .env file is blocked
           bash('tac .env.local'), bash('nl .env.local'), bash('paste .env.local'), bash('tee x < .env.local'),
           bash('jq . .env.local'), bash('vim .env.local'), bash('nano .env.local'), bash('wc -c .env.local'),
           bash('echo .env.local | xargs cat'), bash('env $(xargs < .env.local) printenv'),
           bash('docker compose --env-file .env.production config'),
           # ...including when it is only text: that goes through a file (the block message says how)
           bash('gh issue create --body "secrets live in .env.production"'),
           # globs: only the exact committed names are safe
           bash('cat .env*'), bash('cat .env.*'), bash('cat .env.l*'), bash('cat .env.l?cal'), bash('cat .env.loca[l]'),
           bash('cat apps/api/.env.*'), bash('cat .env.e2e*'), bash('cat .env.e?e'), read('/repo/.env.e2e.local')],
    False: [bash('cat .env.example'), bash('cat .env.e2e'), bash('docker compose --env-file .env.e2e up'),
            bash('ls -a'), read('/repo/.env.example'), read('/repo/.env.e2e'),
            bash("cat > notes.md <<'EOF'\nhello\nEOF"), bash('cat <.env.example'), bash('echo $(<.env.e2e)'),
            bash('pnpm dev:local'), bash('gh issue create --body-file /tmp/body.md'),
            bash('grep -n env AGENTS.md'), bash('ls .claude/hooks/block-env-read.py'),
            # a .env glued to a name before it is some other file
            bash('cat config.env'), bash('source venv/.venv/bin/activate'), bash('cat apps/api/.env.example')],
}
failures = [(want, p) for want, payloads in cases.items() for p in payloads if blocked(p) != want]
for want, p in failures:
    print(f"expected {'blocked' if want else 'allowed'}: {p['tool_input']}")
sys.exit(1 if failures else print(f'{sum(map(len, cases.values()))} cases pass'))
