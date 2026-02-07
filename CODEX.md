# CODEX Project Memory

This file stores stable, non-sensitive context for future sessions.

## Project Identity
- Project: `blog-sample` (Nebula Notes blog)
- Repo: `https://github.com/Helloworld-chen/Blog.git`
- Branch: `main`
- Stack: `Vue 3 + Vite + Node.js API + Nginx + systemd`

## Owner Preferences
- In chat, prefer **single-line executable commands**.
- If multi-line is needed, also provide a one-line equivalent.
- Every command should include a short purpose explanation.

## Server Access
- Provider: Alibaba Cloud Lightweight Server
- Region: Hong Kong
- Public IP: `8.217.71.211`
- SSH: `ssh admin@8.217.71.211`
- SSH port: `22`

## Domains
- Production: `qpqrstar.com`, `www.qpqrstar.com`
- Staging: `staging.qpqrstar.com`
- DNS A records expected:
  - `@ -> 8.217.71.211`
  - `www -> 8.217.71.211`
  - `staging -> 8.217.71.211`

## Production Environment
- App root: `/opt/nebula-notes`
- Static root: `/var/www/nebula-notes`
- API env: `/etc/nebula-notes/api.env`
- API service: `nebula-api`
- API port (internal): `127.0.0.1:8787`
- Basic auth file (layer 1): `/etc/nginx/.htpasswd`
- API admin credentials (layer 2): `ADMIN_USERNAME`/`ADMIN_PASSWORD` in `/etc/nebula-notes/api.env`

## Staging Environment
- App root: `/opt/nebula-notes-staging`
- Static root: `/var/www/nebula-notes-staging`
- API env: `/etc/nebula-notes-staging/api.env`
- API service: `nebula-api-staging`
- API port (internal): `127.0.0.1:8788`
- Nginx conf: `/etc/nginx/conf.d/staging.qpqrstar.com.conf`
- Basic auth file (layer 1): `/etc/nginx/.htpasswd-staging`
- TLS cert name: `staging.qpqrstar.com`

## Local Development
- API dev:
  - `API_PORT=8787 ADMIN_USERNAME=admin ADMIN_PASSWORD='your-strong-password' npm run api:dev`
- Frontend dev:
  - `VITE_POST_SOURCE=api VITE_SHOW_ADMIN_LINK=true npm run dev`
- Local URL: `http://localhost:5173/`

## Standard Deploy Commands
- Deploy to staging (one line):
  - `cd /opt/nebula-notes-staging && git pull && npm ci && ./deploy/scripts/publish-static.sh /opt/nebula-notes-staging /var/www/nebula-notes-staging && sudo systemctl restart nebula-api-staging`
- Deploy to production (one line):
  - `cd /opt/nebula-notes && git pull && npm ci && ./deploy/scripts/publish-static.sh /opt/nebula-notes /var/www/nebula-notes && sudo systemctl restart nebula-api && sudo systemctl reload nginx`

## Publish Workflow (Recommended)
1. Develop and test locally.
2. Push code to GitHub `main`.
3. Deploy to `staging`.
4. Validate staging URLs and admin login.
5. Deploy to production.
6. Run production health checks.

## Verification Commands
- Staging:
  - `curl -I https://staging.qpqrstar.com`
  - `curl -fsS https://staging.qpqrstar.com/api/health`
  - `curl -I https://staging.qpqrstar.com/admin` (expect `401`)
- Production:
  - `curl -I https://qpqrstar.com`
  - `curl -I https://www.qpqrstar.com`
  - `curl -fsS https://qpqrstar.com/api/health`

## Operations & Troubleshooting
- API status/logs:
  - `sudo systemctl status nebula-api --no-pager`
  - `sudo systemctl status nebula-api-staging --no-pager`
  - `sudo journalctl -u nebula-api -f`
  - `sudo journalctl -u nebula-api-staging -f`
- Nginx:
  - `sudo nginx -t`
  - `sudo systemctl reload nginx`
  - `sudo nginx -T | grep -n "server_name"`
- Firewall:
  - `sudo ufw status`
- Show admin usernames only (no password):
  - `sudo grep -E '^ADMIN_USERNAME=' /etc/nebula-notes/api.env`
  - `sudo grep -E '^ADMIN_USERNAME=' /etc/nebula-notes-staging/api.env`

## Credential Management Notes
- Do not store PAT/passwords in this file.
- If secrets were exposed in screenshots/chat, rotate immediately.
- Layer 1 password reset:
  - Production: `sudo htpasswd /etc/nginx/.htpasswd <user>`
  - Staging: `sudo htpasswd /etc/nginx/.htpasswd-staging <user>`
- Layer 2 password reset:
  - Edit `ADMIN_PASSWORD` in env file, then restart service.

