# CODEX 项目记忆

此文件用于存储稳定、非敏感的上下文信息，供后续会话使用。

## 项目标识
- 项目：`blog-sample`（Tom的个人博客 博客）
- 仓库：`https://github.com/Helloworld-chen/Blog.git`
- 分支：`main`
- 技术栈：`Vue 3 + Vite + Node.js API + Nginx + systemd`

## 负责人偏好
- 在聊天中，优先提供**单行可执行命令**。
- 如必须多行，也要同时提供一行等价命令。
- 每条命令都要附带简短用途说明。
- 学习优先协作：
  - 对实现类需求，在任何代码修改或命令执行前，先给出 `Implementation Path` 和 `Execution Plan`。
  - 重点解释实现方式（文件位置、逻辑流程、技术选型），以便负责人可独立复现。
  - 除非存在影响执行的歧义，否则不重复复述目标/边界。
  - 说明路径与计划后，再执行请求的改动。
- 文档语言偏好：
  - 后续 `.md` 项目说明文档优先使用中文。
  - 涉及命令、路径、环境变量时保留原始英文标识（如 `npm run dev`、`API_PORT`）。

## 服务器访问
- 提供商：阿里云轻量应用服务器
- 地域：香港
- 公网 IP：`8.217.71.211`
- SSH：`ssh admin@8.217.71.211`
- SSH 端口：`22`

## 域名
- 生产：`qpqrstar.com`、`www.qpqrstar.com`
- 预发：`staging.qpqrstar.com`
- 期望 DNS A 记录：
  - `@ -> 8.217.71.211`
  - `www -> 8.217.71.211`
  - `staging -> 8.217.71.211`

## 生产环境
- 应用根目录：`/opt/nebula-notes`
- 静态资源目录：`/var/www/nebula-notes`
- API 环境变量文件：`/etc/nebula-notes/api.env`
- API 服务名：`nebula-api`
- API 端口（内网）：`127.0.0.1:8787`
- 基础认证文件（第 1 层）：`/etc/nginx/.htpasswd`
- API 管理员凭据（第 2 层）：`/etc/nebula-notes/api.env` 中的 `ADMIN_USERNAME`/`ADMIN_PASSWORD`

## 预发环境
- 应用根目录：`/opt/nebula-notes-staging`
- 静态资源目录：`/var/www/nebula-notes-staging`
- API 环境变量文件：`/etc/nebula-notes-staging/api.env`
- API 服务名：`nebula-api-staging`
- API 端口（内网）：`127.0.0.1:8788`
- Nginx 配置：`/etc/nginx/conf.d/staging.qpqrstar.com.conf`
- 基础认证文件（第 1 层）：`/etc/nginx/.htpasswd-staging`
- TLS 证书名：`staging.qpqrstar.com`

## 本地开发
- API 开发：
  - `API_PORT=8787 ADMIN_USERNAME=admin ADMIN_PASSWORD='your-strong-password' npm run api:dev`
- 前端开发：
  - `VITE_POST_SOURCE=api VITE_SHOW_ADMIN_LINK=true npm run dev`
- 本地地址：`http://localhost:5173/`

## 标准部署命令
- 部署到预发（单行）：
  - `cd /opt/nebula-notes-staging && git pull && npm ci && ./deploy/scripts/publish-static.sh /opt/nebula-notes-staging /var/www/nebula-notes-staging && sudo systemctl restart nebula-api-staging`
- 部署到生产（单行）：
  - `cd /opt/nebula-notes && git pull && npm ci && ./deploy/scripts/publish-static.sh /opt/nebula-notes /var/www/nebula-notes && sudo systemctl restart nebula-api && sudo systemctl reload nginx`

## 发布流程（推荐）
1. 在本地开发并测试。
2. 推送代码到 GitHub `main`。
3. 部署到 `staging`。
4. 验证预发 URL 与后台登录。
5. 部署到生产。
6. 执行生产健康检查。

## 验证命令
- 预发：
  - `curl -I https://staging.qpqrstar.com`
  - `curl -fsS https://staging.qpqrstar.com/api/health`
  - `curl -I https://staging.qpqrstar.com/admin`（预期 `401`）
- 生产：
  - `curl -I https://qpqrstar.com`
  - `curl -I https://www.qpqrstar.com`
  - `curl -fsS https://qpqrstar.com/api/health`

## 运维与排障
- API 状态/日志：
  - `sudo systemctl status nebula-api --no-pager`
  - `sudo systemctl status nebula-api-staging --no-pager`
  - `sudo journalctl -u nebula-api -f`
  - `sudo journalctl -u nebula-api-staging -f`
- Nginx：
  - `sudo nginx -t`
  - `sudo systemctl reload nginx`
  - `sudo nginx -T | grep -n "server_name"`
- 防火墙：
  - `sudo ufw status`
- 仅显示管理员用户名（不显示密码）：
  - `sudo grep -E '^ADMIN_USERNAME=' /etc/nebula-notes/api.env`
  - `sudo grep -E '^ADMIN_USERNAME=' /etc/nebula-notes-staging/api.env`

## 凭据管理说明
- 不要在本文件中存储 PAT/密码。
- 若密钥在截图或聊天中泄露，需立即轮换。
- 第 1 层密码重置：
  - 生产：`sudo htpasswd /etc/nginx/.htpasswd <user>`
  - 预发：`sudo htpasswd /etc/nginx/.htpasswd-staging <user>`
- 第 2 层密码重置：
  - 修改环境变量文件中的 `ADMIN_PASSWORD`，然后重启服务。
