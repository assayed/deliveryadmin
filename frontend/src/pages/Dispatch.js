import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const Clock =   ({size=12}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M7 0a7 7 0 100 14A7 7 0 007 0zm.5 7.7L5 6.3V3h1v2.9l2 1.3-.5.5z"/></svg>;
const Pin =     ({size=11}) => <svg width={size} height={size} viewBox="0 0 14 16" fill="currentColor"><path d="M7 0C4.24 0 2 2.24 2 5c0 4.25 5 10 5 10s5-5.75 5-10c0-2.76-2.24-5-5-5zm0 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>;
const Package = ({size=12}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M7 .5L.5 4v6L7 13.5 13.5 10V4L7 .5zm0 1.9L12 5 7 7.4 2 5l5-2.6zM1.5 6l5 2.5V12L1.5 9.5V6zm6 6V8.5L13 6v3.5L7.5 12z"/></svg>;
const Truck =   ({size=13}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M1 4h12v8H1V4zm13 2h2l2 3v3h-4V6zM4 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm10 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>;
const Refresh = ({size=14}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a7 7 0 100 14A7 7 0 0010 3zm-1 4l3 3-3 3V7zm-2 3a5 5 0 118.66 2.5l-1.41-1.42A3 3 0 107 10H5z"/></svg>;

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
function avatarColor(name) {
  let h = 0; for (let c of name) h = (h*31+c.charCodeAt(0))%AVATAR_COLORS.length; return AVATAR_COLORS[h];
}

function waitLabel(createdAt) {
  const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins/60)}h ${mins%60}m`;
}

export default function Dispatch({ tenant }) {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [zones, setZones] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterZone, setFilterZone] = useState('all');
  const [assigning, setAssigning] = useState(false);
  const [feedback, setFeedback] = useState(null); // {type:'success'|'error', msg}

  const load = useCallback(() => Promise.all([
    api.getOrders(tenant.id, { status: 'Unassigned' }).then(setOrders),
    api.getDrivers(tenant.id).then(setDrivers),
    api.getZones(tenant.id).then(setZones),
  ]), [tenant.id]);

  useEffect(() => { load(); }, [load]);

  const filteredOrders = filterZone === 'all' ? orders : orders.filter(o => o.zone_id === filterZone);

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
      setSelected(null);
      load();
      setTimeout(() => setFeedback(null), 3500);
    } catch(e) {
      setFeedback({ type:'error', msg: e.response?.data?.error || 'Assignment failed' });
      setTimeout(() => setFeedback(null), 3500);
    }
    setAssigning(false);
  };

  const selectedZone = zones.find(z => z.id === selected?.zone_id);
  const assignableCount = candidateDrivers.filter(d => d.current_load < d.max_concurrent_orders).length;

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* Topbar actions row */}
      <div style={{padding:'12px 24px',borderBottom:'1px solid #E2E9E4',background:'#fff',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <span style={{fontSize:12.5,fontWeight:600,color:'#6B7F74'}}>Updated <strong style={{color:'#122B1D'}}>just now</strong></span>
        <button className="adm-btn adm-btn-ghost" style={{padding:'6px 12px',fontSize:12.5,gap:5}} onClick={load}><Refresh size={12}/> Refresh</button>
        {feedback && (
          <span className={`adm-alert ${feedback.type==='success'?'adm-alert-success':'adm-alert-error'}`} style={{padding:'5px 14px',marginLeft:6}}>
            {feedback.msg}
          </span>
        )}
        <span style={{marginLeft:'auto',fontSize:12.5,fontWeight:700,color:'#0B5132'}}>
          {orders.length} unassigned · {drivers.filter(d=>d.active && d.current_load < d.max_concurrent_orders).length} drivers available
        </span>
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
                <div style={{fontSize:12,color:'#9EB3A6'}}>No unassigned orders in this zone</div>
              </div>
            )}
            {filteredOrders.map(o => {
              const isSelected = selected?.id === o.id;
              const waitMins = Math.floor((Date.now() - new Date(o.created_at)) / 60000);
              const longWait = waitMins > 30;
              return (
                <div key={o.id} className={`adm-ord-card${isSelected?' sel':''}`} onClick={()=>setSelected(s=>s?.id===o.id?null:o)}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                    <span className="adm-ord-id">{o.order_ref}</span>
                    <span className={`adm-ord-wait${longWait?' long':''}`}><Clock size={11}/> {waitLabel(o.created_at)}</span>
                  </div>
                  <div className="adm-ord-customer">{o.customer_name}</div>
                  <div className="adm-ord-addr"><Pin/> {o.customer_address}</div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'1px solid #F2F6F3',paddingTop:7,marginTop:7}}>
                    {o.zone ? <span className="adm-zone-chip">{o.zone.name}</span> : <span style={{fontSize:11,color:'#C8D8CF'}}>No zone</span>}
                    {o.branch && <span style={{fontSize:11.5,color:'#6B7F74',fontWeight:600}}>{o.branch.name}</span>}
                    <span style={{fontSize:12,color:'#6B7F74',fontWeight:600,display:'flex',alignItems:'center',gap:4}}><Package/> {o.notes||'—'}</span>
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
              {selected ? `${selectedZone?.name || 'All'} zone · ${assignableCount} assignable of ${candidateDrivers.length}` : 'Select an order to see matched drivers'}
            </span>
          </div>

          {selected && (
            <div className="adm-dp-banner">
              <div style={{width:8,height:8,borderRadius:'50%',background:'#2BAEDF',flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:700,color:'#156A8C'}}>Order {selected.order_ref} selected</span>
              <span style={{color:'#C0D8E0',margin:'0 5px'}}>·</span>
              <span style={{fontSize:12.5,color:'#6B7F74',fontWeight:600}}>
                Showing drivers matched to <strong style={{color:'#122B1D'}}>{selectedZone?.name || 'all zones'}</strong>
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
                <div style={{fontSize:12,color:'#9EB3A6',maxWidth:240}}>
                  No active drivers are assigned to the <strong>{selectedZone?.name}</strong> zone. Check driver zone assignments.
                </div>
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
                      <span style={{color:'#D0DAD4'}}>·</span>
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

            {selected && candidateDrivers.length > 0 && (
              <div style={{marginTop:4,padding:'12px 14px',background:'#F8FAF9',borderRadius:11,border:'1px solid #E2E9E4',fontSize:12.5,color:'#6B7F74',fontWeight:600,lineHeight:1.55}}>
                <strong style={{color:'#122B1D'}}>Assignment is final.</strong> Once assigned, the driver's app queue updates instantly via push notification. No accept/reject step from the driver side.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
