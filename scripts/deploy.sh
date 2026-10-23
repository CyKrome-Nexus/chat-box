#!/usr/bin/env bash
# Triggers the Dokploy rebuild of the API and web app for one environment, then verifies the API restarted.
#
#   scripts/deploy.sh <dev|qa|main>
set -euo pipefail

branch="${1:?branch required}"

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

started_at() {
  curl --silent --max-time 10 "$api_url/health" | sed -n 's/.*"startedAt":"\([^"]*\)".*/\1/p' || true
}

before="$(started_at)"
echo "Triggering Dokploy deploys for $branch"
curl --fail --silent --show-error --request POST "$api_hook" >/dev/null
curl --fail --silent --show-error --request POST "$web_hook" >/dev/null

echo "Waiting for $api_url to restart"
now=""
for _ in $(seq 1 120); do
  now="$(started_at)"
  [ -n "$now" ] && [ "$now" != "$before" ] && break
  sleep 5
done
if [ -z "$now" ] || [ "$now" = "$before" ]; then
  echo "::error::$api_url did not restart within 10 minutes"
  exit 1
fi

status="$(curl --silent --max-time 10 --output /dev/null --write-out '%{http_code}' "$api_url/ready")"
[ "$status" = 200 ] || { echo "::error::$api_url/ready returned HTTP $status"; exit 1; }
echo "Deployed $branch"
