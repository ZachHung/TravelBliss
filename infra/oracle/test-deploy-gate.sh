#!/usr/bin/env bash
# Runs deploy-gate.sh against canned GitHub API answers: one case per rule, plus a check that deploy.yml's
# on.workflow_run lists the same workflows as the gate (#216). No network; needs jq and python3 with PyYAML.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
export GITHUB_REPOSITORY=o/r
SHA=abc123
failures=0

# A stand-in for `gh api <path>`: answers from $WORK/api/<path>, or fails as a 404 would
mkdir -p "$WORK/bin"
cat >"$WORK/bin/gh" <<'EOF'
#!/usr/bin/env bash
[ "$1" = api ] || { echo "fake gh: only 'gh api' is supported" >&2; exit 2; }
file="$FAKE_API/$(printf '%s' "$2" | tr '/?&=' '____')"
[ -f "$file" ] || { echo "gh: Not Found (HTTP 404): $2" >&2; exit 1; }
cat "$file"
EOF
chmod +x "$WORK/bin/gh"
export PATH="$WORK/bin:$PATH"
export FAKE_API="$WORK/api"

answer() { mkdir -p "$FAKE_API" && printf '%s' "$2" >"$FAKE_API/$(printf '%s' "$1" | tr '/?&=' '____')"; }
# A fresh API for each case: main's tip is $SHA, the given workflow runs, no deployments
given() {
  rm -rf "$FAKE_API"
  answer "repos/o/r/commits/main" "{\"sha\":\"${TIP:-$SHA}\"}"
  answer "repos/o/r/deployments?environment=production&sha=$SHA" '[]'
  local wf state conclusion
  for wf in test_pull_request.yml images.yml infra.yml; do
    state=${RUNS[$wf]:-none}
    if [ "$state" = none ]; then
      answer "repos/o/r/actions/workflows/$wf/runs?head_sha=$SHA&event=push&per_page=1" '{"workflow_runs":[]}'
    else
      # <status>/<conclusion>; an empty conclusion is null, as for a run still going
      conclusion=null
      if [ -n "${state#*/}" ]; then
        conclusion="\"${state#*/}\""
      fi
      answer "repos/o/r/actions/workflows/$wf/runs?head_sha=$SHA&event=push&per_page=1" \
        "{\"workflow_runs\":[{\"status\":\"${state%/*}\",\"conclusion\":$conclusion}]}"
    fi
  done
}

# case <name> <deploy|skip> <stderr substring> [event]
case_() {
  local name=$1 want=$2 why=$3 event=${4:-workflow_run} out err got
  if ! out=$("$HERE/deploy-gate.sh" "$SHA" "$event" 2>"$WORK/err"); then
    echo "FAIL  $name: exited non-zero: $(cat "$WORK/err")"
    failures=$((failures + 1))
    return
  fi
  err=$(cat "$WORK/err")
  got=$([ "$out" = "$SHA" ] && echo deploy || echo skip)
  if [ "$got" = "$want" ] && [[ $err == *"$why"* ]]; then
    echo "ok    $name"
  else
    echo "FAIL  $name: wanted $want ('$why'), got $got: stdout '$out', stderr '$err'"
    failures=$((failures + 1))
  fi
}

ok=completed/success
declare -A RUNS

RUNS=([test_pull_request.yml]=$ok [images.yml]=$ok)
given && case_ 'no Infra run: deploys' deploy ''
RUNS=([test_pull_request.yml]=$ok [images.yml]=$ok [infra.yml]=$ok)
given && case_ 'all three passed: deploys' deploy ''
RUNS=([test_pull_request.yml]=$ok [images.yml]=$ok [infra.yml]=completed/failure)
given && case_ 'Infra failed: skips' skip 'infra.yml is completed/failure'
RUNS=([test_pull_request.yml]=$ok [images.yml]=$ok [infra.yml]=in_progress/)
given && case_ 'Infra running: waits for it' skip 'its completion triggers this again'
RUNS=([test_pull_request.yml]=in_progress/ [images.yml]=$ok)
given && case_ 'Run test running: waits for it' skip 'test_pull_request.yml is in_progress/null'
RUNS=([images.yml]=$ok)
given && case_ 'no Run test run: skips, it is not optional' skip 'test_pull_request.yml is null/null'
RUNS=([test_pull_request.yml]=$ok [images.yml]=completed/cancelled)
given && case_ 'Images cancelled: skips' skip 'images.yml is completed/cancelled'

RUNS=([test_pull_request.yml]=$ok [images.yml]=$ok)
TIP=def456 given && case_ 'no longer the tip of main: skips' skip 'no longer the tip of main (def456)'

given
answer "repos/o/r/deployments?environment=production&sha=$SHA" '[{"id":7},{"id":8}]'
answer "repos/o/r/deployments/7/statuses" '[{"state":"failure"}]'
answer "repos/o/r/deployments/8/statuses" '[{"state":"success"},{"state":"in_progress"}]'
case_ 'already deployed: skips' skip 'already deployed to production'
case_ 'already deployed, manual run: deploys anyway' deploy '' workflow_dispatch
answer "repos/o/r/deployments/8/statuses" '[{"state":"failure"}]'
case_ 'only failed deployments: retries' deploy ''

# fails <name> <path>: with that one answer missing (an API error), the gate fails the job instead of deciding
fails() {
  given
  answer "repos/o/r/deployments?environment=production&sha=$SHA" '[{"id":7}]'
  answer "repos/o/r/deployments/7/statuses" '[{"state":"failure"}]'
  rm "$FAKE_API/$(printf '%s' "$2" | tr '/?&=' '____')"
  if "$HERE/deploy-gate.sh" "$SHA" workflow_run >/dev/null 2>&1; then
    echo "FAIL  $1: should fail the job, not deploy or skip"
    failures=$((failures + 1))
  else
    echo "ok    $1: fails the job"
  fi
}
RUNS=([test_pull_request.yml]=$ok [images.yml]=$ok)
fails 'main unreadable' "repos/o/r/commits/main"
fails 'a workflow run unreadable' "repos/o/r/actions/workflows/images.yml/runs?head_sha=$SHA&event=push&per_page=1"
fails 'deployments unreadable' "repos/o/r/deployments?environment=production&sha=$SHA"
fails 'a deployment status unreadable' "repos/o/r/deployments/7/statuses"

# deploy.yml triggers on workflow names, the gate checks files: the same workflows, in both
read -ra gating <<<"$(sed -n 's/^GATING=(\(.*\))$/\1/p' "$HERE/deploy-gate.sh")"
if python3 - "$ROOT" "${gating[@]}" <<'EOF'
import sys, yaml
root, files = sys.argv[1], sys.argv[2:]
wf = f"{root}/.github/workflows"
# PyYAML reads the bare key `on` as True
triggers = yaml.safe_load(open(f"{wf}/deploy.yml"))[True]["workflow_run"]["workflows"]
names = [yaml.safe_load(open(f"{wf}/{f}"))["name"] for f in files]
if sorted(triggers) != sorted(names):
    sys.exit(f"deploy.yml triggers on {triggers}, deploy-gate.sh checks {dict(zip(files, names))}")
EOF
then
  echo "ok    deploy.yml's triggers match the gate's workflows"
else
  echo "FAIL  deploy.yml's triggers and the gate's workflows differ"
  failures=$((failures + 1))
fi

if [ "$failures" != 0 ]; then
  echo "$failures failed"
  exit 1
fi
echo "All passed"
