#!/bin/sh
# Writes per-environment runtime config so one image serves dev, qa and production.
set -eu
api_url=$(printf '%s' "${API_URL:-}" | sed 's/[\\"]//g')
printf 'window.__CHATBOX_CONFIG__ = { apiUrl: "%s" };\n' "$api_url" > /usr/share/nginx/html/runtime-config.js
