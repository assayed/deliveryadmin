const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM tenants ORDER BY name').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, contact_email, contact_phone } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uuidv4();
  db.prepare('INSERT INTO tenants (id, name, contact_email, contact_phone) VALUES (?, ?, ?, ?)').run(id, name, contact_email || null, contact_phone || null);
  res.status(201).json(db.prepare('SELECT * FROM tenants WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const { name, contact_email, contact_phone, active } = req.body;
  db.prepare('UPDATE tenants SET name = ?, contact_email = ?, contact_phone = ?, active = ? WHERE id = ?')
    .run(name, contact_email || null, contact_phone || null, active !== undefined ? active : 1, req.params.id);
  res.json(db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
