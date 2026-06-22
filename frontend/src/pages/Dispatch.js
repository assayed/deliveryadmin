import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';

const Clock =   ({size=12}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M7 0a7 7 0 100 14A7 7 0 007 0zm.5 7.7L5 6.3V3h1v2.9l2 1.3-.5.5z"/></svg>;
const Pin =     ({size=11}) => <svg width={size} height={size} viewBox="0 0 14 16" fill="currentColor"><path d="M7 0C4.24 0 2 2.24 2 5c0 4.25 5 10 5 10s5-5.75 5-10c0-2.76-2.24-5-5-5zm0 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>;
const Truck =   ({size=13}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M1 4h12v8H1V4zm13 2h2l2 3v3h-4V6zM4 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm10 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>;
const Refresh = ({size=14}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a7 7 0 100 14A7 7 0 0010 3zm-1 4l3 3-3 3V7zm-2 3a5 5 0 118.66 2.5l-1.41-1.42A3 3 0 107 10H5z"/></svg>;
const Route =   ({size=14}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M4 15s0-4 4-4 8-4 8-8M4 15l-2-2m2 2l2-2"/></svg>;
const Chevron = ({size=12}) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>;
const X =       ({size=14}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>;

function LoadBar({ current, max }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const full = current >= max;
  const warn = !full && pct >= 67;
  const fillColor = full ? '#C8372D' : warn ? '#F2AF1F' : '#0B5132';
  const textColor = full ? '#C8372D' : warn ? '#8A6210' : '#6B7F74';
  return (
    <div className="adm-load">
      <div className="adm-load-track">
        <div style={{height:'100%',borderRadius:3,background:fillColor,width:`${pct}%`,transition:'width .3s'}}/>
      </div>
      <span className="adm-load-label" style={{color:textColor}}>{current}/{max}</span>
    </div>
  );
}

const AVATAR_COLORS = ['#1A7DA8','#0B5132','#7A5210','#156A8C','#6B7F74','#B83028','#2D6E4E','#8C4A15'];
function initials(name) { return name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join(''); }
function avatarColor(name) { let h=0; for(let c of name) h=(h*31+c.charCodeAt(0))%AVATAR_COLORS.length; return AVATAR_COLORS[h]; }
function waitLabel(createdAt) { const mins=Math.floor((Date.now()-new Date(createdAt))/60000); if(mins<60) return `${mins}m`; return `${Math.floor(mins/60)}h${mins%60}m`; }

// Leaflet route map modal
function RouteMapModal({ orders, onClose }) {
  const mapRef = useRef(null);

  useEffect(() => {
    const L = window.L;
    if (!L || !mapRef.current || mapRef.current._leaflet_id) return;

    const map = L.map(mapRef.current, { center: [24.7136, 46.6753], zoom: 11 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

    const coords = orders.map((o, i) => {
      if (o.zone?.coordinates) {
        try {
          const pts = JSON.parse(o.zone.coordinates);
          if (pts.length) {
            const lat = pts.reduce((s,p)=>s+p[0],0)/pts.length;
            const lng = pts.reduce((s,p)=>s+p[1],0)/pts.length;
            return [lat, lng];
          }
        } catch {}
      }
      return null;
    }).filter(Boolean);

    if (coords.length === 0) return;

    coords.forEach((c, i) => {
      L.marker(c).bindPopup(`<b>#${i+1}</b> ${orders[i]?.order_ref}<br>${orders[i]?.customer_name}`).addTo(map);
    });

    if (coords.length > 1) {
      L.polyline(coords, { color: '#0B5132', weight: 3, dashArray: '6 4' }).addTo(map);
    }

    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [40, 40] });

    return () => { map.remove(); };
  }, [orders]);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', width:'90vw', maxWidth:800, display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #E2E9E4' }}>
          <div>
            <span style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:15 }}>Optimized Route</span>
            <span style={{ fontSize:12, color:'#6B7F74', fontWeight:600, marginLeft:10 }}>{orders.length} stops · nearest-neighbor algorithm</span>
          </div>
          <button className="adm-icon-btn" onClick={onClose}><X size={14}/></button>
        </div>
        <div style={{ display:'flex', height:480 }}>
          <div ref={mapRef} style={{ flex:1 }} />
          <div style={{ width:240, overflowY:'auto', borderLeft:'1px solid #E2E9E4', padding:'10px' }}>
            {orders.map((o, i) => (
              <div key={o.id} style={{ display:'flex', gap:9, marginBottom:10, paddingBottom:10, borderBottom:'1px solid #F0F4F2' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'#0B5132', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{i+1}</div>
                <div>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontSize:12.5, fontWeight:700 }}>{o.order_ref}</div>
                  <div style={{ fontSize:11.5, color:'#6B7F74', fontWeight:600 }}>{o.customer_name}</div>
                  <div style={{ fontSize:11, color:'#9EB3A6' }}>{o.zone?.name || 'No zone'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dispatch({ tenant }) {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [zones, setZones] = useState([]);
  const [branches, setBranches] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterZone, setFilterZone] = useState('all');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterSlot, setFilterSlot] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [routeOrders, setRouteOrders] = useState(null);
  const [optimizing, setOptimizing] = useState(false);

  const load = useCallback(() => Promise.all([
    api.getOrders(tenant.id, { status: 'Unassigned' }).then(setOrders),
    api.getDrivers(tenant.id).then(setDrivers),
    api.getZones(tenant.id).then(setZones),
    api.getBranches(tenant.id).then(setBranches),
    api.getTimeSlots(tenant.id).then(setTimeSlots),
  ]), [tenant.id]);

  useEffect(() => { load(); }, [load]);

  // Load Leaflet for route map
  useEffect(() => {
    if (!document.getElementById('leaflet-css-dp')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-dp';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      document.head.appendChild(script);
    }
  }, []);

  let filteredOrders = orders;
  if (filterZone !== 'all') filteredOrders = filteredOrders.filter(o => o.zone_id === filterZone);
  if (filterBranch) filteredOrders = filteredOrders.filter(o => o.branch_id === filterBranch);
  if (filterSlot) filteredOrders = filteredOrders.filter(o => o.time_slot_id === filterSlot);

  const candidateDrivers = selected
    ? drivers.filter(d => {
        if (!d.active) return false;
        if (selected.zone_id && !d.zones.some(z => z.id === selected.zone_id)) return false;
        return true;
      })
    : [];

  const assign = async (driver) => {
    if (!selected || assigning) return;
    if (driver.current_load >= driver.max_concurrent_orders) return;
    setAssigning(true);
    try {
      await api.assignOrder(tenant.id, selected.id, driver.id);
      setFeedback({ type:'success', msg:`✓ ${selected.order_ref} assigned to ${driver.name}` });
      setSelected(null); load();
      setTimeout(() => setFeedback(null), 3500);
    } catch(e) {
      setFeedback({ type:'error', msg: e.response?.data?.error || 'Assignment failed' });
      setTimeout(() => setFeedback(null), 3500);
    }
    setAssigning(false);
  };

  const optimizeRoute = async () => {
    const ordersToRoute = filteredOrders.filter(o => o.zone_id);
    if (ordersToRoute.length < 2) {
      setFeedback({ type:'error', msg:'Need at least 2 orders with zones for route optimization' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    setOptimizing(true);
    try {
      const result = await api.optimizeRoute(tenant.id, {
        order_ids: ordersToRoute.map(o => o.id),
        start: [24.7136, 46.6753],
      });
      setRouteOrders(result.ordered_orders || ordersToRoute);
    } catch(e) {
      // Fallback: show current order list on map
      setRouteOrders(ordersToRoute);
    }
    setOptimizing(false);
  };

  const selectedZone = zones.find(z => z.id === selected?.zone_id);
  const assignableCount = candidateDrivers.filter(d => d.current_load < d.max_concurrent_orders).length;

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'10px 24px',borderBottom:'1px solid #E2E9E4',background:'#fff',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',flexShrink:0}}>
        {/* Filters */}
        <div className="adm-select" style={{minWidth:120}}>
          <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select><Chevron/>
        </div>
        <div className="adm-select" style={{minWidth:130}}>
          <select value={filterSlot} onChange={e=>setFilterSlot(e.target.value)}>
            <option value="">All Time Slots</option>
            {timeSlots.map(t=><option key={t.id} value={t.id}>{t.name} ({t.day_name})</option>)}
          </select><Chevron/>
        </div>
        <button className="adm-btn adm-btn-ghost" style={{padding:'6px 12px',fontSize:12.5,gap:5}} onClick={load}><Refresh size={12}/> Refresh</button>
        {feedback && (
          <span className={`adm-alert ${feedback.type==='success'?'adm-alert-success':'adm-alert-error'}`} style={{padding:'5px 14px'}}>
            {feedback.msg}
          </span>
        )}
        <span style={{marginLeft:'auto',fontSize:12.5,fontWeight:700,color:'#0B5132'}}>
          {orders.length} unassigned · {drivers.filter(d=>d.active&&d.current_load<d.max_concurrent_orders).length} drivers available
        </span>
        <button className="adm-btn adm-btn-ghost" style={{gap:6,fontSize:12.5,borderColor:'#B8D8EB',color:'#156A8C'}} onClick={optimizeRoute} disabled={optimizing}>
          <Route size={13}/>{optimizing?'Optimizing…':'Route Map'}
        </button>
      </div>

      <div className="adm-dispatch">
        {/* ── Left: Unassigned orders ── */}
        <div className="adm-dp-left">
          <div className="adm-panel-hdr">
            <span className="adm-panel-title">Unassigned Orders</span>
            <span className="adm-panel-count">{filteredOrders.length} orders · ready for pickup</span>
          </div>
          <div className="adm-chip-row">
            <span className={`adm-chip${filterZone==='all'?' on':''}`} onClick={()=>setFilterZone('all')}>All Zones</span>
            {zones.map(z => (
              <span key={z.id} className={`adm-chip${filterZone===z.id?' on':''}`} onClick={()=>setFilterZone(z.id)}>{z.name}</span>
            ))}
          </div>
          <div className="adm-panel-list">
            {filteredOrders.length === 0 && (
              <div className="adm-empty" style={{paddingTop:60}}>
                <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#D0DAD4" strokeWidth="1.5"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                <div className="adm-empty-title">All orders assigned</div>
                <div style={{fontSize:12,color:'#9EB3A6'}}>No unassigned orders match current filters</div>
              </div>
            )}
            {filteredOrders.map(o => {
              const isSelected = selected?.id === o.id;
              const waitMins = Math.floor((Date.now()-new Date(o.created_at))/60000);
              const longWait = waitMins > 30;
              return (
                <div key={o.id} className={`adm-ord-card${isSelected?' sel':''}`} onClick={()=>setSelected(s=>s?.id===o.id?null:o)}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                    <span className="adm-ord-id">{o.order_ref}</span>
                    <span className={`adm-ord-wait${longWait?' long':''}`}><Clock size={11}/> {waitLabel(o.created_at)}</span>
                  </div>
                  <div className="adm-ord-customer">{o.customer_name}</div>
                  <div className="adm-ord-addr"><Pin/> {o.customer_address}</div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'1px solid #F2F6F3',paddingTop:7,marginTop:7,flexWrap:'wrap',gap:4}}>
                    {o.zone ? <span className="adm-zone-chip">{o.zone.name}</span> : <span style={{fontSize:11,color:'#C8D8CF'}}>No zone</span>}
                    {o.branch && <span style={{fontSize:11.5,color:'#6B7F74',fontWeight:600}}>{o.branch.name}</span>}
                    {o.time_slot && <span style={{fontSize:11,color:'#1A7DA8',fontWeight:600,display:'flex',alignItems:'center',gap:3}}><Clock size={10}/> {o.time_slot.name}</span>}
                    {o.free_delivery ? <span className="adm-badge adm-badge-active" style={{fontSize:10,padding:'1px 6px'}}>Free</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Available drivers ── */}
        <div className="adm-dp-right">
          <div className="adm-panel-hdr">
            <span className="adm-panel-title">Available Drivers</span>
            <span className="adm-panel-count">
              {selected ? `${selectedZone?.name||'All'} zone · ${assignableCount} assignable of ${candidateDrivers.length}` : 'Select an order to see matched drivers'}
            </span>
          </div>

          {selected && (
            <div className="adm-dp-banner">
              <div style={{width:8,height:8,borderRadius:'50%',background:'#2BAEDF',flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:700,color:'#156A8C'}}>Order {selected.order_ref} selected</span>
              <span style={{color:'#C0D8E0',margin:'0 5px'}}>·</span>
              <span style={{fontSize:12.5,color:'#6B7F74',fontWeight:600}}>
                Showing drivers matched to <strong style={{color:'#122B1D'}}>{selectedZone?.name||'all zones'}</strong>
              </span>
            </div>
          )}

          <div className="adm-panel-list" style={{padding:14,gap:9}}>
            {!selected && (
              <div className="adm-empty" style={{paddingTop:80}}>
                <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#D0DAD4" strokeWidth="1.2"><path d="M4 6h16M4 10h16M4 14h8"/></svg>
                <div className="adm-empty-title">Select an order</div>
                <div style={{fontSize:12,color:'#9EB3A6'}}>Pick an unassigned order on the left to see eligible drivers</div>
              </div>
            )}
            {selected && candidateDrivers.length === 0 && (
              <div className="adm-empty" style={{paddingTop:60}}>
                <div className="adm-empty-title">No eligible drivers</div>
                <div style={{fontSize:12,color:'#9EB3A6',maxWidth:240}}>No active drivers assigned to the <strong>{selectedZone?.name}</strong> zone.</div>
              </div>
            )}
            {selected && candidateDrivers.map(d => {
              const full = d.current_load >= d.max_concurrent_orders;
              return (
                <div key={d.id} className={`adm-drv-card${full?' disabled':' available'}`} onClick={()=>!full&&assign(d)}>
                  <div className="adm-avatar" style={{background:avatarColor(d.name),width:40,height:40,fontSize:14,flexShrink:0}}>{initials(d.name)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:14.5,fontWeight:700,color:'#122B1D',marginBottom:3}}>{d.name}</div>
                    <div style={{display:'flex',alignItems:'center',gap:9,fontSize:12.5,color:'#6B7F74',fontWeight:600}}>
                      <span style={{display:'flex',alignItems:'center',gap:4}}><Truck size={13}/> {d.vehicle_type}</span>
                      {d.zones[0] && <span className="adm-zone-chip" style={{padding:'2px 8px',fontSize:11}}>{d.zones[0].name}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:7,flexShrink:0}}>
                    <LoadBar current={d.current_load} max={d.max_concurrent_orders}/>
                    {full
                      ? <span style={{fontSize:11,fontWeight:800,color:'#C8372D',letterSpacing:'0.06em',textTransform:'uppercase'}}>At Capacity</span>
                      : <button className="adm-btn adm-btn-primary" style={{padding:'7px 20px',fontSize:13}} disabled={assigning}>Assign →</button>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {routeOrders && (
        <RouteMapModal orders={routeOrders} onClose={() => setRouteOrders(null)} />
      )}
    </div>
  );
}
