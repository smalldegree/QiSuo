const express = require('express'); // Web 框架，提供路由与中间件
const cors = require('cors'); // 跨域中间件，允许前端（不同端口）直接访问 /api
const db = require('./db'); // 复用 db.js 导出的全局 SQLite 连接（better-sqlite3 同步）

const app = express(); // 创建 Express 应用实例
const PORT = process.env.PORT || 3001; // 监听端口，部署时通过 PM2 环境变量覆盖

app.use(cors()); // 挂载 CORS 中间件，放开浏览器跨域限制
app.use(express.json()); // 解析请求体为 JSON，才能读取 req.body 里的字段

// 统一响应结构，前端 Axios 拦截器约定 code=0 为成功
const ok = (data) => ({ code: 0, data });
const fail = (msg, code = 1) => ({ code, message: msg });

// ---------- REST API ----------

// 列表查询：按 sort_order 升序、id 升序返回全部入口（better-sqlite3 的 prepare + all 是同步查询）
app.get('/api/entries', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM entries ORDER BY sort_order ASC, id ASC') // prepare 预编译 SQL，提升重复执行性能
    .all(); // all() 返回所有匹配行的数组
  res.json(ok(rows));
});

// 新增入口：前端提交表单后走这里
app.post('/api/entries', (req, res) => {
  const { name, url, icon, color, sort_order } = req.body || {}; // 解构请求体，空值兜底为空对象
  if (!name || !url) return res.status(400).json(fail('名称和URL必填')); // 必填校验，缺字段直接 400

  // 使用命名参数 @xxx，比 ? 占位符可读性好且避免参数顺序传错
  const info = db
    .prepare(
      `INSERT INTO entries (name, url, icon, color, sort_order)
       VALUES (@name, @url, @icon, @color, @sort_order)`
    )
    .run({
      name: String(name).trim(),       // 强制转字符串并去首尾空格，防止 SQL 类型隐患
      url: String(url).trim(),
      icon: icon || null,              // 空字符串存为 NULL，便于前端区分"未设置"和"设为空"
      color: color || null,
      sort_order: Number(sort_order) || 0, // 非数字兜底为 0
    });

  // run() 返回的 info.lastInsertRowid 是刚插入的主键 id；再查一次返回完整新记录给前端
  const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(info.lastInsertRowid);
  res.json(ok(row));
});

// 更新入口：PUT /api/entries/:id
app.put('/api/entries/:id', (req, res) => {
  const id = Number(req.params.id); // 路由参数 id 默认是字符串，转为数字
  const { name, url, icon, color, sort_order } = req.body || {};

  // 先查一次，确认记录存在；不存在返回 404 避免误更新
  const exist = db.prepare('SELECT id FROM entries WHERE id = ?').get(id);
  if (!exist) return res.status(404).json(fail('记录不存在'));

  // COALESCE(@name, name) 的含义：如果前端传了新值就用新值，否则保留数据库原值
  // updated_at 用 CURRENT_TIMESTAMP 刷新，记录最后修改时间
  db.prepare(
    `UPDATE entries
     SET name       = COALESCE(@name, name),
         url        = COALESCE(@url, url),
         icon       = COALESCE(@icon, icon),
         color      = COALESCE(@color, color),
         sort_order = COALESCE(@sort_order, sort_order),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = @id`
  ).run({
    id,
    // 用 != null 而不是 if (name)，因为允许清空（传空串）但不允许字段缺失
    // 字段缺失时显式传 null，触发 COALESCE 保留原值
    name: name != null ? String(name).trim() : null,
    url: url != null ? String(url).trim() : null,
    icon: icon !== undefined ? icon : null,
    color: color !== undefined ? color : null,
    sort_order: sort_order != null ? Number(sort_order) : null,
  });

  // 更新完再查一次返回最新行，让前端状态与数据库保持一致
  const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  res.json(ok(row));
});

// 删除入口：DELETE /api/entries/:id
app.delete('/api/entries/:id', (req, res) => {
  const id = Number(req.params.id);
  // run() 返回的 info.changes 是受影响的行数；为 0 说明 id 不存在
  const info = db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json(fail('记录不存在'));
  res.json(ok({ id })); // 返回被删 id，前端可用于日志或乐观更新
});

// 健康检查接口，供 PM2 / Nginx / 监控脚本定时探测
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`[server] 入口服务已启动: http://0.0.0.0:${PORT}`); // 0.0.0.0 表示监听所有网卡，Docker/PM2 环境都能访问
});
