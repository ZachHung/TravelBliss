#!/usr/bin/env python3
"""Keeps real secrets out of the agent's context: blocks reading root/app .env* files (except .env.example, .env.e2e)."""
import json, re, sys

payload = json.load(sys.stdin)
tool, args = payload.get('tool_name', ''), payload.get('tool_input', {})

# A .env file name: .env, .env.local, .env.development, ... but not .env.example or .env.e2e (committed, dummy values).
# The exclusions must end where the name ends, or .env.e2e.local would slip through. A name can sit against shell
# syntax on either side: <.env.x, $(<.env.x), {.env.x}, `.env.x`, (.env.x), .env.x>out.
END = r'(?=$|[\s\'";|&()<>{},`])'
ENV_FILE = rf'(?:^|[\s/\'"=<>(){{}},`])\.env(?:\.(?!(?:example|e2e){END})[\w.-]+)?{END}'

def blocked(text: str) -> bool:
    return bool(re.search(ENV_FILE, text))

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
