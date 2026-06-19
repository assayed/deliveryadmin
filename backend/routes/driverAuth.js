const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { signToken } = require('../middleware/driverAuth');

const router = express.Router();

// POST /api/driver/auth/request-otp
// Body: { phone, tenant_id }
// Finds driver by phone+tenant, generates 6-digit OTP (valid 10 min)
router.post('/request-otp', (req, res) => {
  const { phone, tenant_id } = req.body;
  if (!phone || !tenant_id) return res.status(400).json({ error: 'phone and tenant_id required' });

  const driver = db.prepare('SELECT * FROM drivers WHERE phone = ? AND tenant_id = ? AND active = 1').get(phone, tenant_id);
  if (!driver) return res.status(404).json({ error: 'Driver not found or inactive' });

  // Invalidate old OTPs for this driver
  db.prepare('UPDATE driver_otps SET used = 1 WHERE driver_id = ?').run(driver.id);

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO driver_otps (id, driver_id, otp, expires_at) VALUES (?, ?, ?, ?)').run(uuidv4(), driver.id, otp, expiresAt);

  // In production: send OTP via SMS. Here we return it directly for dev/testing.
  res.json({
    message: 'OTP sent',
    driver_id: driver.id,
    // Remove `otp` from this response once SMS integration is in place
    otp_dev: otp,
  });
});

// POST /api/driver/auth/verify-otp
// Body: { driver_id, otp }
// Returns JWT token on success
router.post('/verify-otp', (req, res) => {
  const { driver_id, otp } = req.body;
  if (!driver_id || !otp) return res.status(400).json({ error: 'driver_id and otp required' });

  const record = db.prepare(
    `SELECT * FROM driver_otps WHERE driver_id = ? AND otp = ? AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1`
  ).get(driver_id, otp);

  if (!record) return res.status(401).json({ error: 'Invalid or expired OTP' });

  db.prepare('UPDATE driver_otps SET used = 1 WHERE id = ?').run(record.id);

  const driver = db.prepare('SELECT id, tenant_id, name, phone, vehicle_type, driver_type FROM drivers WHERE id = ?').get(driver_id);
  const token = signToken({ driver_id: driver.id, tenant_id: driver.tenant_id });

  res.json({ token, driver });
});

module.exports = router;
