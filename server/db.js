const Database = require('better-sqlite3'); // 同步 API 的 SQLite 驱动，性能优于 better-sqlite3-async
const path = require('path'); // 用于拼接数据库文件的绝对路径

// 优先读取环境变量 DB_PATH，方便部署时覆盖；否则默认放在当前目录下的 entries.db
const dbPath = process.env.DB_PATH || path.join(__dirname, 'entries.db');
const db = new Database(dbPath); // 同步打开/创建 SQLite 文件，better-sqlite3 的核心 API

// 启用 WAL（Write-Ahead Logging）模式，读写可并发，显著提升多进程/多请求下的性能
db.pragma('journal_mode = WAL');

// 首次启动时建表（IF NOT EXISTS 保证幂等），定义入口表结构
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,   -- 主键，自增
    name      TEXT NOT NULL,                        -- 入口显示名称（必填）
    url       TEXT NOT NULL,                        -- 登录跳转地址（必填）
    icon      TEXT,                                 -- 图标字，留空则前端自动取名称首字
    color     TEXT,                                 -- 入口卡片的渐变背景色
    sort_order INTEGER DEFAULT 0,                   -- 排序权重，值小排前面
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间，SQLite 自动填
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 更新时间，UPDATE 时手动刷新
  );
`);

module.exports = db; // 导出数据库实例，index.js 直接 require 即可复用同一连接
