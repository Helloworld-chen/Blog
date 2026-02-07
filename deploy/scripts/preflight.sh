#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${1:-$(pwd)}"
ENV_FILE="${2:-${PROJECT_ROOT}/deploy/api.env.example}"

echo "[preflight] project root: ${PROJECT_ROOT}"
echo "[preflight] env file: ${ENV_FILE}"

required_cmds=(node npm rsync curl)
for cmd in "${required_cmds[@]}"; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "[preflight] missing command: ${cmd}"
    exit 1
  fi
done

required_files=(
  "${PROJECT_ROOT}/package.json"
  "${PROJECT_ROOT}/server/index.js"
  "${PROJECT_ROOT}/deploy/nginx.server.conf"
  "${PROJECT_ROOT}/deploy/systemd/nebula-api.service"
)
for f in "${required_files[@]}"; do
  if [[ ! -f "${f}" ]]; then
    echo "[preflight] missing file: ${f}"
    exit 1
  fi
done

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[preflight] env file not found: ${ENV_FILE}"
  exit 1
fi

admin_password="$(grep -E '^ADMIN_PASSWORD=' "${ENV_FILE}" | head -n 1 | cut -d'=' -f2- || true)"
if [[ -z "${admin_password}" ]]; then
  echo "[preflight] ADMIN_PASSWORD is empty in ${ENV_FILE}"
  exit 1
fi

if [[ "${#admin_password}" -lt 12 ]]; then
  echo "[preflight] ADMIN_PASSWORD length must be >= 12"
  exit 1
fi

echo "[preflight] all checks passed"
