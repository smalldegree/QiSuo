# 栖所 · 个人系统入口导航

> **栖所** / 日常的起承转合 —— 把常进的几个 web 系统入口收在一页，不用再记登录地址。

一个轻量的个人导航页：前端可切换 3 套风格主题，后端 Express + SQLite，生产环境通过 Nginx + PM2 部署到 Ubuntu 24.04。

---

## 特性

- ✅ **卡片化入口** —— 鼠标一点即跳转（新标签页）
- ✅ **完整 CRUD** —— 页面上直接添加 / 编辑 / 删除入口
- ✅ **3 套可切换主题** —— 极光（深空青紫）/ 赛博（荧光绿扫描线）/ 极简（纸面蓝调），持久化到 localStorage
- ✅ **SQLite 持久化** —— 数据保存在文件里，WAL 模式并发友好
- ✅ **生产级部署** —— Nginx 反代 + PM2 守护进程

---

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Node.js 20+ · Express · **better-sqlite3**（同步 API，WAL 模式）|
| 前端 | Vue 3 (`<script setup>`) · Vite 8 · Element Plus · Axios |
| 主题系统 | 纯 CSS 变量 + `<html data-theme="...">` 属性选择器 |
| 数据存储 | SQLite 单文件 `server/entries.db` |
| 生产部署 | Ubuntu 24.04 · Nginx 1.24 · PM2 |

---

## 目录结构

```
portal/
├── server/                      # 后端 (Express + SQLite)
│   ├── db.js                    #   SQLite 连接 & 建表
│   ├── index.js                 #   Express 入口 & REST API
│   ├── package.json
│   └── entries.db               #   首次启动自动生成 (gitignore)
│
├── web/                         # 前端 (Vue3 + Vite + Element Plus)
│   ├── vite.config.js           #   /api → 127.0.0.1:3001 代理
│   ├── index.html
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── main.js              #   注册 Element Plus + 所有图标
│       ├── App.vue              #   主页面：卡片网格 + 新增/编辑 Dialog + 主题切换器
│       ├── style.css            #   3 套主题 Token + 全局样式
│       ├── api/index.js         #   Axios 封装 + 统一响应拦截
│       └── composables/
│           └── useTheme.js      #   主题切换 composable + localStorage 持久化
│
└── deploy/                       # 部署相关
    ├── portal.nginx.conf       #   完整 Nginx 配置（单文件方案）
    ├── portal.nginx.snippet.conf  #  片段方案（接入现有 server 块）
    ├── ecosystem.config.js      #   PM2 守护进程配置
    └── deploy.sh                #   一键部署脚本
```

---

## 数据库结构

首次启动 `server/index.js` 时自动建表，无需手动迁移。

```sql
CREATE TABLE entries (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,           -- 系统名称，如"企业邮箱"
    url          TEXT NOT NULL,           -- 登录地址
    icon         TEXT,                    -- 图标字（1-2 字符），留空取名称首字
    color        TEXT,                    -- 主题色，CSS linear-gradient() 字符串
    sort_order   INTEGER DEFAULT 0,       -- 排序
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## REST API

基础路径 `/api`，统一响应格式 `{ code: 0, data: ... }`（成功）或 `{ code: 1, message: '...' }`（失败）。

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET`    | `/api/entries`          | 列表（按 sort_order, id 升序）|
| `POST`   | `/api/entries`          | 新增，body: `{ name, url, icon?, color?, sort_order? }` |
| `PUT`    | `/api/entries/:id`      | 局部更新，body: 同上（可只传要改的字段）|
| `DELETE` | `/api/entries/:id`      | 删除 |
| `GET`    | `/api/health`           | 健康检查，返回 `{"status":"ok"}` |

---

## 主题系统

3 套风格通过 `<html data-theme="xxx">` 切换，所有视觉变量集中在 `web/src/style.css` 中，组件只消费抽象变量。

| 主题 id | 展示名 | 视觉关键词 |
|---|---|---|
| `aurora`    | 极光  | 深空蓝 + 青紫渐变 + 网格 + 毛玻璃（默认）|
| `cybergrid` | 赛博  | 纯黑 + 荧光绿描边 + 扫描线 + 内发光 |
| `paper`     | 极简  | 浅灰底 + 纯白卡片 + 柔蓝阴影 + 无特效 |

