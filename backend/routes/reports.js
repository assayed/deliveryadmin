const express = require('express');
const db = require('../db');
const router = express.Router({ mergeParams: true });

router.get('/', (req, res) => {
  const tid = req.params.tenantId;

  const total = db.prepare('SELECT COUNT(*) as c FROM orders WHERE tenant_id = ?').get(tid).c;
  const delivered = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE tenant_id = ? AND status = 'Delivered'`).get(tid).c;
  const failed = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE tenant_id = ? AND status = 'Failed'`).get(tid).c;
  const inProgress = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE tenant_id = ? AND status IN ('Assigned','Picked Up')`).get(tid).c;
  const unassigned = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE tenant_id = ? AND status = 'Unassigned'`).get(tid).c;

  const byDriver = db.prepare(`
    SELECT d.name as driver_name, d.id as driver_id,
      COUNT(o.id) as total,
      SUM(CASE WHEN o.status='Delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN o.status='Failed' THEN 1 ELSE 0 END) as failed
    FROM drivers d
    LEFT JOIN orders o ON o.driver_id = d.id AND o.tenant_id = ?
    WHERE d.tenant_id = ?
    GROUP BY d.id
    ORDER BY delivered DESC
  `).all(tid, tid);

  const byZone = db.prepare(`
    SELECT z.name as zone_name, z.id as zone_id,
      COUNT(o.id) as total,
      SUM(CASE WHEN o.status='Delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN o.status='Failed' THEN 1 ELSE 0 END) as failed
    FROM zones z
    LEFT JOIN orders o ON o.zone_id = z.id AND o.tenant_id = ?
    WHERE z.tenant_id = ?
    GROUP BY z.id
    ORDER BY total DESC
  `).all(tid, tid);

  const failedReasons = db.prepare(`
    SELECT failed_reason, COUNT(*) as count FROM orders
    WHERE tenant_id = ? AND status = 'Failed' AND failed_reason IS NOT NULL
    GROUP BY failed_reason ORDER BY count DESC
  `).all(tid);

  res.json({ summary: { total, delivered, failed, inProgress, unassigned }, byDriver, byZone, failedReasons });
});

module.exports = router;
