const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router({ mergeParams: true });

const VALID_STATUSES = ['Unassigned', 'Assigned', 'Picked Up', 'Delivered', 'Failed'];
const FAILED_REASONS = ['Customer Unavailable', 'Wrong Address', 'Customer Refused', 'Other'];

function enrichOrder(o) {
  if (!o) return null;
  const history = db.prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at').all(o.id);
  const audit = db.prepare('SELECT * FROM audit_log WHERE order_id = ? ORDER BY created_at').all(o.id);
  const driver = o.driver_id ? db.prepare('SELECT id, name, phone, vehicle_type FROM drivers WHERE id = ?').get(o.driver_id) : null;
  const zone = o.zone_id ? db.prepare('SELECT id, name FROM zones WHERE id = ?').get(o.zone_id) : null;
  const branch = o.branch_id ? db.prepare('SELECT id, name FROM branches WHERE id = ?').get(o.branch_id) : null;
  const time_slot = o.time_slot_id ? db.prepare('SELECT * FROM time_slots WHERE id = ?').get(o.time_slot_id) : null;
  const images = db.prepare('SELECT * FROM order_images WHERE order_id = ? ORDER BY created_at').all(o.id)
    .map(img => ({ ...img, url: `/uploads/${o.id}/${img.filename}` }));
  return { ...o, history, audit, driver, zone, branch, time_slot, images };
}

function writeAudit(tenantId, orderId, action, oldValue, newValue, performedBy = 'admin') {
  db.prepare('INSERT INTO audit_log (id, tenant_id, order_id, action, old_value, new_value, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), tenantId, orderId, action, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, performedBy);
}

router.get('/', (req, res) => {
  const { status, zone_id, branch_id, driver_id, time_slot_id } = req.query;
  let q = 'SELECT * FROM orders WHERE tenant_id = ?';
  const params = [req.params.tenantId];
  if (status)       { q += ' AND status = ?'; params.push(status); }
  if (zone_id)      { q += ' AND zone_id = ?'; params.push(zone_id); }
  if (branch_id)    { q += ' AND branch_id = ?'; params.push(branch_id); }
  if (driver_id)    { q += ' AND driver_id = ?'; params.push(driver_id); }
  if (time_slot_id) { q += ' AND time_slot_id = ?'; params.push(time_slot_id); }
  q += ' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...params).map(enrichOrder));
});

router.post('/', (req, res) => {
  const { order_ref, customer_name, customer_phone, customer_address, zone_id, branch_id, time_slot_id, free_delivery, notes } = req.body;
  if (!order_ref || !customer_name || !customer_phone || !customer_address) {
    return res.status(400).json({ error: 'order_ref, customer_name, customer_phone, customer_address required' });
  }
  const id = uuidv4();
  db.prepare(`INSERT INTO orders (id, tenant_id, order_ref, customer_name, customer_phone, customer_address, zone_id, branch_id, time_slot_id, free_delivery, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.tenantId, order_ref, customer_name, customer_phone, customer_address, zone_id || null, branch_id || null, time_slot_id || null, free_delivery ? 1 : 0, notes || null);
  db.prepare('INSERT INTO order_status_history (id, order_id, status) VALUES (?, ?, ?)').run(uuidv4(), id, 'Unassigned');
  writeAudit(req.params.tenantId, id, 'order_created', null, { order_ref, customer_name, status: 'Unassigned' });
  res.status(201).json(enrichOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const { order_ref, customer_name, customer_phone, customer_address, zone_id, branch_id, time_slot_id, free_delivery, notes } = req.body;
  const old = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  db.prepare(`UPDATE orders SET order_ref=?, customer_name=?, customer_phone=?, customer_address=?, zone_id=?, branch_id=?, time_slot_id=?, free_delivery=?, notes=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?`)
    .run(order_ref, customer_name, customer_phone, customer_address, zone_id || null, branch_id || null, time_slot_id || null, free_delivery ? 1 : 0, notes || null, req.params.id, req.params.tenantId);
  writeAudit(req.params.tenantId, req.params.id, 'order_updated', { order_ref: old.order_ref }, { order_ref });
  res.json(enrichOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)));
});

// Assign driver (Unassigned only)
router.post('/:id/assign', (req, res) => {
  const { driver_id } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(req.params.id, req.params.tenantId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'Unassigned') return res.status(400).json({ error: 'Order is not unassigned' });

  const driver = db.prepare('SELECT * FROM drivers WHERE id = ? AND tenant_id = ? AND active = 1').get(driver_id, req.params.tenantId);
  if (!driver) return res.status(400).json({ error: 'Driver not found or inactive' });

  const current_load = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE driver_id = ? AND status IN ('Assigned','Picked Up')`).get(driver_id).c;
  if (current_load >= driver.max_concurrent_orders) return res.status(400).json({ error: 'Driver at full capacity' });

  const zoneMatch = db.prepare('SELECT 1 FROM driver_zones WHERE driver_id = ? AND zone_id = ?').get(driver_id, order.zone_id);
  if (order.zone_id && !zoneMatch) return res.status(400).json({ error: 'Driver zone does not match order zone' });

  db.prepare(`UPDATE orders SET driver_id=?, status='Assigned', updated_at=datetime('now') WHERE id=?`).run(driver_id, req.params.id);
  db.prepare('INSERT INTO order_status_history (id, order_id, status) VALUES (?, ?, ?)').run(uuidv4(), req.params.id, 'Assigned');
  writeAudit(req.params.tenantId, req.params.id, 'order_assigned', { driver_id: null }, { driver_id, driver_name: driver.name });

  // Notify driver
  db.prepare('INSERT INTO notifications (id, driver_id, type, message, order_id) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), driver_id, 'order_assigned', `New order ${order.order_ref} has been assigned to you`, req.params.id);

  res.json(enrichOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)));
});

