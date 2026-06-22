import { useState, useEffect } from 'react';
import api from './api';
import Drivers from './pages/Drivers';
import Dispatch from './pages/Dispatch';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Branches from './pages/Branches';
import TimeSlots from './pages/TimeSlots';
import Companies from './pages/Companies';
import Zones from './pages/Zones';
import Dashboard from './pages/Dashboard';
import './index.css';

const AI = {
  Drivers:    ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 18a7 7 0 0114 0H3z"/></svg>,
  Dispatch:   ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M2 3h7v7H2V3zm9 0h7v7h-7V3zm-9 9h7v7H2v-7zm9 0h7v7h-7v-7z"/></svg>,
  Orders:     ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M3 4h14v2H3V4zm0 5h14v2H3V9zm0 5h10v2H3v-2z"/></svg>,
  Reports:    ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M2 16h2v-6H2v6zm4 0h2V6H6v10zm4 0h2v-4h-2v4zm4 0h2V6h-2v10z"/></svg>,
  Bell:       ({size=16}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v2.5L2 13h16l-2-2.5V8a6 6 0 00-6-6zM8.5 16a1.5 1.5 0 003 0h-3z"/></svg>,
  Branch:     ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M4 2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm8 4H8v2h4V6zm0 4H8v2h4v-2z"/></svg>,
  Clock:      ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 8.5V6H9v5.5l3.5 2 1-1.7L11 10.5z"/></svg>,
  Building:   ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v13h-3v-3h-2v3H4V4zm3 2v2h2V6H6zm4 0v2h2V6h-2zM6 10v2h2v-2H6zm4 0v2h2v-2h-2z"/></svg>,
  Map:        ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M12.9 2L7 4 2 2v16l5 2 6-2 5 2V4l-5.1-2zM7 18V5.5l6-1.5V17L7 18z"/></svg>,
  Dashboard:  ({size=17}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 1116 0H2zm8-3a3 3 0 100 6 3 3 0 000-6z"/></svg>,
};

const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { id:'dashboard', label:'Dashboard',       icon:AI.Dashboard },
      { id:'dispatch',  label:'Dispatch Board',  icon:AI.Dispatch, pill: d => d?.unassignedCount, alert: true },
      { id:'orders',    label:'Order Status',    icon:AI.Orders,   pill: d => d?.orderCount },
      { id:'drivers',   label:'Drivers',         icon:AI.Drivers,  pill: d => d?.driverCount },
      { id:'reports',   label:'Reports',         icon:AI.Reports },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { id:'zones',      label:'Delivery Zones', icon:AI.Map },
      { id:'branches',   label:'Branches',       icon:AI.Branch },
      { id:'timeslots',  label:'Time Slots',      icon:AI.Clock },
      { id:'companies',  label:'Companies',       icon:AI.Building },
    ],
  },
];

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  dispatch:  'Dispatch Board',
  orders:    'Order Status',
  drivers:   'Driver Management',
  reports:   'Reports',
  zones:     'Delivery Zones',
  branches:  'Branches',
  timeslots: 'Time Slots',
  companies: 'Companies',
};

export default function App() {
  const [tenant, setTenant] = useState(null);
  const [page, setPage] = useState('dispatch');
  const [pills, setPills] = useState({});

  useEffect(() => {
    api.getTenants().then(ts => { if (ts.length > 0) setTenant(ts[0]); });
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
      case 'dashboard': return <Dashboard tenant={tenant}/>;
      case 'dispatch':  return <Dispatch tenant={tenant}/>;
      case 'orders':    return <Orders tenant={tenant}/>;
      case 'drivers':   return <Drivers tenant={tenant}/>;
      case 'reports':   return <Reports tenant={tenant}/>;
      case 'zones':     return <Zones tenant={tenant}/>;
      case 'branches':  return <Branches tenant={tenant}/>;
      case 'timeslots': return <TimeSlots tenant={tenant}/>;
      case 'companies': return <Companies tenant={tenant}/>;
      default: return null;
    }
  };

  return (
    <div className="adm">
      <aside className="adm-sb">
        <div className="adm-sb-logo">
          <img src="/fodek-logo.png" alt="FODEK" style={{height:26,filter:'brightness(0) invert(1)'}} onError={e => { e.target.style.display='none'; }}/>
          <span style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:'#fff',letterSpacing:'-.01em'}}>FODEK</span>
          <span className="adm-sb-tag">Admin</span>
        </div>

        <nav className="adm-sb-nav">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <div className="adm-sb-section">{section.label}</div>
              {section.items.map(item => {
                const pillVal = item.pill ? item.pill(pills) : null;
                return (
                  <div key={item.id} className={`adm-sb-item${page===item.id?' active':''}`} onClick={() => setPage(item.id)}>
                    <item.icon/>
                    <span style={{flex:1}}>{item.label}</span>
                    {pillVal != null && <span className={`adm-sb-pill${item.alert && pillVal>0?' alert':''}`}>{pillVal}</span>}
                  </div>
                );
              })}
            </div>
          ))}
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
