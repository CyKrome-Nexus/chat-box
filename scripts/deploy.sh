#!/usr/bin/env bash
# Triggers the Dokploy redeploy of the API and web app for one environment, then verifies it.
#
#   scripts/deploy.sh <dev|qa|main> <git sha>
set -euo pipefail

branch="${1:?branch required}"
sha="${2:?git sha required}"

case "$branch" in
  dev)  env=DEV ;;
  qa)   env=QA ;;
  main) env=PRODUCTION ;;
  *) echo "::error::Unknown environment branch '$branch'"; exit 1 ;;
esac

api_hook_var="WEBHOOK_API_$env"; web_hook_var="WEBHOOK_WEB_$env"; api_url_var="API_URL_$env"
api_hook="${!api_hook_var:-}"; web_hook="${!web_hook_var:-}"; api_url="${!api_url_var:-}"
if [ -z "$api_hook" ] || [ -z "$web_hook" ] || [ -z "$api_url" ]; then
  echo "::error::Missing webhook secrets or API_URL_$env for '$branch'"
  exit 1
fi

echo "Triggering Dokploy deploys for $branch"
curl --fail --silent --show-error --request POST "$api_hook" >/dev/null
curl --fail --silent --show-error --request POST "$web_hook" >/dev/null

echo "Waiting for $api_url to report $sha"
live=""
for _ in $(seq 1 60); do
  live="$(curl --silent --max-time 10 "$api_url/health" | sed -n 's/.*"version":"\([0-9a-z]*\)".*/\1/p' || true)"
  [ "$live" = "$sha" ] && break
  sleep 5
done
if [ "$live" != "$sha" ]; then
  echo "::error::$api_url is running '${live:-unknown}', expected '$sha' after 5 minutes"
  exit 1
fi

status="$(curl --silent --max-time 10 --output /dev/null --write-out '%{http_code}' "$api_url/ready")"
[ "$status" = 200 ] || { echo "::error::$api_url/ready returned HTTP $status"; exit 1; }
echo "Deployed $sha to $branch"
