const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const tenantsRouter = require('./routes/tenants');
const zonesRouter = require('./routes/zones');
const branchesRouter = require('./routes/branches');
const driversRouter = require('./routes/drivers');
const ordersRouter = require('./routes/orders');
const reportsRouter = require('./routes/reports');
const driverAuthRouter = require('./routes/driverAuth');
const driverAppRouter = require('./routes/driverApp');

// Admin panel routes
app.use('/api/tenants', tenantsRouter);
app.use('/api/tenants/:tenantId/zones', zonesRouter);
app.use('/api/tenants/:tenantId/branches', branchesRouter);
app.use('/api/tenants/:tenantId/drivers', driversRouter);
app.use('/api/tenants/:tenantId/orders', ordersRouter);
app.use('/api/tenants/:tenantId/reports', reportsRouter);

// Mobile driver app routes
app.use('/api/driver/auth', driverAuthRouter);
app.use('/api/driver', driverAppRouter);

app.get('/api/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
