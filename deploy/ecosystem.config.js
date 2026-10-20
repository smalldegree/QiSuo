// ============================================================
// 系统入口 Portal —— PM2 生态配置
// 用法: pm2 start ecosystem.config.js
// PM2 会据此启动、守护、重启后端进程
// ============================================================

module.exports = {
  apps: [
    {
      name: 'portal-server',                         // PM2 进程名，pm2 list / pm2 logs portal-server 靠它识别
      cwd: '/opt/portal/server',                     // 进程工作目录；脚本路径、相对路径都以这里为基准
      script: 'index.js',                            // 入口脚本，就是 server/index.js（注意 cwd 已经进了 server）
      instances: 1,                                  // 单实例；Express + SQLite 同步 API 不适合多实例，否则锁文件冲突
      exec_mode: 'fork',                             // fork 模式（默认），单进程启动；cluster 模式才会多进程
      max_memory_restart: '200M',                    // 内存超过 200MB 自动重启，防止内存泄漏拖死服务器
      env: {
        NODE_ENV: 'production',                      // 告诉框架当前是生产环境，部分库据此关闭调试
        PORT: 3001,                                  // Express 监听端口，和 vite.config.js 里的代理、Nginx 反代保持一致
        DB_PATH: '/opt/portal/server/entries.db',     // 显式指定 SQLite 文件绝对路径，不依赖默认的 __dirname
      },
      error_file: '/var/log/portal/err.log',         // stderr 重定向到这里，PM2 自己的日志另存
      out_file:   '/var/log/portal/out.log',          // stdout（console.log 等）重定向到这里
      log_date_format: 'YYYY-MM-DD HH:mm:ss',        // 每行日志自动带时间戳，方便排查
      autorestart: true,                              // 进程崩溃后 PM2 自动拉起，守护关键服务
      watch: false,                                   // 不开启文件监听重启；生产环境 watch=false 节省 CPU
    },
  ],
}
