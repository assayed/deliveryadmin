const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router({ mergeParams: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(__dirname, '../uploads', req.params.orderId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter(req, file, cb) {
  cb(null, /^image\//.test(file.mimetype));
}});

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM order_images WHERE order_id = ? ORDER BY created_at').all(req.params.orderId);
  const images = rows.map(r => ({
    id: r.id,
    url: `/uploads/${req.params.orderId}/${r.filename}`,
    uploaded_by: r.uploaded_by,
    created_at: r.created_at,
  }));
  res.json(images);
});

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image file required' });
  const id = uuidv4();
  const uploadedBy = req.body.uploaded_by || 'admin';
  db.prepare('INSERT INTO order_images (id, order_id, filename, uploaded_by) VALUES (?, ?, ?, ?)')
    .run(id, req.params.orderId, req.file.filename, uploadedBy);
  res.status(201).json({
    id,
    url: `/uploads/${req.params.orderId}/${req.file.filename}`,
    uploaded_by: uploadedBy,
    created_at: new Date().toISOString(),
  });
});

router.delete('/:imageId', (req, res) => {
  const img = db.prepare('SELECT * FROM order_images WHERE id = ? AND order_id = ?').get(req.params.imageId, req.params.orderId);
  if (!img) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(__dirname, '../uploads', req.params.orderId, img.filename);
  try { fs.unlinkSync(filePath); } catch {}
  db.prepare('DELETE FROM order_images WHERE id = ?').run(req.params.imageId);
  res.json({ ok: true });
});

module.exports = router;
