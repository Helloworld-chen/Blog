#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1}"
BASIC_USER="${BASIC_USER:-}"
BASIC_PASS="${BASIC_PASS:-}"

auth_args=()
if [[ -n "${BASIC_USER}" || -n "${BASIC_PASS}" ]]; then
  auth_args=(--user "${BASIC_USER}:${BASIC_PASS}")
fi

echo "[smoke] target: ${BASE_URL}"

echo "[smoke] GET /api/health"
curl -fsS "${BASE_URL}/api/health" | sed 's/^/[smoke]   /'

echo "[smoke] GET /api/posts (length)"
posts_count="$(curl -fsS "${BASE_URL}/api/posts" | tr -d '\n' | wc -c | tr -d ' ')"
echo "[smoke]   payload chars: ${posts_count}"

echo "[smoke] GET / (expect 200)"
curl -fsSI "${BASE_URL}/" | head -n 1 | sed 's/^/[smoke]   /'

echo "[smoke] GET /admin (expect 401 if Basic Auth enabled, or 200 if disabled)"
admin_status="$(curl -sS -o /dev/null -w "%{http_code}" "${auth_args[@]}" "${BASE_URL}/admin")"
echo "[smoke]   status: ${admin_status}"

echo "[smoke] done"
