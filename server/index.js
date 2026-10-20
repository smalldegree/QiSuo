const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 统一响应
const ok = (data) => ({ code: 0, data });
const fail = (msg, code = 1) => ({ code, message: msg });

// ---------- REST API ----------

// 列表
app.get('/api/entries', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM entries ORDER BY sort_order ASC, id ASC')
    .all();
  res.json(ok(rows));
});

// 新增
app.post('/api/entries', (req, res) => {
  const { name, url, icon, color, sort_order } = req.body || {};
  if (!name || !url) return res.status(400).json(fail('名称和URL必填'));

  const info = db
    .prepare(
      `INSERT INTO entries (name, url, icon, color, sort_order)
       VALUES (@name, @url, @icon, @color, @sort_order)`
    )
    .run({
      name: String(name).trim(),
      url: String(url).trim(),
      icon: icon || null,
      color: color || null,
      sort_order: Number(sort_order) || 0,
    });

  const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(info.lastInsertRowid);
  res.json(ok(row));
});

// 更新
app.put('/api/entries/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, url, icon, color, sort_order } = req.body || {};

  const exist = db.prepare('SELECT id FROM entries WHERE id = ?').get(id);
  if (!exist) return res.status(404).json(fail('记录不存在'));

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
    name: name != null ? String(name).trim() : null,
    url: url != null ? String(url).trim() : null,
    icon: icon !== undefined ? icon : null,
    color: color !== undefined ? color : null,
    sort_order: sort_order != null ? Number(sort_order) : null,
  });

  const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  res.json(ok(row));
});

// 删除
app.delete('/api/entries/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json(fail('记录不存在'));
  res.json(ok({ id }));
});

// 健康检查
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`[server] 入口服务已启动: http://0.0.0.0:${PORT}`);
});
