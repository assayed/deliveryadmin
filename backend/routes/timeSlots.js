const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router({ mergeParams: true });

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM time_slots WHERE tenant_id = ? ORDER BY day_of_week, start_time').all(req.params.tenantId);
  res.json(rows.map(r => ({ ...r, day_name: DAYS[r.day_of_week] })));
});

router.post('/', (req, res) => {
  const { name, day_of_week, start_time, end_time, active } = req.body;
  if (!name || day_of_week == null || !start_time || !end_time) return res.status(400).json({ error: 'name, day_of_week, start_time, end_time required' });
  if (day_of_week < 0 || day_of_week > 6) return res.status(400).json({ error: 'day_of_week must be 0–6' });
  const id = uuidv4();
  db.prepare('INSERT INTO time_slots (id, tenant_id, name, day_of_week, start_time, end_time, active) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.tenantId, name, day_of_week, start_time, end_time, active !== undefined ? active : 1);
  const row = db.prepare('SELECT * FROM time_slots WHERE id = ?').get(id);
  res.status(201).json({ ...row, day_name: DAYS[row.day_of_week] });
});

router.put('/:id', (req, res) => {
  const { name, day_of_week, start_time, end_time, active } = req.body;
  db.prepare('UPDATE time_slots SET name=?, day_of_week=?, start_time=?, end_time=?, active=? WHERE id=? AND tenant_id=?')
    .run(name, day_of_week, start_time, end_time, active !== undefined ? active : 1, req.params.id, req.params.tenantId);
  const row = db.prepare('SELECT * FROM time_slots WHERE id = ?').get(req.params.id);
  res.json({ ...row, day_name: DAYS[row.day_of_week] });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM time_slots WHERE id = ? AND tenant_id = ?').run(req.params.id, req.params.tenantId);
  res.json({ ok: true });
});

module.exports = router;
