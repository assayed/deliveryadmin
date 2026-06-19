const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router({ mergeParams: true });

function getDriverWithLoad(driverId, tenantId) {
  const driver = db.prepare(`SELECT * FROM drivers WHERE id = ? AND tenant_id = ?`).get(driverId, tenantId);
  if (!driver) return null;
  const zones = db.prepare(`SELECT z.* FROM zones z JOIN driver_zones dz ON dz.zone_id = z.id WHERE dz.driver_id = ?`).all(driverId);
  const current_load = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE driver_id = ? AND status IN ('Assigned','Picked Up')`).get(driverId).c;
  return { ...driver, zones, current_load };
}

router.get('/', (req, res) => {
  const drivers = db.prepare('SELECT * FROM drivers WHERE tenant_id = ? ORDER BY name').all(req.params.tenantId);
  const result = drivers.map(d => {
    const zones = db.prepare(`SELECT z.* FROM zones z JOIN driver_zones dz ON dz.zone_id = z.id WHERE dz.driver_id = ?`).all(d.id);
    const current_load = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE driver_id = ? AND status IN ('Assigned','Picked Up')`).get(d.id).c;
    return { ...d, zones, current_load };
  });
  res.json(result);
});

router.post('/', (req, res) => {
  const { name, phone, vehicle_type, driver_type, max_concurrent_orders, active, zone_ids } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO drivers (id, tenant_id, name, phone, vehicle_type, driver_type, max_concurrent_orders, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, req.params.tenantId, name, phone, vehicle_type || 'motorcycle', driver_type || 'in-house', max_concurrent_orders || 3, active !== undefined ? active : 1);
  if (zone_ids && zone_ids.length) {
    zone_ids.forEach(zid => db.prepare('INSERT OR IGNORE INTO driver_zones (driver_id, zone_id) VALUES (?, ?)').run(id, zid));
  }
  res.status(201).json(getDriverWithLoad(id, req.params.tenantId));
});

router.put('/:id', (req, res) => {
  const { name, phone, vehicle_type, driver_type, max_concurrent_orders, active, zone_ids } = req.body;
  db.prepare(`UPDATE drivers SET name = ?, phone = ?, vehicle_type = ?, driver_type = ?, max_concurrent_orders = ?, active = ? WHERE id = ? AND tenant_id = ?`)
    .run(name, phone, vehicle_type || 'motorcycle', driver_type || 'in-house', max_concurrent_orders || 3, active !== undefined ? active : 1, req.params.id, req.params.tenantId);
  if (zone_ids !== undefined) {
    db.prepare('DELETE FROM driver_zones WHERE driver_id = ?').run(req.params.id);
    zone_ids.forEach(zid => db.prepare('INSERT OR IGNORE INTO driver_zones (driver_id, zone_id) VALUES (?, ?)').run(req.params.id, zid));
  }
  res.json(getDriverWithLoad(req.params.id, req.params.tenantId));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM drivers WHERE id = ? AND tenant_id = ?').run(req.params.id, req.params.tenantId);
  res.json({ ok: true });
});

module.exports = router;