// Reassign driver (works on Assigned or Picked Up)
router.post('/:id/reassign', (req, res) => {
  const { driver_id } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(req.params.id, req.params.tenantId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!['Assigned', 'Picked Up'].includes(order.status)) return res.status(400).json({ error: 'Can only reassign Assigned or Picked Up orders' });

  const newDriver = db.prepare('SELECT * FROM drivers WHERE id = ? AND tenant_id = ? AND active = 1').get(driver_id, req.params.tenantId);
  if (!newDriver) return res.status(400).json({ error: 'Driver not found or inactive' });

  const oldDriver = order.driver_id ? db.prepare('SELECT id, name FROM drivers WHERE id = ?').get(order.driver_id) : null;

  db.prepare(`UPDATE orders SET driver_id=?, updated_at=datetime('now') WHERE id=?`).run(driver_id, req.params.id);
  db.prepare('INSERT INTO order_status_history (id, order_id, status, note) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), req.params.id, order.status, `Reassigned from ${oldDriver?.name || 'unknown'} to ${newDriver.name}`);
  writeAudit(req.params.tenantId, req.params.id, 'order_reassigned',
    { driver_id: oldDriver?.id, driver_name: oldDriver?.name },
    { driver_id: newDriver.id, driver_name: newDriver.name });

  // Notify new driver
  db.prepare('INSERT INTO notifications (id, driver_id, type, message, order_id) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), driver_id, 'order_reassigned', `Order ${order.order_ref} has been reassigned to you`, req.params.id);

  res.json(enrichOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)));
});

// Update status
router.post('/:id/status', (req, res) => {
  const { status, failed_reason, note } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (status === 'Failed' && !FAILED_REASONS.includes(failed_reason)) return res.status(400).json({ error: 'failed_reason required for Failed status' });
  const old = db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(req.params.id, req.params.tenantId);
  if (!old) return res.status(404).json({ error: 'Order not found' });
  db.prepare(`UPDATE orders SET status=?, failed_reason=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?`)
    .run(status, failed_reason || null, req.params.id, req.params.tenantId);
  db.prepare('INSERT INTO order_status_history (id, order_id, status, note) VALUES (?, ?, ?, ?)').run(uuidv4(), req.params.id, status, note || null);
  writeAudit(req.params.tenantId, req.params.id, 'status_changed', { status: old.status }, { status, failed_reason: failed_reason || null });
  res.json(enrichOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ? AND tenant_id = ?').run(req.params.id, req.params.tenantId);
  res.json({ ok: true });
});

module.exports = router;
