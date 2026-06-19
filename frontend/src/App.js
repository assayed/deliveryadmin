import { useState, useEffect } from 'react';
import { Building2, MapPin, GitBranch, User, Package, Zap, BarChart2, Settings } from 'lucide-react';
import api from './api';
import Tenants from './pages/Tenants';
import Zones from './pages/Zones';
import Branches from './pages/Branches';
import Drivers from './pages/Drivers';
import Orders from './pages/Orders';
import Dispatch from './pages/Dispatch';
import Reports from './pages/Reports';
import './index.css';

const NAV = [
  { id: 'dispatch', label: 'Dispatch Board', icon: Zap, tenantRequired: true },
  { id: 'orders', label: 'Orders', icon: Package, tenantRequired: true },
  { id: 'drivers', label: 'Drivers', icon: User, tenantRequired: true },
  { id: 'zones', label: 'Zones', icon: MapPin, tenantRequired: true },
  { id: 'branches', label: 'Branches', icon: GitBranch, tenantRequired: true },
  { id: 'reports', label: 'Reports', icon: BarChart2, tenantRequired: true },
];

const PAGE_TITLES = { dispatch: 'Dispatch Board', orders: 'Orders', drivers: 'Drivers', zones: 'Delivery Zones', branches: 'Branches', reports: 'Reports', tenants: 'Tenant Management' };

function NoTenant() {
  return (
    <div className="no-tenant">
      <Building2 size={48} strokeWidth={1}/>
      <h2>No Tenant Selected</h2>
      <p>Select a tenant from the sidebar to manage their delivery operations.</p>
    </div>
  );
}

export default function App() {
  const [tenants, setTenants] = useState([]);
  const [activeTenantId, setActiveTenantId] = useState('');
  const [page, setPage] = useState('dispatch');

  const loadTenants = () => api.getTenants().then(ts => {
    setTenants(ts);
    if (!activeTenantId && ts.length > 0) setActiveTenantId(ts[0].id);
  });

  useEffect(() => { loadTenants(); }, []); // eslint-disable-line

  const tenant = tenants.find(t => t.id === activeTenantId);

  const renderPage = () => {
    if (page === 'tenants') return <Tenants tenants={tenants} onRefresh={loadTenants}/>;
    if (!tenant) return <NoTenant/>;
    switch (page) {
      case 'dispatch': return <Dispatch tenant={tenant}/>;
      case 'orders': return <Orders tenant={tenant}/>;
      case 'drivers': return <Drivers tenant={tenant}/>;
      case 'zones': return <Zones tenant={tenant}/>;
      case 'branches': return <Branches tenant={tenant}/>;
      case 'reports': return <Reports tenant={tenant}/>;
      default: return null;
    }
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>FODEK</h1>
          <span>Driver Dispatch Admin</span>
        </div>

        <div className="tenant-selector">
          <label>Active Tenant</label>
          <select value={activeTenantId} onChange={e => { setActiveTenantId(e.target.value); setPage('dispatch'); }}>
            <option value="">— Select tenant —</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Operations</div>
          {NAV.map(item => (
            <div key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
              <item.icon size={15}/>
              {item.label}
            </div>
          ))}
          <div className="nav-section" style={{marginTop:8}}>System</div>
          <div className={`nav-item ${page === 'tenants' ? 'active' : ''}`} onClick={() => setPage('tenants')}>
            <Settings size={15}/>Tenant Management
          </div>
        </nav>
      </aside>

      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{PAGE_TITLES[page] || page}</span>
          {tenant && <span className="topbar-tenant">{tenant.name}</span>}
        </div>
        {renderPage()}
      </div>
    </div>
  );
}
