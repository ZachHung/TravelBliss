#!/usr/bin/env python3
"""Keeps real secrets out of the agent's context: blocks reading root/app .env* files (except .env.example, .env.e2e)."""
import json, re, sys

payload = json.load(sys.stdin)
tool, args = payload.get('tool_name', ''), payload.get('tool_input', {})

# A .env file word: `.env` not glued to a name before it (so config.env and block-env-read.py don't count), then any
# name or glob characters: .env, .env.local, .env*, .env.loca[l], against any shell syntax (<.env.x, {.env.x}, `.env.x`).
# Every such word is a real .env file unless it is exactly one of the committed, dummy-value ones. Checking for the
# safe names, not for the dangerous ones, is what keeps globs and new spellings blocked.
ENV_WORD = re.compile(r'(?<![\w.-])\.env[\w.*?\[\]-]*')
SAFE = {'.env.example', '.env.e2e'}

def blocked(text: str) -> bool:
    return any(word not in SAFE for word in ENV_WORD.findall(text))

if tool in ('Read', 'Edit', 'Write', 'NotebookEdit'):
    path = args.get('file_path', '')
    hit = blocked(' ' + path.rsplit('/', 1)[-1])
elif tool == 'Grep':
    hit = blocked(' ' + args.get('path', '')) or blocked(' ' + args.get('glob', ''))
elif tool == 'Bash':
    # Any command that names one: no list of reading commands is complete (tac, jq, vim, tee, xargs, env, ...), and
    # shell joins a name to its reader too many ways (loops, `\` continuations, $(...)). Text that only mentions a
    # .env file goes through a file instead (see the message below).
    hit = blocked(args.get('command', ''))
else:
    hit = False

if hit:
    print(
        'Blocked: .env files hold real secrets. Use .env.example for variable names, or ask the user for a value. '
        'A Bash command may not name one at all. If the name is only text (an issue body, a commit message), write '
        'that text to a file with the Write tool and pass the file (--body-file, git commit -F). To run something '
        'that uses one, use the script that already names it (a pnpm script, infra/oracle/deploy.sh).',
        file=sys.stderr,
    )
    sys.exit(2)
