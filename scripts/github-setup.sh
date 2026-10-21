#!/usr/bin/env bash
# One-time GitHub setup: repository settings, branch rulesets and security options.
# Needs the GitHub CLI (`gh auth login`) and admin rights on the repository.
# Safe to re-run: rulesets are updated by name. DRY_RUN=1 prints the requests without sending them.
#
# Run it AFTER pushing .github/workflows/ci.yml to develop and main: once the rulesets are active,
# nothing can be pushed to those branches except through a pull request.
set -euo pipefail

REPO='repos/{owner}/{repo}' # gh fills in owner and repo from the current clone

send() { # method path [json]
  if [ -n "${DRY_RUN:-}" ]; then
    echo "--- $1 $2"
    if [ $# -gt 2 ]; then printf '%s\n' "$3"; fi
    return 0
  fi
  if [ $# -gt 2 ]; then
    printf '%s' "$3" | gh api --method "$1" "$2" --input - >/dev/null
  else
    gh api --method "$1" "$2" >/dev/null
  fi
  echo "ok: $1 $2"
}

ruleset_json() { # name branch merge_method required_checks_json
  cat <<JSON
{
  "name": "$1",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/$2"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["$3"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": $4 } }
  ]
}
JSON
}

upsert_ruleset() { # name json
  local id=""
  if [ -z "${DRY_RUN:-}" ]; then
    id=$(gh api "$REPO/rulesets" --jq ".[] | select(.name==\"$1\") | .id")
  fi
  if [ -n "$id" ]; then send PUT "$REPO/rulesets/$id" "$2"; else send POST "$REPO/rulesets" "$2"; fi
}

# Repository: develop is the default branch. Both squash and merge commits are allowed here; each
# ruleset below picks one (squash into develop, merge commit into main so that the two branches do
# not diverge after every release). Public repo: secret scanning and push protection are free.
send PATCH "$REPO" '{
  "default_branch": "develop",
  "allow_squash_merge": true,
  "allow_merge_commit": true,
  "allow_rebase_merge": false,
  "delete_branch_on_merge": true,
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}'
send PUT "$REPO/vulnerability-alerts"
send PUT "$REPO/automated-security-fixes"
send PUT "$REPO/actions/permissions/workflow" '{"default_workflow_permissions":"read","can_approve_pull_request_reviews":false}'

# Rulesets: PR required, up-to-date branch, required checks, no force push, no deletion.
upsert_ruleset develop "$(ruleset_json develop develop squash '[{"context":"check"},{"context":"test"}]')"
upsert_ruleset main "$(ruleset_json main main merge '[{"context":"check"},{"context":"test"},{"context":"source-branch"}]')"
