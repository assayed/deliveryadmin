import { useState, useEffect } from 'react';
import api from './api';
import Drivers from './pages/Drivers';
import Dispatch from './pages/Dispatch';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Tenants from './pages/Tenants';
import './index.css';

/* ── Icons ── */
const AI = {
  Drivers:  ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 18a7 7 0 0114 0H3z"/></svg>,
  Dispatch: ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M2 3h7v7H2V3zm9 0h7v7h-7V3zm-9 9h7v7H2v-7zm9 0h7v7h-7v-7z"/></svg>,
  Orders:   ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M3 4h14v2H3V4zm0 5h14v2H3V9zm0 5h10v2H3v-2z"/></svg>,
  Reports:  ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M2 16h2v-6H2v6zm4 0h2V6H6v10zm4 0h2v-4h-2v4zm4 0h2V6h-2v10z"/></svg>,
  Settings: ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>,
  Bell:     ({size=16}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v2.5L2 13h16l-2-2.5V8a6 6 0 00-6-6zM8.5 16a1.5 1.5 0 003 0h-3z"/></svg>,
  Chevron:  ({size=13}) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>,
};

const NAV = [
  { id:'drivers',  label:'Driver Management', icon:AI.Drivers,  pill: d => d?.driverCount },
  { id:'dispatch', label:'Dispatch Board',     icon:AI.Dispatch, pill: d => d?.unassignedCount, alert: true },
  { id:'orders',   label:'Order Status',       icon:AI.Orders,   pill: d => d?.orderCount },
  { id:'reports',  label:'Reports',            icon:AI.Reports },
];

export default function App() {
  const [tenants, setTenants] = useState([]);
  const [activeTenantId, setActiveTenantId] = useState('');
  const [page, setPage] = useState('dispatch');
  const [pills, setPills] = useState({});

  const loadTenants = () => api.getTenants().then(ts => {
    setTenants(ts);
    if (!activeTenantId && ts.length > 0) setActiveTenantId(ts[0].id);
  });

  useEffect(() => { loadTenants(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!activeTenantId) return;
    Promise.all([
      api.getDrivers(activeTenantId),
      api.getOrders(activeTenantId),
      api.getOrders(activeTenantId, { status: 'Unassigned' }),
    ]).then(([drivers, orders, unassigned]) => {
      setPills({ driverCount: drivers.length, orderCount: orders.length, unassignedCount: unassigned.length });
    }).catch(() => {});
  }, [activeTenantId, page]);

  const tenant = tenants.find(t => t.id === activeTenantId);

  const PAGE_TITLES = {
    drivers:  'Driver Management',
    dispatch: 'Dispatch Board',
    orders:   'Order Status',
    reports:  'Reports',
    tenants:  'Tenant Management',
  };

  const renderPage = () => {
    if (page === 'tenants') return <Tenants tenants={tenants} onRefresh={loadTenants}/>;
    if (!tenant) return (
      <div className="adm-no-tenant">
        <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="#D0DAD4" strokeWidth="1.5"><path d="M3 21h18M9 21V7l6-4v18"/><path d="M12 21V11"/></svg>
        <h2>No Tenant Selected</h2>
        <p style={{fontSize:13,color:'#9EB3A6',fontWeight:600}}>Select a tenant from the dropdown below to manage their delivery operations.</p>
      </div>
    );
    switch (page) {
      case 'dispatch': return <Dispatch tenant={tenant}/>;
      case 'orders':   return <Orders tenant={tenant}/>;
      case 'drivers':  return <Drivers tenant={tenant}/>;
      case 'reports':  return <Reports tenant={tenant}/>;
      default: return null;
    }
  };

  return (
    <div className="adm">
      {/* ── Sidebar ── */}
      <aside className="adm-sb">
        <div className="adm-sb-logo">
          <img src="/fodek-logo.png" alt="FODEK" style={{height:26,filter:'brightness(0) invert(1)'}} onError={e => { e.target.style.display='none'; }}/>
          <span style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:'#fff',letterSpacing:'-.01em'}}>FODEK</span>
          <span className="adm-sb-tag">Admin</span>
        </div>

        {/* Tenant selector */}
        <div style={{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
          <div style={{fontSize:'9.5px',fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(255,255,255,.28)',marginBottom:6}}>Tenant</div>
          <div style={{background:'rgba(0,0,0,.18)',borderRadius:8,padding:'7px 10px',display:'flex',alignItems:'center',gap:6}}>
            <select
              value={activeTenantId}
              onChange={e => { setActiveTenantId(e.target.value); setPage('dispatch'); }}
              style={{border:'none',outline:'none',background:'transparent',color:'#fff',fontFamily:"'Manrope',sans-serif",fontSize:13,fontWeight:700,cursor:'pointer',flex:1,appearance:'none'}}>
              <option value="" style={{color:'#122B1D'}}>— Select tenant —</option>
              {tenants.map(t => <option key={t.id} value={t.id} style={{color:'#122B1D'}}>{t.name}</option>)}
            </select>
            <AI.Chevron size={11}/>
          </div>
        </div>

        <nav className="adm-sb-nav">
          <div className="adm-sb-section">Operations</div>
          {NAV.map(item => {
            const pillVal = item.pill ? item.pill(pills) : null;
            return (
              <div key={item.id} className={`adm-sb-item${page===item.id?' active':''}`} onClick={() => setPage(item.id)}>
                <item.icon/>
                <span style={{flex:1}}>{item.label}</span>
                {pillVal != null && <span className={`adm-sb-pill${item.alert && pillVal>0?' alert':''}`}>{pillVal}</span>}
              </div>
            );
          })}
          <div className="adm-sb-section" style={{marginTop:8}}>System</div>
          <div className={`adm-sb-item${page==='tenants'?' active':''}`} onClick={() => setPage('tenants')}>
            <AI.Settings/><span>Tenant Management</span>
          </div>
        </nav>

        <div className="adm-sb-bottom">
          <div className="adm-sb-user">
            <div className="adm-sb-avatar">MA</div>
            <div>
              <div className="adm-sb-uname">Mustafa A.</div>
              <div className="adm-sb-urole">Operations Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="adm-main">
        <div className="adm-topbar">
          <div>
            <div className="adm-page-title">{PAGE_TITLES[page] || page}</div>
            {tenant && <div className="adm-breadcrumb">{tenant.name} · {new Date().toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</div>}
          </div>
          <div className="adm-topbar-right">
            <div className="adm-icon-btn"><AI.Bell size={16}/></div>
            {tenant && <span style={{fontSize:12,fontWeight:700,background:'#E7F0EB',color:'#0B5132',padding:'4px 10px',borderRadius:999}}>{tenant.name}</span>}
          </div>
        </div>
        {renderPage()}
      </div>
    </div>
  );
}
