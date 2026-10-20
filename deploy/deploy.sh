#!/usr/bin/env bash
# ============================================================
# 一键部署脚本 (Ubuntu 24.04)
# 用法: sudo bash deploy.sh
# ============================================================
set -euo pipefail

APP_DIR=/opt/portal
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "====> 0. 安装系统依赖 (node, pm2, nginx)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
if ! command -v nginx >/dev/null 2>&1; then
  apt-get update && apt-get install -y nginx
fi
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi
mkdir -p /var/log/portal

echo "====> 1. 同步代码"
mkdir -p $APP_DIR
rsync -av --delete \
  --exclude 'web/node_modules' --exclude 'web/dist' \
  --exclude 'server/node_modules' --exclude 'server/*.db*' \
  $PROJECT_DIR/ $APP_DIR/

echo "====> 2. 安装后端依赖"
cd $APP_DIR/server && npm ci --omit=dev

echo "====> 3. 构建前端"
cd $APP_DIR/web && npm ci && npm run build

echo "====> 4. 安装 Nginx 配置"
cp $APP_DIR/deploy/portal.nginx.conf /etc/nginx/sites-available/portal
ln -sf /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/portal
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "====> 5. 启动 PM2"
cd $APP_DIR/deploy
pm2 delete portal-server 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root || true

echo ""
echo "====> ✅ 部署完成"
echo "Nginx 状态:  systemctl status nginx"
echo "PM2 状态:    pm2 status"
echo "后端日志:    pm2 logs portal-server"
echo ""
echo "访问: http://$(hostname -I | awk '{print $1}')"