**切换机制**：

```
useTheme() composable
    ├─ 启动时读 localStorage.portal-theme → apply 到 document.documentElement
    ├─ setTheme(id) → 写 data-theme 属性 → CSS 变量联动
    └─ watch → 变化自动持久化回 localStorage
```

**新增一套主题**只需两步（组件代码一行不动）：

1. 在 `style.css` 追加一组 `html[data-theme='xxx'] { --var: value; ... }`
2. 在 `web/src/composables/useTheme.js` 的 `THEMES` 数组加一行

---

## 本地开发

```bash
# 终端 1 —— 后端
cd server
npm install
node index.js                  # http://localhost:3001

# 终端 2 —— 前端
cd web
npm install
npm run dev                    # http://localhost:5173
# Vite 已配置 /api 代理到后端，直接访问前端地址即可
```

**生产构建**：

```bash
cd web
npm run build                  # 产物 → web/dist/
```

---

## 部署：Ubuntu 24.04 + Nginx + PM2

**目标域名 & 端口**：`ecx.fuxi.space:14100`，HTTPS 已有。

### 1. 安装依赖

```bash
# Node.js 20 + Nginx + PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs nginx
npm install -g pm2
```

### 2. 同步代码

```bash
mkdir -p /opt/portal
rsync -av --delete \
  --exclude 'web/node_modules' --exclude 'web/dist' \
  --exclude 'server/node_modules' --exclude 'server/*.db*' \
  ./ /opt/portal/
```

### 3. 后端：PM2 守护

```bash
cd /opt/portal/server
npm ci --omit=dev              # 生产安装（更快更小）
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root   # 开机自启
```

**ecosystem.config.js 关键配置**：

| 项 | 值 |
|---|---|
| 监听端口 | `3001` |
| DB 路径 | `/opt/portal/server/entries.db` |
| 日志 | `/var/log/portal/{out,err}.log` |
| 重启策略 | `autorestart: true`, `max_memory_restart: 200M` |

### 4. 前端：构建静态产物

```bash
cd /opt/portal/web
npm ci
npm run build                  # → web/dist/
```

### 5. Nginx：最小冲击接入

你现有 `server {}` 块里（已配好 `listen 14100 ssl` / `server_name` / `ssl_certificate`），粘贴以下 3 段：

```nginx
    # === Portal 接入片段 ===

    # 前端静态 + SPA 回退
    root /opt/portal/web/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
        location ~* \.(?:css|js|svg|png|jpg|jpeg|gif|ico|webp|woff2?)$ {
            expires 30d; access_log off;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端 API 反代
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout    30s;
    }
```

### 6. 验证

```bash
nginx -t && systemctl reload nginx

# 后端健康检查
curl https://ecx.fuxi.space:14100/api/health
# → {"status":"ok"}

# PM2 状态
pm2 status
# → portal-server  online
```

### 7. 后续更新

```bash
# 代码更新 + 重新构建
rsync -av --delete \
  --exclude 'web/node_modules' --exclude 'web/dist' \
  --exclude 'server/node_modules' --exclude 'server/*.db*' \
  ./ /opt/portal/

cd /opt/portal/server && npm ci --omit=dev && pm2 restart all
cd /opt/portal/web && npm ci && npm run build
# Nginx 无需 reload（静态产物目录不变）
```

---

## 备份 & 迁移

整个应用的**状态都在 SQLite 一个文件里**，迁移极其简单：

```bash
# 备份
scp /opt/portal/server/entries.db user@new-host:/opt/portal/server/

# 新主机启动
pm2 start deploy/ecosystem.config.js
```

---

## 常见问题

| 问题 | 解决 |
|---|---|
| `better-sqlite3` 安装失败 | 需要系统编译工具：`apt-get install -y build-essential python3` |
| 刷新子路由 404 | Nginx `try_files $uri $uri/ /index.html;` 没配对 |
| PM2 日志刷屏 | `pm2 logs portal-server --lines 0` 查看；生产环境降低 `ecosystem.config.js` 中 `out_file` 级别 |
| 主题被重置 | 清空了浏览器 localStorage，或换了浏览器 / 隐身模式 |
| HTTPS 下 API 请求 404 | 确认 Nginx 的 `X-Forwarded-Proto $scheme` 已配 |
