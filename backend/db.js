const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'fodek.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
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

  const t1 = uuidv4(), t2 = uuidv4();
  db.prepare(`INSERT INTO tenants (id, name, contact_email, contact_phone) VALUES (?, ?, ?, ?)`).run(t1, 'FODEK Riyadh', 'ops@fodek-ryd.sa', '+966501111111');
  db.prepare(`INSERT INTO tenants (id, name, contact_email, contact_phone) VALUES (?, ?, ?, ?)`).run(t2, 'FODEK Jeddah', 'ops@fodek-jed.sa', '+966502222222');

  const z1 = uuidv4(), z2 = uuidv4(), z3 = uuidv4(), z4 = uuidv4();
  db.prepare(`INSERT INTO zones (id, tenant_id, name, description) VALUES (?, ?, ?, ?)`).run(z1, t1, 'North Riyadh', 'Covers north districts');
  db.prepare(`INSERT INTO zones (id, tenant_id, name, description) VALUES (?, ?, ?, ?)`).run(z2, t1, 'South Riyadh', 'Covers south districts');
  db.prepare(`INSERT INTO zones (id, tenant_id, name, description) VALUES (?, ?, ?, ?)`).run(z3, t2, 'Al-Balad', 'Historic centre zone');
  db.prepare(`INSERT INTO zones (id, tenant_id, name, description) VALUES (?, ?, ?, ?)`).run(z4, t2, 'Corniche', 'Waterfront zone');

  const b1 = uuidv4(), b2 = uuidv4(), b3 = uuidv4();
  db.prepare(`INSERT INTO branches (id, tenant_id, name, address, zone_id) VALUES (?, ?, ?, ?, ?)`).run(b1, t1, 'Riyadh Main', 'King Fahd Rd', z1);
  db.prepare(`INSERT INTO branches (id, tenant_id, name, address, zone_id) VALUES (?, ?, ?, ?, ?)`).run(b2, t1, 'Riyadh South Hub', 'Ring Rd South', z2);
  db.prepare(`INSERT INTO branches (id, tenant_id, name, address, zone_id) VALUES (?, ?, ?, ?, ?)`).run(b3, t2, 'Jeddah Central', 'Al-Madinah Rd', z3);

  const d1 = uuidv4(), d2 = uuidv4(), d3 = uuidv4(), d4 = uuidv4();
  db.prepare(`INSERT INTO drivers (id, tenant_id, name, phone, vehicle_type, driver_type, max_concurrent_orders, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(d1, t1, 'Ahmed Al-Rashidi', '+966511000001', 'motorcycle', 'in-house', 3, 1);
  db.prepare(`INSERT INTO drivers (id, tenant_id, name, phone, vehicle_type, driver_type, max_concurrent_orders, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(d2, t1, 'Faisal Al-Mutairi', '+966511000002', 'car', 'in-house', 2, 1);
  db.prepare(`INSERT INTO drivers (id, tenant_id, name, phone, vehicle_type, driver_type, max_concurrent_orders, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(d3, t1, 'Omar Khaled', '+966511000003', 'motorcycle', 'hybrid', 3, 0);
  db.prepare(`INSERT INTO drivers (id, tenant_id, name, phone, vehicle_type, driver_type, max_concurrent_orders, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(d4, t2, 'Yusuf Al-Ghamdi', '+966511000004', 'motorcycle', 'in-house', 4, 1);

  db.prepare(`INSERT INTO driver_zones (driver_id, zone_id) VALUES (?, ?)`).run(d1, z1);
  db.prepare(`INSERT INTO driver_zones (driver_id, zone_id) VALUES (?, ?)`).run(d2, z1);
  db.prepare(`INSERT INTO driver_zones (driver_id, zone_id) VALUES (?, ?)`).run(d2, z2);
  db.prepare(`INSERT INTO driver_zones (driver_id, zone_id) VALUES (?, ?)`).run(d3, z2);
  db.prepare(`INSERT INTO driver_zones (driver_id, zone_id) VALUES (?, ?)`).run(d4, z3);
  db.prepare(`INSERT INTO driver_zones (driver_id, zone_id) VALUES (?, ?)`).run(d4, z4);

  // Sample orders
  const statuses = ['Unassigned', 'Assigned', 'Picked Up', 'Delivered', 'Failed'];
  const reasons = [null, null, null, null, 'Customer Unavailable'];
  for (let i = 1; i <= 12; i++) {
    const oid = uuidv4();
    const statusIdx = i % statuses.length;
    const st = statuses[statusIdx];
    const driverId = st === 'Unassigned' ? null : (i % 2 === 0 ? d1 : d2);
    db.prepare(`INSERT INTO orders (id, tenant_id, order_ref, customer_name, customer_phone, customer_address, zone_id, branch_id, driver_id, status, failed_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      oid, t1, `ORD-${1000 + i}`, `Customer ${i}`, `+9665100000${i}`, `Street ${i}, Riyadh`,
      i % 2 === 0 ? z1 : z2, i % 2 === 0 ? b1 : b2, driverId, st, reasons[statusIdx]
    );
    db.prepare(`INSERT INTO order_status_history (id, order_id, status) VALUES (?, ?, ?)`).run(uuidv4(), oid, 'Unassigned');
    if (st !== 'Unassigned') {
      db.prepare(`INSERT INTO order_status_history (id, order_id, status) VALUES (?, ?, ?)`).run(uuidv4(), oid, st);
    }
  }
  for (let i = 1; i <= 4; i++) {
    const oid = uuidv4();
    db.prepare(`INSERT INTO orders (id, tenant_id, order_ref, customer_name, customer_phone, customer_address, zone_id, branch_id, driver_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      oid, t2, `JED-${2000 + i}`, `Customer J${i}`, `+9665200000${i}`, `District ${i}, Jeddah`,
      i % 2 === 0 ? z3 : z4, b3, i % 2 === 0 ? d4 : null, i % 2 === 0 ? 'Assigned' : 'Unassigned'
    );
    db.prepare(`INSERT INTO order_status_history (id, order_id, status) VALUES (?, ?, ?)`).run(uuidv4(), oid, 'Unassigned');
  }
}

module.exports = db;
