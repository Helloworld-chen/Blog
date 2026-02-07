#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${1:-/opt/nebula-notes}"
WWW_ROOT="${2:-/var/www/nebula-notes}"

echo "[publish] project root: ${PROJECT_ROOT}"
echo "[publish] target root: ${WWW_ROOT}"

cd "${PROJECT_ROOT}"
VITE_POST_SOURCE=api npm run build

sudo mkdir -p "${WWW_ROOT}"
sudo rsync -a --delete "${PROJECT_ROOT}/dist/" "${WWW_ROOT}/"

echo "[publish] static files synced to ${WWW_ROOT}"
