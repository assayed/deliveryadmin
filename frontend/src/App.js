import { useState, useEffect } from 'react';
import api from './api';
import Drivers from './pages/Drivers';
import Dispatch from './pages/Dispatch';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import './index.css';

const AI = {
  Drivers:  ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 18a7 7 0 0114 0H3z"/></svg>,
  Dispatch: ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M2 3h7v7H2V3zm9 0h7v7h-7V3zm-9 9h7v7H2v-7zm9 0h7v7h-7v-7z"/></svg>,
  Orders:   ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M3 4h14v2H3V4zm0 5h14v2H3V9zm0 5h10v2H3v-2z"/></svg>,
  Reports:  ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M2 16h2v-6H2v6zm4 0h2V6H6v10zm4 0h2v-4h-2v4zm4 0h2V6h-2v10z"/></svg>,
  Bell:     ({size=16}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v2.5L2 13h16l-2-2.5V8a6 6 0 00-6-6zM8.5 16a1.5 1.5 0 003 0h-3z"/></svg>,
};

const NAV = [
  { id:'drivers',  label:'Driver Management', icon:AI.Drivers,  pill: d => d?.driverCount },
  { id:'dispatch', label:'Dispatch Board',     icon:AI.Dispatch, pill: d => d?.unassignedCount, alert: true },
  { id:'orders',   label:'Order Status',       icon:AI.Orders,   pill: d => d?.orderCount },
  { id:'reports',  label:'Reports',            icon:AI.Reports },
];

const PAGE_TITLES = {
  drivers:  'Driver Management',
  dispatch: 'Dispatch Board',
  orders:   'Order Status',
  reports:  'Reports',
};

export default function App() {
  const [tenant, setTenant] = useState(null);
  const [page, setPage] = useState('dispatch');
  const [pills, setPills] = useState({});

  useEffect(() => {
    api.getTenants().then(ts => {
      if (ts.length > 0) setTenant(ts[0]);
    });
  }, []);

  useEffect(() => {
    if (!tenant) return;
    Promise.all([
      api.getDrivers(tenant.id),
      api.getOrders(tenant.id),
      api.getOrders(tenant.id, { status: 'Unassigned' }),
    ]).then(([drivers, orders, unassigned]) => {
      setPills({ driverCount: drivers.length, orderCount: orders.length, unassignedCount: unassigned.length });
    }).catch(() => {});
  }, [tenant, page]);

  if (!tenant) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:"'Manrope',sans-serif",color:'#6B7F74'}}>
      Loading…
    </div>
  );

  const renderPage = () => {
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
            <div className="adm-page-title">{PAGE_TITLES[page]}</div>
            <div className="adm-breadcrumb">{tenant.name} · {new Date().toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          <div className="adm-topbar-right">
            <div className="adm-icon-btn"><AI.Bell size={16}/></div>
            <span style={{fontSize:12,fontWeight:700,background:'#E7F0EB',color:'#0B5132',padding:'4px 10px',borderRadius:999}}>{tenant.name}</span>
          </div>
        </div>
        {renderPage()}
      </div>
    </div>
  );
}
