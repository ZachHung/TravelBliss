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
# A read: a reading command, sourcing, the read/mapfile builtins, or input redirection (`<`, `$(<…)`, `<(…)`). A
# heredoc (`<<`) is not a read of a file.
READERS = (
    r'\b(?:cat|head|tail|less|more|bat|grep|rg|ugrep|sed|awk|cut|sort|uniq|diff|xxd|od|strings|base64|cp|source'
    r'|python3?|node|perl|ruby|read|mapfile|readarray)\b|(?:^|[;&|]\s*)\.\s|(?<!<)<(?!<)'
)

def blocked(text: str) -> bool:
    return bool(re.search(ENV_FILE, text))

if tool in ('Read', 'Edit', 'Write', 'NotebookEdit'):
    path = args.get('file_path', '')
    hit = blocked(' ' + path.rsplit('/', 1)[-1])
elif tool == 'Grep':
    hit = blocked(' ' + args.get('path', '')) or blocked(' ' + args.get('glob', ''))
elif tool == 'Bash':
    # The whole script, not each command: shell joins a name to its reader too many ways (a loop variable, `\`
    # continuations, $(...)). So a .env name that is only text next to any reader word is blocked too (see below).
    command = args.get('command', '')
    hit = blocked(command) and bool(re.search(READERS, command))
else:
    hit = False

if hit:
    print(
        'Blocked: .env files hold real secrets. Use .env.example for variable names, or ask the user for a value. '
        'If the .env name is only text (an issue body, a commit message, a comment), write that text to a file with '
        'the Write tool and pass the file instead (--body-file, git commit -F).',
        file=sys.stderr,
    )
    sys.exit(2)
