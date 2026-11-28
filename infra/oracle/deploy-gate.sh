#!/usr/bin/env bash
# deploy-gate.sh <sha> <event>: should .github/workflows/deploy.yml deploy this commit? Prints the sha when it should,
# nothing when it shouldn't (saying why on stderr). <event> is the run's GITHUB_EVENT_NAME: workflow_run or
# workflow_dispatch. Reads GITHUB_REPOSITORY. Tested by test-deploy-gate.sh with canned API answers (#216).
set -euo pipefail
SHA=${1:?usage: deploy-gate.sh <sha> <event>}
EVENT=${2:?usage: deploy-gate.sh <sha> <event>}
REPO=${GITHUB_REPOSITORY:?}

# The gating workflows, by file. deploy.yml's on.workflow_run lists the same ones by name, as GitHub requires;
# test-deploy-gate.sh fails if the two drift. Infra runs only for a push touching its paths (#213).
GATING=(test_pull_request.yml images.yml infra.yml)
OPTIONAL=infra.yml

# Every GitHub read goes through here: GET <path>, the response as JSON
api() { gh api "$1"; }

skip() {
  echo "Skip: $*" >&2
  exit 0
}

main=$(api "repos/$REPO/commits/main" | jq -r .sha)
[ "$SHA" = "$main" ] || skip "$SHA is no longer the tip of main ($main); its own run deploys that one."

for wf in "${GATING[@]}"; do
  result=$(api "repos/$REPO/actions/workflows/$wf/runs?head_sha=$SHA&event=push&per_page=1" |
    jq -r '.workflow_runs[0] | "\(.status)/\(.conclusion)"')
  # A push creates all its runs at once, so no run means it never will: nothing of the deploy scripts changed
  if [ "$wf" = "$OPTIONAL" ] && [ "$result" = null/null ]; then
    continue
  fi
  case $result in
    completed/success) ;;
    completed/*) skip "$wf is $result for $SHA; not deploying it. Fix and push, or rerun $wf." ;;
    *) skip "$wf is $result for $SHA; its completion triggers this again." ;;
  esac
done

# Each gating workflow triggers a deploy, so a commit usually passes this more than once. Runs queue on deploy.yml's
# concurrency group, so a later one finds the earlier one's success recorded: skip instead of recording another. A
# failed deploy has no success status, so it can be retried. A manual run always deploys (e.g. after the VM was rebuilt,
# or its compose or env changed).
if [ "$EVENT" = workflow_run ]; then
  for id in $(api "repos/$REPO/deployments?environment=production&sha=$SHA" | jq -r '.[].id'); do
    if api "repos/$REPO/deployments/$id/statuses" | jq -e 'any(.[]; .state == "success")' >/dev/null; then
      skip "$SHA is already deployed to production. To redeploy it, run this workflow manually."
    fi
  done
fi

echo "$SHA"
