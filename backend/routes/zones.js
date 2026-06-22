const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router({ mergeParams: true });

function enrichZone(z) {
  if (!z) return null;
  const branch = z.branch_id ? db.prepare('SELECT id, name FROM branches WHERE id = ?').get(z.branch_id) : null;
  return { ...z, branch };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM zones WHERE tenant_id = ? ORDER BY name').all(req.params.tenantId);
  res.json(rows.map(enrichZone));
});

router.post('/', (req, res) => {
  const { name, description, coordinates, branch_id, active } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uuidv4();
  db.prepare('INSERT INTO zones (id, tenant_id, name, description, coordinates, branch_id, active) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.tenantId, name, description || null, coordinates ? JSON.stringify(coordinates) : null, branch_id || null, active !== undefined ? active : 1);
  res.status(201).json(enrichZone(db.prepare('SELECT * FROM zones WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const { name, description, coordinates, branch_id, active } = req.body;
  db.prepare('UPDATE zones SET name=?, description=?, coordinates=?, branch_id=?, active=? WHERE id=? AND tenant_id=?')
    .run(name, description || null, coordinates ? JSON.stringify(coordinates) : null, branch_id || null, active !== undefined ? active : 1, req.params.id, req.params.tenantId);
  res.json(enrichZone(db.prepare('SELECT * FROM zones WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM zones WHERE id = ? AND tenant_id = ?').run(req.params.id, req.params.tenantId);
  res.json({ ok: true });
});

module.exports = router;
