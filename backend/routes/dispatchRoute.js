const express = require('express');
const db = require('../db');
const router = express.Router({ mergeParams: true });

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function zoneCentroid(coordinates) {
  if (!coordinates) return null;
  try {
    const coords = JSON.parse(coordinates);
    const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const lng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    return { lat, lng };
  } catch { return null; }
}

// POST /api/tenants/:tenantId/dispatch/route
// Body: { driver_id, order_ids: [], start_lat, start_lng }
router.post('/route', (req, res) => {
  const { driver_id, order_ids, start_lat, start_lng } = req.body;
  if (!order_ids?.length) return res.status(400).json({ error: 'order_ids required' });

  const orders = order_ids.map(id => {
    const o = db.prepare('SELECT o.*, z.name as zone_name, z.coordinates FROM orders o LEFT JOIN zones z ON z.id = o.zone_id WHERE o.id = ? AND o.tenant_id = ?').get(id, req.params.tenantId);
    if (!o) return null;
    const ts = o.time_slot_id ? db.prepare('SELECT * FROM time_slots WHERE id = ?').get(o.time_slot_id) : null;
    const centroid = zoneCentroid(o.coordinates);
    return { ...o, time_slot: ts, centroid };
  }).filter(Boolean);

  // Nearest-neighbor sort from start point
  const startLat = parseFloat(start_lat) || 24.7136;
  const startLng = parseFloat(start_lng) || 46.6753;

  const sorted = [];
  const remaining = [...orders];
  let curLat = startLat, curLng = startLng;

  while (remaining.length > 0) {
    let nearest = 0, minDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i].centroid;
      if (!c) continue;
      const d = haversine(curLat, curLng, c.lat, c.lng);
      if (d < minDist) { minDist = d; nearest = i; }
    }
    const picked = remaining.splice(nearest, 1)[0];
    sorted.push({ ...picked, sequence: sorted.length + 1, distance_km: minDist === Infinity ? null : +minDist.toFixed(2) });
    if (picked.centroid) { curLat = picked.centroid.lat; curLng = picked.centroid.lng; }
  }

  res.json({ driver_id, start: { lat: startLat, lng: startLng }, orders: sorted });
});

module.exports = router;
