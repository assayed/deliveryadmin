import axios from 'axios';

const BASE = 'http://localhost:3001/api';

const api = {
  // Tenants
  getTenants: () => axios.get(`${BASE}/tenants`).then(r => r.data),
  createTenant: (data) => axios.post(`${BASE}/tenants`, data).then(r => r.data),
  updateTenant: (id, data) => axios.put(`${BASE}/tenants/${id}`, data).then(r => r.data),
  deleteTenant: (id) => axios.delete(`${BASE}/tenants/${id}`).then(r => r.data),

  // Zones
  getZones: (tid) => axios.get(`${BASE}/tenants/${tid}/zones`).then(r => r.data),
  createZone: (tid, data) => axios.post(`${BASE}/tenants/${tid}/zones`, data).then(r => r.data),
  updateZone: (tid, id, data) => axios.put(`${BASE}/tenants/${tid}/zones/${id}`, data).then(r => r.data),
  deleteZone: (tid, id) => axios.delete(`${BASE}/tenants/${tid}/zones/${id}`).then(r => r.data),

  // Branches
  getBranches: (tid) => axios.get(`${BASE}/tenants/${tid}/branches`).then(r => r.data),
  createBranch: (tid, data) => axios.post(`${BASE}/tenants/${tid}/branches`, data).then(r => r.data),
  updateBranch: (tid, id, data) => axios.put(`${BASE}/tenants/${tid}/branches/${id}`, data).then(r => r.data),
  deleteBranch: (tid, id) => axios.delete(`${BASE}/tenants/${tid}/branches/${id}`).then(r => r.data),

  // Drivers
  getDrivers: (tid) => axios.get(`${BASE}/tenants/${tid}/drivers`).then(r => r.data),
  createDriver: (tid, data) => axios.post(`${BASE}/tenants/${tid}/drivers`, data).then(r => r.data),
  updateDriver: (tid, id, data) => axios.put(`${BASE}/tenants/${tid}/drivers/${id}`, data).then(r => r.data),
  deleteDriver: (tid, id) => axios.delete(`${BASE}/tenants/${tid}/drivers/${id}`).then(r => r.data),

  // Orders
  getOrders: (tid, params) => axios.get(`${BASE}/tenants/${tid}/orders`, { params }).then(r => r.data),
  createOrder: (tid, data) => axios.post(`${BASE}/tenants/${tid}/orders`, data).then(r => r.data),
  updateOrder: (tid, id, data) => axios.put(`${BASE}/tenants/${tid}/orders/${id}`, data).then(r => r.data),
  assignOrder: (tid, id, driver_id) => axios.post(`${BASE}/tenants/${tid}/orders/${id}/assign`, { driver_id }).then(r => r.data),
  updateOrderStatus: (tid, id, data) => axios.post(`${BASE}/tenants/${tid}/orders/${id}/status`, data).then(r => r.data),
  deleteOrder: (tid, id) => axios.delete(`${BASE}/tenants/${tid}/orders/${id}`).then(r => r.data),

  // Reports
  getReports: (tid) => axios.get(`${BASE}/tenants/${tid}/reports`).then(r => r.data),
};

export default api;
