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
           # a pipeline is one command: the secrets it prints reach the reader
           bash('cat .env.local | head -3'), bash('docker compose --env-file .env.production config | cat'),
           bash('head -5 < .env.local'), bash('ls; source .env.local'), bash('ls && . .env.local'),
           bash('echo ok\ngrep SECRET apps/api/.env.production')],
    False: [bash('cat .env.example'), bash('cat .env.e2e'), bash('docker compose --env-file .env.e2e up'),
            bash('ls -a'), read('/repo/.env.example'), read('/repo/.env.e2e'),
            # a .env name and a reader in different commands: nothing is read
            bash("docker info | head -1; test -f .env.local && echo present"),
            bash('gh issue create --body "secrets live in .env.production on the VM"\npython3 -c "print(1)"'),
            bash("grep -n deploy AGENTS.md || echo none; ls infra && echo '.env.production is written by Terraform'")],
}
failures = [(want, p) for want, payloads in cases.items() for p in payloads if blocked(p) != want]
for want, p in failures:
    print(f"expected {'blocked' if want else 'allowed'}: {p['tool_input']}")
sys.exit(1 if failures else print(f'{sum(map(len, cases.values()))} cases pass'))
