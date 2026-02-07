#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${1:-/opt/nebula-notes}"
ENV_PATH="${2:-/etc/nebula-notes/api.env}"
SERVICE_PATH="/etc/systemd/system/nebula-api.service"

echo "[setup] project root: ${PROJECT_ROOT}"
echo "[setup] env path: ${ENV_PATH}"

if [[ ! -f "${PROJECT_ROOT}/deploy/systemd/nebula-api.service" ]]; then
  echo "[setup] service template not found under ${PROJECT_ROOT}/deploy/systemd"
  exit 1
fi

if [[ ! -f "${ENV_PATH}" ]]; then
  echo "[setup] env file not found: ${ENV_PATH}"
  echo "[setup] copy ${PROJECT_ROOT}/deploy/api.env.example -> ${ENV_PATH} and edit it first"
  exit 1
fi

tmp_file="$(mktemp)"
trap 'rm -f "${tmp_file}"' EXIT

sed "s|WorkingDirectory=/opt/nebula-notes|WorkingDirectory=${PROJECT_ROOT}|g; s|ReadWritePaths=/opt/nebula-notes/public/content /opt/nebula-notes/.runtime|ReadWritePaths=${PROJECT_ROOT}/public/content ${PROJECT_ROOT}/.runtime|g; s|EnvironmentFile=/etc/nebula-notes/api.env|EnvironmentFile=${ENV_PATH}|g" \
  "${PROJECT_ROOT}/deploy/systemd/nebula-api.service" > "${tmp_file}"

sudo install -D -m 0644 "${tmp_file}" "${SERVICE_PATH}"
sudo systemctl daemon-reload
sudo systemctl enable --now nebula-api

echo "[setup] nebula-api service installed and started."
sudo systemctl --no-pager --full status nebula-api | sed -n '1,12p'
