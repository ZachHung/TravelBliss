#!/usr/bin/env python3
"""Keeps real secrets out of the agent's context: blocks reading root/app .env* files (except .env.example)."""
import json, re, sys

payload = json.load(sys.stdin)
tool, args = payload.get('tool_name', ''), payload.get('tool_input', {})

# A .env file name: .env, .env.local, .env.development, ... but not .env.example
ENV_FILE = r'(?:^|[\s/\'"=])\.env(?:\.(?!example\b)[\w.-]+)?(?=$|[\s\'";|&)])'
READERS = r'\b(?:cat|head|tail|less|more|bat|grep|rg|ugrep|sed|awk|cut|sort|uniq|diff|xxd|od|strings|base64|cp|source|python3?|node|perl|ruby)\b|(?:^|[;&|]\s*)\.\s'

def blocked(text: str) -> bool:
    return bool(re.search(ENV_FILE, text))

if tool in ('Read', 'Edit', 'Write', 'NotebookEdit'):
    path = args.get('file_path', '')
    hit = blocked(' ' + path.rsplit('/', 1)[-1])
elif tool == 'Grep':
    hit = blocked(' ' + args.get('path', '')) or blocked(' ' + args.get('glob', ''))
elif tool == 'Bash':
    command = args.get('command', '')
    hit = blocked(command) and bool(re.search(READERS, command))
else:
    hit = False

if hit:
    print(
        'Blocked: .env files hold real secrets. Use .env.example for variable names, or ask the user for a value.',
        file=sys.stderr,
    )
    sys.exit(2)
