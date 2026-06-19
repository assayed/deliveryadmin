const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router({ mergeParams: true });

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, z.name as zone_name FROM branches b
    LEFT JOIN zones z ON z.id = b.zone_id
    WHERE b.tenant_id = ? ORDER BY b.name
  `).all(req.params.tenantId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, address, zone_id } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uuidv4();
  db.prepare('INSERT INTO branches (id, tenant_id, name, address, zone_id) VALUES (?, ?, ?, ?, ?)').run(id, req.params.tenantId, name, address || null, zone_id || null);
  res.status(201).json(db.prepare('SELECT b.*, z.name as zone_name FROM branches b LEFT JOIN zones z ON z.id = b.zone_id WHERE b.id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const { name, address, zone_id, active } = req.body;
  db.prepare('UPDATE branches SET name = ?, address = ?, zone_id = ?, active = ? WHERE id = ? AND tenant_id = ?')
    .run(name, address || null, zone_id || null, active !== undefined ? active : 1, req.params.id, req.params.tenantId);
  res.json(db.prepare('SELECT b.*, z.name as zone_name FROM branches b LEFT JOIN zones z ON z.id = b.zone_id WHERE b.id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM branches WHERE id = ? AND tenant_id = ?').run(req.params.id, req.params.tenantId);
  res.json({ ok: true });
});

module.exports = router;
