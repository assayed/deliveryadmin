const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router({ mergeParams: true });

function getDriverWithLoad(driverId, tenantId) {
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ? AND tenant_id = ?').get(driverId, tenantId);
  if (!driver) return null;
  const zones = db.prepare('SELECT z.* FROM zones z JOIN driver_zones dz ON dz.zone_id = z.id WHERE dz.driver_id = ?').all(driverId);
  const time_slots = db.prepare('SELECT ts.* FROM time_slots ts JOIN driver_time_slots dts ON dts.time_slot_id = ts.id WHERE dts.driver_id = ?').all(driverId);
  const company = driver.company_id ? db.prepare('SELECT id, name_en, name_ar FROM companies WHERE id = ?').get(driver.company_id) : null;
  const current_load = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE driver_id = ? AND status IN ('Assigned','Picked Up')`).get(driverId).c;
  return { ...driver, zones, time_slots, company, current_load };
}

router.get('/', (req, res) => {
  const drivers = db.prepare('SELECT * FROM drivers WHERE tenant_id = ? ORDER BY name').all(req.params.tenantId);
  res.json(drivers.map(d => getDriverWithLoad(d.id, req.params.tenantId)));
});

router.post('/', (req, res) => {
  const { name, phone, vehicle_type, driver_type, max_concurrent_orders, active, zone_ids, time_slot_ids, company_id } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
  const id = uuidv4();
  db.prepare('INSERT INTO drivers (id, tenant_id, name, phone, vehicle_type, driver_type, max_concurrent_orders, active, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.tenantId, name, phone, vehicle_type || 'motorcycle', driver_type || 'in-house', max_concurrent_orders || 3, active !== undefined ? active : 1, company_id || null);
  if (zone_ids?.length) zone_ids.forEach(zid => db.prepare('INSERT OR IGNORE INTO driver_zones (driver_id, zone_id) VALUES (?, ?)').run(id, zid));
  if (time_slot_ids?.length) time_slot_ids.forEach(tsid => db.prepare('INSERT OR IGNORE INTO driver_time_slots (driver_id, time_slot_id) VALUES (?, ?)').run(id, tsid));
  res.status(201).json(getDriverWithLoad(id, req.params.tenantId));
});

router.put('/:id', (req, res) => {
  const { name, phone, vehicle_type, driver_type, max_concurrent_orders, active, zone_ids, time_slot_ids, company_id } = req.body;
  db.prepare('UPDATE drivers SET name=?, phone=?, vehicle_type=?, driver_type=?, max_concurrent_orders=?, active=?, company_id=? WHERE id=? AND tenant_id=?')
    .run(name, phone, vehicle_type || 'motorcycle', driver_type || 'in-house', max_concurrent_orders || 3, active !== undefined ? active : 1, company_id || null, req.params.id, req.params.tenantId);
  if (zone_ids !== undefined) {
    db.prepare('DELETE FROM driver_zones WHERE driver_id = ?').run(req.params.id);
    zone_ids.forEach(zid => db.prepare('INSERT OR IGNORE INTO driver_zones (driver_id, zone_id) VALUES (?, ?)').run(req.params.id, zid));
  }
  if (time_slot_ids !== undefined) {
    db.prepare('DELETE FROM driver_time_slots WHERE driver_id = ?').run(req.params.id);
    time_slot_ids.forEach(tsid => db.prepare('INSERT OR IGNORE INTO driver_time_slots (driver_id, time_slot_id) VALUES (?, ?)').run(req.params.id, tsid));
  }
  res.json(getDriverWithLoad(req.params.id, req.params.tenantId));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM drivers WHERE id = ? AND tenant_id = ?').run(req.params.id, req.params.tenantId);
  res.json({ ok: true });
});

module.exports = router;
