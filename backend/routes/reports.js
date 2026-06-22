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

// Financial reconciliation report
router.get('/financial', (req, res) => {
  const { company_id, date_from, date_to, format } = req.query;
  const tid = req.params.tenantId;

  let q = `
    SELECT o.id, o.order_ref, o.status, o.free_delivery, o.created_at, o.updated_at,
      d.name as driver_name,
      c.id as company_id, c.name_en as company_name, c.order_price,
      z.name as zone_name,
      ts.name as time_slot_name, ts.start_time, ts.end_time,
      CASE WHEN o.free_delivery = 1 THEN 0 ELSE COALESCE(c.order_price, 0) END as delivery_fee
    FROM orders o
    LEFT JOIN drivers d ON d.id = o.driver_id
    LEFT JOIN companies c ON c.id = d.company_id
    LEFT JOIN zones z ON z.id = o.zone_id
    LEFT JOIN time_slots ts ON ts.id = o.time_slot_id
    WHERE o.tenant_id = ?
  `;
  const params = [tid];
  if (company_id) { q += ' AND c.id = ?'; params.push(company_id); }
  if (date_from)  { q += ' AND o.created_at >= ?'; params.push(date_from); }
  if (date_to)    { q += ' AND o.created_at <= ?'; params.push(date_to + 'T23:59:59'); }
  q += ' ORDER BY o.created_at DESC';

  const rows = db.prepare(q).all(...params);

  const totalFee = rows.reduce((s, r) => s + (r.delivery_fee || 0), 0);
  const totalFree = rows.filter(r => r.free_delivery).length;
  const summary = { total: rows.length, total_fee: +totalFee.toFixed(2), free_count: totalFree };

  if (format === 'csv') {
    const headers = 'Order Ref,Status,Driver,Company,Zone,Time Slot,Date,Delivery Fee,Free Delivery';
    const lines = rows.map(r => [
      r.order_ref, r.status, r.driver_name || '', r.company_name || '',
      r.zone_name || '', r.time_slot_name ? `${r.time_slot_name} ${r.start_time}-${r.end_time}` : '',
      r.created_at?.slice(0,10) || '',
      r.delivery_fee, r.free_delivery ? 'Yes' : 'No'
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="financial-report.csv"');
    return res.send([headers, ...lines].join('\n'));
  }

  res.json({ rows, summary });
});

module.exports = router;
