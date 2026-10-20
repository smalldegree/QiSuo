# ============================================================
# 系统入口 Portal —— PM2 生态配置
# 用法: pm2 start ecosystem.config.js
# ============================================================

module.exports = {
  apps: [
    {
      name: 'portal-server',
      cwd: '/opt/portal/server',
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_PATH: '/opt/portal/server/entries.db',
      },
      error_file: '/var/log/portal/err.log',
      out_file:   '/var/log/portal/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      watch: false,
    },
  ],
}
