const express = require('express');
const db = require('../db');
const router = express.Router({ mergeParams: true });

router.get('/', (req, res) => {
  const { order_id, action, date_from, date_to, limit = 200 } = req.query;
  let q = 'SELECT al.*, o.order_ref FROM audit_log al LEFT JOIN orders o ON o.id = al.order_id WHERE al.tenant_id = ?';
  const params = [req.params.tenantId];
  if (order_id) { q += ' AND al.order_id = ?'; params.push(order_id); }
  if (action)   { q += ' AND al.action = ?'; params.push(action); }
  if (date_from){ q += ' AND al.created_at >= ?'; params.push(date_from); }
  if (date_to)  { q += ' AND al.created_at <= ?'; params.push(date_to + 'T23:59:59'); }
  q += ' ORDER BY al.created_at DESC LIMIT ?';
  params.push(Number(limit));
  res.json(db.prepare(q).all(...params));
});

module.exports = router;
