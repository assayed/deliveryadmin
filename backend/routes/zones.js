const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router({ mergeParams: true });

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM zones WHERE tenant_id = ? ORDER BY name').all(req.params.tenantId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uuidv4();
  db.prepare('INSERT INTO zones (id, tenant_id, name, description) VALUES (?, ?, ?, ?)').run(id, req.params.tenantId, name, description || null);
  res.status(201).json(db.prepare('SELECT * FROM zones WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const { name, description, active } = req.body;
  db.prepare('UPDATE zones SET name = ?, description = ?, active = ? WHERE id = ? AND tenant_id = ?')
    .run(name, description || null, active !== undefined ? active : 1, req.params.id, req.params.tenantId);
  res.json(db.prepare('SELECT * FROM zones WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM zones WHERE id = ? AND tenant_id = ?').run(req.params.id, req.params.tenantId);
  res.json({ ok: true });
});

module.exports = router;
