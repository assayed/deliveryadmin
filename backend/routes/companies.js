const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router({ mergeParams: true });

function enrichCompany(c) {
  if (!c) return null;
  const zones = db.prepare('SELECT z.* FROM zones z JOIN company_zones cz ON cz.zone_id = z.id WHERE cz.company_id = ?').all(c.id);
  const time_slots = db.prepare('SELECT ts.* FROM time_slots ts JOIN company_time_slots cts ON cts.time_slot_id = ts.id WHERE cts.company_id = ?').all(c.id);
  return { ...c, zones, time_slots };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM companies WHERE tenant_id = ? ORDER BY name_en').all(req.params.tenantId);
  res.json(rows.map(enrichCompany));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM companies WHERE id = ? AND tenant_id = ?').get(req.params.id, req.params.tenantId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(enrichCompany(row));
});

router.post('/', (req, res) => {
  const { name_ar, name_en, contact_person, email, order_price, free_delivery, status, zone_ids, time_slot_ids } = req.body;
  if (!name_ar || !name_en) return res.status(400).json({ error: 'name_ar and name_en required' });
  const id = uuidv4();
  db.prepare('INSERT INTO companies (id, tenant_id, name_ar, name_en, contact_person, email, order_price, free_delivery, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.tenantId, name_ar, name_en, contact_person || null, email || null, order_price || 0, free_delivery ? 1 : 0, status || 'active');
  if (zone_ids?.length) zone_ids.forEach(zid => db.prepare('INSERT OR IGNORE INTO company_zones (company_id, zone_id) VALUES (?, ?)').run(id, zid));
  if (time_slot_ids?.length) time_slot_ids.forEach(tsid => db.prepare('INSERT OR IGNORE INTO company_time_slots (company_id, time_slot_id) VALUES (?, ?)').run(id, tsid));
  res.status(201).json(enrichCompany(db.prepare('SELECT * FROM companies WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const { name_ar, name_en, contact_person, email, order_price, free_delivery, status, zone_ids, time_slot_ids } = req.body;
  db.prepare('UPDATE companies SET name_ar=?, name_en=?, contact_person=?, email=?, order_price=?, free_delivery=?, status=? WHERE id=? AND tenant_id=?')
    .run(name_ar, name_en, contact_person || null, email || null, order_price || 0, free_delivery ? 1 : 0, status || 'active', req.params.id, req.params.tenantId);
  if (zone_ids !== undefined) {
    db.prepare('DELETE FROM company_zones WHERE company_id = ?').run(req.params.id);
    zone_ids.forEach(zid => db.prepare('INSERT OR IGNORE INTO company_zones (company_id, zone_id) VALUES (?, ?)').run(req.params.id, zid));
  }
  if (time_slot_ids !== undefined) {
    db.prepare('DELETE FROM company_time_slots WHERE company_id = ?').run(req.params.id);
    time_slot_ids.forEach(tsid => db.prepare('INSERT OR IGNORE INTO company_time_slots (company_id, time_slot_id) VALUES (?, ?)').run(req.params.id, tsid));
  }
  res.json(enrichCompany(db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM companies WHERE id = ? AND tenant_id = ?').run(req.params.id, req.params.tenantId);
  res.json({ ok: true });
});

module.exports = router;
