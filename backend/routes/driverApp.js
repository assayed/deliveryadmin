const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireDriver } = require('../middleware/driverAuth');

const router = express.Router();
router.use(requireDriver);

const FAILED_REASONS = ['Customer Unavailable', 'Wrong Address', 'Customer Refused', 'Other'];

// Sequential transitions a driver is allowed to make
const ALLOWED_TRANSITIONS = {
  'Assigned':  ['Picked Up'],
  'Picked Up': ['Delivered', 'Failed'],
};

function enrichOrder(o) {
  if (!o) return null;
  const history = db.prepare('SELECT status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at').all(o.id);
  const zone = o.zone_id ? db.prepare('SELECT id, name FROM zones WHERE id = ?').get(o.zone_id) : null;
  const branch = o.branch_id ? db.prepare('SELECT id, name, address FROM branches WHERE id = ?').get(o.branch_id) : null;
  return { ...o, history, zone, branch };
}

// GET /api/driver/me — driver profile + zone list
router.get('/me', (req, res) => {
  const driver = db.prepare('SELECT id, tenant_id, name, phone, vehicle_type, driver_type, max_concurrent_orders, active, created_at FROM drivers WHERE id = ?').get(req.driver.driver_id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const zones = db.prepare('SELECT z.id, z.name FROM zones z JOIN driver_zones dz ON dz.zone_id = z.id WHERE dz.driver_id = ?').all(driver.id);
  const current_load = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE driver_id = ? AND status IN ('Assigned','Picked Up')`).get(driver.id).c;

  res.json({ ...driver, zones, current_load });
});

// PUT /api/driver/me — update FCM token
router.put('/me', (req, res) => {
  const { fcm_token } = req.body;
  db.prepare('UPDATE drivers SET fcm_token = ? WHERE id = ?').run(fcm_token || null, req.driver.driver_id);
  res.json({ ok: true });
});

// GET /api/driver/orders — active orders assigned to this driver
// ?status=Assigned,Picked Up (comma-separated, defaults to active only)
// ?all=1 to include delivered/failed history
router.get('/orders', (req, res) => {
  const driverId = req.driver.driver_id;
  const includeAll = req.query.all === '1';

  let q = 'SELECT * FROM orders WHERE driver_id = ?';
  const params = [driverId];

  if (!includeAll) {
    q += ` AND status IN ('Assigned','Picked Up')`;
  } else if (req.query.status) {
    const statuses = req.query.status.split(',').map(s => s.trim());
    q += ` AND status IN (${statuses.map(() => '?').join(',')})`;
    params.push(...statuses);
  }

  q += ' ORDER BY updated_at DESC';
  const orders = db.prepare(q).all(...params).map(enrichOrder);
  res.json(orders);
});

// GET /api/driver/orders/:id — single order detail
router.get('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND driver_id = ?').get(req.params.id, req.driver.driver_id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(enrichOrder(order));
});

// POST /api/driver/orders/:id/status — update order status
// Body: { status: 'Picked Up'|'Delivered'|'Failed', failed_reason?, note? }
router.post('/orders/:id/status', (req, res) => {
  const { status, failed_reason, note } = req.body;
  const driverId = req.driver.driver_id;

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND driver_id = ?').get(req.params.id, driverId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed) return res.status(400).json({ error: `Cannot update status from "${order.status}"` });
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Invalid transition: ${order.status} → ${status}. Allowed: ${allowed.join(', ')}` });
  }

  if (status === 'Failed') {
    if (!failed_reason || !FAILED_REASONS.includes(failed_reason)) {
      return res.status(400).json({ error: `failed_reason required. One of: ${FAILED_REASONS.join(', ')}` });
    }
  }

  db.prepare(`UPDATE orders SET status = ?, failed_reason = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(status, failed_reason || null, order.id);
  db.prepare('INSERT INTO order_status_history (id, order_id, status, note) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), order.id, status, note || null);

  res.json(enrichOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id)));
});

// GET /api/driver/history — completed/failed orders (last 30 days)
router.get('/history', (req, res) => {
  const orders = db.prepare(
    `SELECT * FROM orders WHERE driver_id = ? AND status IN ('Delivered','Failed') AND updated_at >= datetime('now','-30 days') ORDER BY updated_at DESC`
  ).all(req.driver.driver_id).map(enrichOrder);
  res.json(orders);
});

// GET /api/driver/notifications
router.get('/notifications', (req, res) => {
  const notes = db.prepare(
    `SELECT n.*, o.order_ref FROM notifications n LEFT JOIN orders o ON o.id = n.order_id WHERE n.driver_id = ? ORDER BY n.created_at DESC LIMIT 50`
  ).all(req.driver.driver_id);
  res.json(notes);
});

// POST /api/driver/notifications/:id/read
router.post('/notifications/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND driver_id = ?').run(req.params.id, req.driver.driver_id);
  res.json({ ok: true });
});

module.exports = router;
