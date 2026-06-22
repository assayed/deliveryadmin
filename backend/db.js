const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'fodek.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- Driver OTP sessions
  CREATE TABLE IF NOT EXISTS driver_otps (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    otp TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Tenants (clients)
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Delivery zones (polygons) per tenant
  CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Branches per tenant
  CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    zone_id TEXT REFERENCES zones(id),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Drivers per tenant
  CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'motorcycle',
    driver_type TEXT NOT NULL DEFAULT 'in-house',
    max_concurrent_orders INTEGER NOT NULL DEFAULT 3,
    active INTEGER NOT NULL DEFAULT 1,
    fcm_token TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Driver-Zone assignments (many-to-many)
  CREATE TABLE IF NOT EXISTS driver_zones (
    driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    PRIMARY KEY (driver_id, zone_id)
  );

  -- Orders per tenant
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_ref TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    zone_id TEXT REFERENCES zones(id),
    branch_id TEXT REFERENCES branches(id),
    driver_id TEXT REFERENCES drivers(id),
    status TEXT NOT NULL DEFAULT 'Unassigned',
    failed_reason TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Order status history
  CREATE TABLE IF NOT EXISTS order_status_history (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed demo data if empty
const tenantCount = db.prepare('SELECT COUNT(*) as c FROM tenants').get().c;
if (tenantCount === 0) {
  const { v4: uuidv4 } = require('uuid');

  // ── Single FODEK tenant ──
  const t1 = uuidv4();
  db.prepare(`INSERT INTO tenants (id, name, contact_email, contact_phone) VALUES (?, ?, ?, ?)`).run(t1, 'FODEK', 'ops@fodek.sa', '+966501111111');

  // ── 5 Zones ──
  const z1 = uuidv4(), z2 = uuidv4(), z3 = uuidv4(), z4 = uuidv4(), z5 = uuidv4();
  db.prepare(`INSERT INTO zones (id, tenant_id, name, description) VALUES (?, ?, ?, ?)`).run(z1, t1, 'North Riyadh',   'Covers north districts — Al-Nakheel, Al-Malqa');
  db.prepare(`INSERT INTO zones (id, tenant_id, name, description) VALUES (?, ?, ?, ?)`).run(z2, t1, 'South Riyadh',   'Covers south districts — Al-Shifa, Al-Badiah');
  db.prepare(`INSERT INTO zones (id, tenant_id, name, description) VALUES (?, ?, ?, ?)`).run(z3, t1, 'East Riyadh',    'Covers eastern side — Al-Ruwais, Al-Naseem');
  db.prepare(`INSERT INTO zones (id, tenant_id, name, description) VALUES (?, ?, ?, ?)`).run(z4, t1, 'West Riyadh',    'Covers western side — Al-Sulimaniyah, Al-Wurud');
  db.prepare(`INSERT INTO zones (id, tenant_id, name, description) VALUES (?, ?, ?, ?)`).run(z5, t1, 'Central Riyadh', 'City centre — Al-Olaya, Al-Murabba');

  // ── 4 Branches ──
  const b1 = uuidv4(), b2 = uuidv4(), b3 = uuidv4(), b4 = uuidv4();
  db.prepare(`INSERT INTO branches (id, tenant_id, name, address, zone_id) VALUES (?, ?, ?, ?, ?)`).run(b1, t1, 'Main Hub',      'King Fahd Rd, Al-Olaya',        z5);
  db.prepare(`INSERT INTO branches (id, tenant_id, name, address, zone_id) VALUES (?, ?, ?, ?, ?)`).run(b2, t1, 'North Branch',  'Prince Turki St, Al-Malqa',     z1);
  db.prepare(`INSERT INTO branches (id, tenant_id, name, address, zone_id) VALUES (?, ?, ?, ?, ?)`).run(b3, t1, 'South Branch',  'Ring Rd South, Al-Shifa',       z2);
  db.prepare(`INSERT INTO branches (id, tenant_id, name, address, zone_id) VALUES (?, ?, ?, ?, ?)`).run(b4, t1, 'East Branch',   'Al-Naseem District, East Rd',   z3);

  // ── 8 Drivers ──
  const d1 = uuidv4(), d2 = uuidv4(), d3 = uuidv4(), d4 = uuidv4();
  const d5 = uuidv4(), d6 = uuidv4(), d7 = uuidv4(), d8 = uuidv4();
  const ins = db.prepare(`INSERT INTO drivers (id, tenant_id, name, phone, vehicle_type, driver_type, max_concurrent_orders, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  ins.run(d1, t1, 'Ahmed Al-Rashidi',   '+966511000001', 'motorcycle', 'in-house', 4, 1);
  ins.run(d2, t1, 'Faisal Al-Mutairi',  '+966511000002', 'car',        'in-house', 3, 1);
  ins.run(d3, t1, 'Omar Khaled',         '+966511000003', 'motorcycle', 'hybrid',   3, 1);
  ins.run(d4, t1, 'Yusuf Al-Ghamdi',    '+966511000004', 'motorcycle', 'in-house', 4, 1);
  ins.run(d5, t1, 'Khalid Al-Zahrani',  '+966511000005', 'van',        'in-house', 5, 1);
  ins.run(d6, t1, 'Tariq Al-Harbi',     '+966511000006', 'motorcycle', 'hybrid',   3, 1);
  ins.run(d7, t1, 'Saad Al-Qahtani',    '+966511000007', 'car',        'in-house', 3, 0);
  ins.run(d8, t1, 'Nawaf Al-Shehri',    '+966511000008', 'motorcycle', 'in-house', 4, 1);

  // ── Driver zone assignments ──
  const dz = db.prepare('INSERT OR IGNORE INTO driver_zones (driver_id, zone_id) VALUES (?, ?)');
  dz.run(d1, z1); dz.run(d1, z5);
  dz.run(d2, z1); dz.run(d2, z2);
  dz.run(d3, z2); dz.run(d3, z3);
  dz.run(d4, z3); dz.run(d4, z4);
  dz.run(d5, z4); dz.run(d5, z5);
  dz.run(d6, z5); dz.run(d6, z1);
  dz.run(d7, z2);
  dz.run(d8, z3); dz.run(d8, z4);

  // ── Helper to insert order + history ──
  const insOrder = db.prepare(`INSERT INTO orders (id, tenant_id, order_ref, customer_name, customer_phone, customer_address, zone_id, branch_id, driver_id, status, failed_reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insHist  = db.prepare('INSERT INTO order_status_history (id, order_id, status, note) VALUES (?, ?, ?, ?)');

  function addOrder(ref, customer, phone, address, zone, branch, driver, status, failedReason, notes, history) {
    const oid = uuidv4();
    insOrder.run(oid, t1, ref, customer, phone, address, zone, branch, driver, status, failedReason || null, notes || null);
    for (const [st, note] of history) insHist.run(uuidv4(), oid, st, note || null);
    return oid;
  }

  // ── Unassigned orders (8) — ready for dispatch ──
  addOrder('ORD-2001', 'Mohammed Al-Otaibi',  '+966512001001', 'Al-Nakheel St 12, North Riyadh',   z1, b2, null, 'Unassigned', null, '2 boxes fragile', [['Unassigned', null]]);
  addOrder('ORD-2002', 'Sara Al-Dosari',       '+966512001002', 'Al-Badiah District, South Riyadh', z2, b3, null, 'Unassigned', null, 'Leave at door',   [['Unassigned', null]]);
  addOrder('ORD-2003', 'Abdullah Al-Amri',     '+966512001003', 'Al-Naseem Rd 5, East Riyadh',      z3, b4, null, 'Unassigned', null, null,              [['Unassigned', null]]);
  addOrder('ORD-2004', 'Nora Al-Shammari',     '+966512001004', 'Al-Wurud Block 3, West Riyadh',    z4, b1, null, 'Unassigned', null, 'Call on arrival', [['Unassigned', null]]);
  addOrder('ORD-2005', 'Khalid Al-Bishi',      '+966512001005', 'Olaya Tower B, Central Riyadh',    z5, b1, null, 'Unassigned', null, null,              [['Unassigned', null]]);
  addOrder('ORD-2006', 'Hessa Al-Tamimi',      '+966512001006', 'Al-Malqa Villa 9, North Riyadh',   z1, b2, null, 'Unassigned', null, 'Fragile — glass', [['Unassigned', null]]);
  addOrder('ORD-2007', 'Turki Al-Subaie',      '+966512001007', 'Al-Shifa St 44, South Riyadh',     z2, b3, null, 'Unassigned', null, null,              [['Unassigned', null]]);
  addOrder('ORD-2008', 'Reem Al-Zahrani',      '+966512001008', 'Al-Ruwais District, East Riyadh',  z3, b4, null, 'Unassigned', null, '3 packages',      [['Unassigned', null]]);

  // ── Assigned orders (6) ──
  addOrder('ORD-2009', 'Saad Al-Enezi',        '+966512002001', 'Prince Sultan Rd, Central',        z5, b1, d1, 'Assigned', null, null,           [['Unassigned', null], ['Assigned', 'Dispatched to Ahmed']]);
  addOrder('ORD-2010', 'Lama Al-Ghamdi',       '+966512002002', 'Al-Nakheel Park Rd, North',        z1, b2, d6, 'Assigned', null, 'Signature req', [['Unassigned', null], ['Assigned', 'Dispatched to Tariq']]);
  addOrder('ORD-2011', 'Fahad Al-Rasheed',     '+966512002003', 'Al-Badiah St 7, South',            z2, b3, d2, 'Assigned', null, null,           [['Unassigned', null], ['Assigned', 'Dispatched to Faisal']]);
  addOrder('ORD-2012', 'Mona Al-Saud',         '+966512002004', 'East Ring Rd Apt 4, East',         z3, b4, d3, 'Assigned', null, null,           [['Unassigned', null], ['Assigned', 'Dispatched to Omar']]);
  addOrder('ORD-2013', 'Bandar Al-Harbi',      '+966512002005', 'Al-Sulimaniyah Blvd, West',        z4, b1, d4, 'Assigned', null, null,           [['Unassigned', null], ['Assigned', 'Dispatched to Yusuf']]);
  addOrder('ORD-2014', 'Dina Al-Qahtani',      '+966512002006', 'Olaya Main St, Central',           z5, b1, d5, 'Assigned', null, 'Heavy item',   [['Unassigned', null], ['Assigned', 'Dispatched to Khalid']]);

  // ── Picked Up orders (4) ──
  addOrder('ORD-2015', 'Majed Al-Otaibi',      '+966512003001', 'Al-Malqa St 3, North',             z1, b2, d1, 'Picked Up', null, null, [['Unassigned', null], ['Assigned', null], ['Picked Up', 'Driver collected package']]);
  addOrder('ORD-2016', 'Noura Al-Mutairi',     '+966512003002', 'Al-Shifa Complex B, South',        z2, b3, d3, 'Picked Up', null, null, [['Unassigned', null], ['Assigned', null], ['Picked Up', 'En route to customer']]);
  addOrder('ORD-2017', 'Sami Al-Ghamdi',       '+966512003003', 'Al-Naseem Villa 12, East',         z3, b4, d8, 'Picked Up', null, null, [['Unassigned', null], ['Assigned', null], ['Picked Up', null]]);
  addOrder('ORD-2018', 'Abeer Al-Dosari',      '+966512003004', 'King Abdullah Rd, Central',        z5, b1, d6, 'Picked Up', null, null, [['Unassigned', null], ['Assigned', null], ['Picked Up', 'Out for delivery']]);

  // ── Delivered orders (12) ──
  const deliveredCustomers = [
    ['ORD-1001','Ali Al-Shehri',     '+966512004001','Al-Malqa District',        z1,b2,d1],
    ['ORD-1002','Fatima Al-Harbi',   '+966512004002','Al-Badiah St 22',          z2,b3,d2],
    ['ORD-1003','Nasser Al-Amri',    '+966512004003','East Ring Rd 9',           z3,b4,d3],
    ['ORD-1004','Wafa Al-Zahrani',   '+966512004004','Al-Wurud Compound',        z4,b1,d4],
    ['ORD-1005','Ibrahim Al-Qahtani','+966512004005','Olaya Towers, Central',    z5,b1,d5],
    ['ORD-1006','Hind Al-Rashidi',   '+966512004006','Al-Nakheel Park',          z1,b2,d6],
    ['ORD-1007','Waleed Al-Enezi',   '+966512004007','Al-Shifa Villa 4',         z2,b3,d8],
    ['ORD-1008','Maha Al-Saud',      '+966512004008','Al-Naseem Block 7',        z3,b4,d1],
    ['ORD-1009','Rayan Al-Mutairi',  '+966512004009','Al-Sulimaniyah St 11',     z4,b1,d2],
    ['ORD-1010','Dana Al-Tamimi',    '+966512004010','King Fahd Rd, Central',    z5,b1,d4],
    ['ORD-1011','Sultan Al-Bishi',   '+966512004011','North Ring Rd Villa',      z1,b2,d6],
    ['ORD-1012','Arwa Al-Shammari',  '+966512004012','Al-Badiah Complex C',      z2,b3,d8],
  ];
  for (const [ref, name, phone, addr, zone, branch, driver] of deliveredCustomers) {
    addOrder(ref, name, phone, addr, zone, branch, driver, 'Delivered', null, null,
      [['Unassigned', null], ['Assigned', null], ['Picked Up', null], ['Delivered', 'Successfully delivered']]);
  }

  // ── Failed orders (4) ──
  const failReasons = ['Customer Unavailable', 'Wrong Address', 'Customer Refused', 'Customer Unavailable'];
  const failedCustomers = [
    ['ORD-1901','Tariq Al-Subaie',   '+966512005001','Al-Malqa St 99',      z1,b2,d1],
    ['ORD-1902','Lina Al-Dosari',    '+966512005002','Al-Shifa Apt 3B',     z2,b3,d2],
    ['ORD-1903','Saud Al-Otaibi',    '+966512005003','East District Blk 2', z3,b4,d3],
    ['ORD-1904','Rima Al-Harbi',     '+966512005004','Al-Wurud St 7',       z4,b1,d4],
  ];
  for (let i = 0; i < failedCustomers.length; i++) {
    const [ref, name, phone, addr, zone, branch, driver] = failedCustomers[i];
    addOrder(ref, name, phone, addr, zone, branch, driver, 'Failed', failReasons[i], null,
      [['Unassigned', null], ['Assigned', null], ['Picked Up', null], ['Failed', failReasons[i]]]);
  }

  // ── Time Slots ──
  const { v4: uuid2 } = require('uuid');
  const ts1 = uuid2(), ts2 = uuid2(), ts3 = uuid2(), ts4 = uuid2(), ts5 = uuid2(), ts6 = uuid2(), ts7 = uuid2(), ts8 = uuid2();
  const insTs = db.prepare(`INSERT OR IGNORE INTO time_slots (id, tenant_id, name, day_of_week, start_time, end_time, active) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  // Sunday=0  (working day in SA)
  insTs.run(ts1, t1, 'Morning – Sun',   0, '08:00', '12:00', 1);
  insTs.run(ts2, t1, 'Afternoon – Sun', 0, '13:00', '17:00', 1);
  insTs.run(ts3, t1, 'Morning – Mon',   1, '08:00', '12:00', 1);
  insTs.run(ts4, t1, 'Afternoon – Mon', 1, '13:00', '17:00', 1);
  insTs.run(ts5, t1, 'Morning – Tue',   2, '08:00', '12:00', 1);
  insTs.run(ts6, t1, 'Afternoon – Tue', 2, '13:00', '17:00', 1);
  insTs.run(ts7, t1, 'Morning – Wed',   3, '08:00', '12:00', 1);
  insTs.run(ts8, t1, 'Afternoon – Wed', 3, '13:00', '17:00', 1);
  // Thursday half-day
  const ts9 = uuid2();
  insTs.run(ts9, t1, 'Half-Day – Thu',  4, '08:00', '13:00', 1);
  // Friday=5, Saturday=6 — off (no slots inserted)

  // ── Companies ──
  const { v4: uuid3 } = require('uuid');
  const c1 = uuid3(), c2 = uuid3(), c3 = uuid3();
  const insCo = db.prepare(`INSERT OR IGNORE INTO companies (id, tenant_id, name_en, name_ar, contact_person, email, order_price, free_delivery) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  insCo.run(c1, t1, 'Swift Logistics',    'سويفت للوجستيك',  'Khalid Mansour',  'khalid@swift.sa',   15.00, 0);
  insCo.run(c2, t1, 'Al-Amal Delivery',   'الأمل للتوصيل',  'Saad Al-Nasser',  'saad@alamal.sa',    12.50, 0);
  insCo.run(c3, t1, 'Express Partners',   'شركاء السرعة',    'Reem Al-Otaibi',  'reem@express.sa',    0.00, 1);

  // Link companies to zones
  const insCz = db.prepare(`INSERT OR IGNORE INTO company_zones (company_id, zone_id) VALUES (?, ?)`);
  insCz.run(c1, z1); insCz.run(c1, z2); insCz.run(c1, z5);
  insCz.run(c2, z2); insCz.run(c2, z3); insCz.run(c2, z4);
  insCz.run(c3, z1); insCz.run(c3, z3); insCz.run(c3, z4); insCz.run(c3, z5);

  // Link companies to time slots
  const insCts = db.prepare(`INSERT OR IGNORE INTO company_time_slots (company_id, time_slot_id) VALUES (?, ?)`);
  insCts.run(c1, ts1); insCts.run(c1, ts2); insCts.run(c1, ts3); insCts.run(c1, ts4);
  insCts.run(c2, ts3); insCts.run(c2, ts4); insCts.run(c2, ts5); insCts.run(c2, ts6);
  insCts.run(c3, ts1); insCts.run(c3, ts3); insCts.run(c3, ts5); insCts.run(c3, ts7); insCts.run(c3, ts9);

  // Assign external drivers (d6, d8) to Swift Logistics; d3 to Al-Amal
  db.prepare(`UPDATE drivers SET company_id = ? WHERE id = ?`).run(c1, d6);
  db.prepare(`UPDATE drivers SET company_id = ? WHERE id = ?`).run(c1, d8);
  db.prepare(`UPDATE drivers SET company_id = ? WHERE id = ?`).run(c2, d3);
}

// ── Migrations for existing databases ──
try { db.exec(`ALTER TABLE drivers ADD COLUMN fcm_token TEXT`); } catch {}
try { db.exec(`ALTER TABLE drivers ADD COLUMN company_id TEXT REFERENCES companies(id)`); } catch {}
try { db.exec(`ALTER TABLE zones ADD COLUMN coordinates TEXT`); } catch {}
try { db.exec(`ALTER TABLE zones ADD COLUMN branch_id TEXT REFERENCES branches(id)`); } catch {}
try { db.exec(`ALTER TABLE orders ADD COLUMN time_slot_id TEXT REFERENCES time_slots(id)`); } catch {}
try { db.exec(`ALTER TABLE orders ADD COLUMN free_delivery INTEGER NOT NULL DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE branches ADD COLUMN phone TEXT`); } catch {}
try { db.exec(`ALTER TABLE branches ADD COLUMN manager_name TEXT`); } catch {}

// ── New tables ──
db.exec(`
  CREATE TABLE IF NOT EXISTS time_slots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    order_price REAL NOT NULL DEFAULT 0,
    free_delivery INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS company_zones (
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    PRIMARY KEY (company_id, zone_id)
  );

  CREATE TABLE IF NOT EXISTS company_time_slots (
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    time_slot_id TEXT NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    PRIMARY KEY (company_id, time_slot_id)
  );

  CREATE TABLE IF NOT EXISTS driver_time_slots (
    driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    time_slot_id TEXT NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    PRIMARY KEY (driver_id, time_slot_id)
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    performed_by TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_images (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    uploaded_by TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
