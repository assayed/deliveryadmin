const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const tenantsRouter     = require('./routes/tenants');
const zonesRouter       = require('./routes/zones');
const branchesRouter    = require('./routes/branches');
const driversRouter     = require('./routes/drivers');
const ordersRouter      = require('./routes/orders');
const reportsRouter     = require('./routes/reports');
const timeSlotsRouter   = require('./routes/timeSlots');
const companiesRouter   = require('./routes/companies');
const auditLogRouter    = require('./routes/auditLog');
const imagesRouter      = require('./routes/images');
const dispatchRouter    = require('./routes/dispatchRoute');
const driverAuthRouter  = require('./routes/driverAuth');
const driverAppRouter   = require('./routes/driverApp');

// Admin panel routes
app.use('/api/tenants', tenantsRouter);
app.use('/api/tenants/:tenantId/zones',       zonesRouter);
app.use('/api/tenants/:tenantId/branches',    branchesRouter);
app.use('/api/tenants/:tenantId/drivers',     driversRouter);
app.use('/api/tenants/:tenantId/orders',      ordersRouter);
app.use('/api/tenants/:tenantId/orders/:orderId/images', imagesRouter);
app.use('/api/tenants/:tenantId/reports',     reportsRouter);
app.use('/api/tenants/:tenantId/time-slots',  timeSlotsRouter);
app.use('/api/tenants/:tenantId/companies',   companiesRouter);
app.use('/api/tenants/:tenantId/audit-log',   auditLogRouter);
app.use('/api/tenants/:tenantId/dispatch',    dispatchRouter);

// Mobile driver app routes
app.use('/api/driver/auth', driverAuthRouter);
app.use('/api/driver',      driverAppRouter);

app.get('/api/health', (_, res) => res.json({ ok: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve built React frontend
const FRONTEND_BUILD = path.join(__dirname, '../frontend/build');
app.use(express.static(FRONTEND_BUILD));
app.get('/{*path}', (req, res) => res.sendFile(path.join(FRONTEND_BUILD, 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
