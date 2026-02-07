# Nebula Notes

Vue 3 + Vite 的博客前端示例，支持首页筛选、标签页、文章详情页、关于页与隐藏彩蛋。

## 功能

- 首页：精选内容、关键词搜索、标签筛选、搜索建议、热门标签与最近更新。
- 文章归档页：`/posts` 支持关键词、标签、排序与“加载更多”。
- 文章详情：Markdown 渲染、阅读目录、阅读进度、相关阅读、上一篇/下一篇。
- 标签归档页：按标签聚合并支持二次搜索。
  - 直达规则：访问 `/tags/:tag/:keyword` 时，若在该标签下精确命中标题，则直接打开文章详情。
  - 冲突规则：若同标签下有多篇同名标题，优先打开日期最新的一篇；若未精确命中，则保留在标签页做关键词筛选。
- 关于页与 404 页面。
- 内容管理页：`/admin` 支持两种模式。
  - `local`（默认）：改动保存到浏览器 `localStorage`，仅本机预览。
  - `api`：通过后端 API 登录后发布，写入服务器 `public/content`，访客可实时读取最新内容。
  - 推荐生产环境通过 Nginx Basic Auth 保护 `/admin`，仅站点所有者可访问。
- 首页隐藏彩蛋：键盘连续输入 `lxy` 显示“新年快乐”。

## 技术栈

- Vue 3
- Vue Router
- Vite
- Express
- Vitest
- Playwright

## 本地运行（默认 local 模式）

```bash
npm install
npm run dev
```

默认地址：`http://localhost:5173/`

## 构建与预览

```bash
npm run build
npm run preview
```

## 测试

```bash
npm run test:unit
npm run test:e2e
```

## 内容来源

- 元数据：`public/content/posts.json`
- 正文：`public/content/posts/*.md`
- 数据服务入口：`src/services/postService.js`

## 后端发布模式（api）

### 1) 启动后端 API

```bash
API_PORT=8787 ADMIN_USERNAME=admin ADMIN_PASSWORD='your-strong-password' npm run api:dev
```

### 2) 启动前端（新开终端）

```bash
VITE_POST_SOURCE=api VITE_SHOW_ADMIN_LINK=true npm run dev
```

默认地址：`http://localhost:5173/`  
后台登录页：`http://localhost:5173/admin`

说明：
- `VITE_API_PROXY_TARGET` 默认是 `http://127.0.0.1:8787`（已在 `vite.config.js` 配置）。
- 后端鉴权使用 Cookie 会话，写接口为 `/api/admin/*`。
- 可参考环境变量模板：`.env.api.example`。
- `ADMIN_PASSWORD` 需满足强度要求（至少 12 位，且包含小写/大写/数字/符号中的 3 类）。
- 若未设置 `ADMIN_PASSWORD`，后端会在启动时打印一次性强密码（进程重启后会变化）。
- 会话与管理操作记录默认持久化到 `.runtime/admin`，可用 `ADMIN_DATA_ROOT` 自定义目录。

## 管理页安全

- 导航栏“管理”入口由 `VITE_SHOW_ADMIN_LINK` 控制：
  - 默认不显示（未设置或非 `true`）。
  - 仅在你需要时显示：`VITE_SHOW_ADMIN_LINK=true npm run dev`。
- 生产环境请同时启用 Nginx 对 `/admin` 的鉴权（见下方部署步骤）；仅隐藏入口不等于安全。

## 部署（后端发布模式）

推荐使用“前端静态 + Node API + Nginx 反代 + systemd 守护”。

### 上线前准备清单

- 服务器系统时间正确（NTP 正常）
- 域名已解析到服务器公网 IP
- 已签发 HTTPS 证书（推荐 Let’s Encrypt）
- 开放端口：`80/443`
- 准备强密码 `ADMIN_PASSWORD`（至少 12 位）

### 快速上线流程（Ubuntu 示例）

1. 安装依赖（Node.js 20+、Nginx、Apache 工具用于 htpasswd）
   - `sudo apt update && sudo apt install -y nginx apache2-utils`
2. 部署代码（假设目录 `/opt/nebula-notes`）
   - `cd /opt/nebula-notes && npm ci`
   - `cd /opt/nebula-notes && chmod +x deploy/scripts/preflight.sh`
   - `cd /opt/nebula-notes && ./deploy/scripts/preflight.sh /opt/nebula-notes /opt/nebula-notes/deploy/api.env.example`
3. 构建前端
   - `cd /opt/nebula-notes && chmod +x deploy/scripts/publish-static.sh`
   - `cd /opt/nebula-notes && ./deploy/scripts/publish-static.sh /opt/nebula-notes /var/www/nebula-notes`
4. 发布静态文件
   - 上一步脚本已完成，可跳过手动 `rsync`
5. 配置 Nginx
   - 复制 `deploy/nginx.server.conf` 到 `/etc/nginx/conf.d/default.conf`
   - 生成 Basic Auth 文件：`sudo htpasswd -c /etc/nginx/.htpasswd <your-admin-name>`
   - `sudo nginx -t && sudo systemctl reload nginx`
6. 配置 API 环境变量
   - `sudo mkdir -p /etc/nebula-notes`
   - `sudo cp /opt/nebula-notes/deploy/api.env.example /etc/nebula-notes/api.env`
   - 编辑 `/etc/nebula-notes/api.env`，至少修改 `ADMIN_PASSWORD`
7. 安装并启动 systemd 服务
   - `cd /opt/nebula-notes && chmod +x deploy/scripts/install-systemd.sh`
   - `cd /opt/nebula-notes && ./deploy/scripts/install-systemd.sh /opt/nebula-notes /etc/nebula-notes/api.env`
8. 执行冒烟测试
   - `cd /opt/nebula-notes && chmod +x deploy/scripts/smoke-test.sh`
   - `cd /opt/nebula-notes && ./deploy/scripts/smoke-test.sh https://your-domain.com`

### 运维常用命令

- 查看 API 日志：`sudo journalctl -u nebula-api -f`
- 重启 API：`sudo systemctl restart nebula-api`
- 重载 Nginx：`sudo systemctl reload nginx`
- 再次验证：`./deploy/scripts/smoke-test.sh https://your-domain.com`

### 仅静态部署（无后端发布）

若你只想展示博客、不需要网页后台发布，可继续使用纯静态部署（`VITE_POST_SOURCE=local`）。  
此模式下 `/admin` 仅写本地浏览器 `localStorage`，不会发布到服务器。
