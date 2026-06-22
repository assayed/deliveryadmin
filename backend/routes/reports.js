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

// Best route report per driver
// Returns active drivers with their current Assigned/Picked Up orders
// sorted by nearest-neighbour Haversine from branch/centroid start point
router.get('/routes', (req, res) => {
  const tid = req.params.tenantId;

  const drivers = db.prepare(`
    SELECT d.id, d.name, d.phone, d.vehicle_type,
      b.name as branch_name, b.address as branch_address
    FROM drivers d
    LEFT JOIN branches b ON b.id = (
      SELECT branch_id FROM orders WHERE driver_id = d.id AND status IN ('Assigned','Picked Up') LIMIT 1
    )
    WHERE d.tenant_id = ? AND d.active = 1
  `).all(tid);

  function haversine([lat1, lon1], [lat2, lon2]) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function centroid(coordsJson) {
    try {
      const pts = JSON.parse(coordsJson);
      if (!pts.length) return null;
      return [pts.reduce((s,p)=>s+p[0],0)/pts.length, pts.reduce((s,p)=>s+p[1],0)/pts.length];
    } catch { return null; }
  }

  function nearestNeighbour(orders, start) {
    const remaining = [...orders];
    const sorted = [];
    let current = start;
    while (remaining.length) {
      let best = null, bestDist = Infinity, bestIdx = 0;
      remaining.forEach((o, i) => {
        if (!o._coords) return;
        const d = haversine(current, o._coords);
        if (d < bestDist) { bestDist = d; best = o; bestIdx = i; }
      });
      if (!best) { sorted.push(...remaining); break; }
      sorted.push({ ...best, dist_km: +bestDist.toFixed(2) });
      remaining.splice(bestIdx, 1);
      current = best._coords;
    }
    return sorted;
  }

  const result = drivers.map(driver => {
    const orders = db.prepare(`
      SELECT o.*, z.name as zone_name, z.coordinates
      FROM orders o
      LEFT JOIN zones z ON z.id = o.zone_id
      WHERE o.driver_id = ? AND o.status IN ('Assigned','Picked Up')
      ORDER BY o.created_at
    `).all(driver.id).map(o => ({ ...o, _coords: centroid(o.coordinates) }));

    if (!orders.length) return { ...driver, orders: [], total_distance_km: 0 };

    // Use Riyadh city centre as default start if no branch coords available
    const start = [24.7136, 46.6753];
    const sorted = nearestNeighbour(orders, start);
    const totalDist = sorted.reduce((s, o) => s + (o.dist_km || 0), 0);

    return {
      ...driver,
      order_count: sorted.length,
      total_distance_km: +totalDist.toFixed(2),
      orders: sorted.map(({ _coords, coordinates, ...rest }) => rest),
    };
  }).filter(d => d.order_count > 0);

  res.json(result);
});

module.exports = router;
