import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const Chevron = ({size=12}) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>;
const Download = ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M7 10L3 6h3V1h2v5h3L7 10zM1 12h12v1.5H1V12z"/></svg>;

const AVATAR_COLORS = ['#1A7DA8','#0B5132','#7A5210','#156A8C','#6B7F74','#B83028','#2D6E4E','#8C4A15'];
function initials(name) { return (name||'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('') || '?'; }
function avatarColor(name) { let h=0; for(let c of (name||'')) h=(h*31+c.charCodeAt(0))%AVATAR_COLORS.length; return AVATAR_COLORS[h]; }

function OverviewTab({ tenant }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => api.getReports(tenant.id).then(setData), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="adm-empty" style={{height:'40vh'}}><div className="adm-empty-title">Loading…</div></div>;
  const { summary, byDriver, byZone, failedReasons } = data;
  const rate = summary.total ? ((summary.delivered / summary.total) * 100).toFixed(0) : 0;
  const failRate = summary.total ? ((summary.failed / summary.total) * 100).toFixed(1) : 0;

  const kpis = [
    { label:'Delivery Rate', value:`${rate}%`, sub:`${summary.delivered} of ${summary.total} delivered`, accent:'#0B5132' },
    { label:'In Progress', value:summary.inProgress, sub:'Assigned + Picked Up', accent:'#156A8C' },
    { label:'Unassigned', value:summary.unassigned, sub:'Awaiting dispatch', accent:'#8A6210' },
    { label:'Failed', value:summary.failed, sub:`${failRate}% failure rate`, accent:'#C8372D' },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:14}}>
        {kpis.map(k=>(
          <div key={k.label} className="adm-kpi">
            <div className="adm-kpi-lbl">{k.label}</div>
            <div className="adm-kpi-val" style={{color:k.accent}}>{k.value}</div>
            <div className="adm-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:14,flex:1}}>
        <div className="adm-card" style={{flex:1,overflow:'hidden'}}>
          <div className="adm-card-hdr"><span className="adm-card-title">Driver Performance</span></div>
          <table className="adm-table">
            <thead><tr><th>Driver</th><th>Delivered</th><th>Failed</th><th>Rate</th><th>Active</th></tr></thead>
            <tbody>
              {byDriver.map(d => {
                const r = d.total > 0 ? Math.round((d.delivered/d.total)*100) : 0;
                return (
                  <tr key={d.driver_id}>
                    <td><div style={{display:'flex',alignItems:'center',gap:9}}>
                      <div className="adm-avatar" style={{background:avatarColor(d.driver_name),width:28,height:28,fontSize:11}}>{initials(d.driver_name)}</div>
                      <span style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:700}}>{d.driver_name}</span>
                    </div></td>
                    <td><span style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:'#0B5132'}}>{d.delivered}</span></td>
                    <td><span style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:d.failed>0?'#C8372D':'#9EB3A6'}}>{d.failed}</span></td>
                    <td><div style={{display:'flex',alignItems:'center',gap:9}}>
                      <div style={{flex:1,height:5,background:'#E2E9E4',borderRadius:3,overflow:'hidden',minWidth:60}}>
                        <div style={{height:'100%',borderRadius:3,width:`${r}%`,background:r>=90?'#0B5132':r>=70?'#F2AF1F':'#C8372D',transition:'width .3s'}}/>
                      </div>
                      <span style={{fontSize:12.5,fontWeight:800,color:'#122B1D',width:36}}>{r}%</span>
                    </div></td>
                    <td style={{fontSize:13,fontWeight:600,color:'#3D5247'}}>{d.total-d.delivered-d.failed||<span style={{color:'#C8D8CF'}}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{width:280,display:'flex',flexDirection:'column',gap:14,flexShrink:0}}>
          <div className="adm-card">
            <div className="adm-card-hdr"><span className="adm-card-title">Failure Reasons</span><span className="adm-card-sub">{summary.failed} total</span></div>
            {failedReasons.length===0 && <div style={{padding:'20px 16px',textAlign:'center',color:'#9EB3A6',fontSize:13,fontWeight:600}}>No failures</div>}
            {failedReasons.map(r=>(
              <div key={r.failed_reason} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:'1px solid #F2F6F3'}}>
                <span style={{fontSize:12.5,fontWeight:600,color:'#122B1D',flex:1}}>{r.failed_reason}</span>
                <div style={{width:60,height:5,background:'#F4F6F5',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',background:'#C8372D',borderRadius:3,width:`${summary.failed>0?Math.round((r.count/summary.failed)*100):0}%`}}/>
                </div>
                <span style={{fontSize:12,fontWeight:800,color:'#6B7F74',width:18,textAlign:'right'}}>{r.count}</span>
              </div>
            ))}
          </div>
          <div className="adm-card" style={{padding:'14px 16px'}}>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:700,color:'#122B1D',marginBottom:12}}>Zone Performance</div>
            {byZone.map(z=>{
              const pct=z.total>0?Math.round((z.delivered/z.total)*100):0;
              return(
                <div key={z.zone_id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <span style={{fontSize:12,fontWeight:700,color:'#122B1D',width:120,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{z.zone_name}</span>
                  <div style={{flex:1,height:5,background:'#E2E9E4',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',background:'#0B5132',borderRadius:3,width:`${pct}%`,transition:'width .3s'}}/>
                  </div>
                  <span style={{fontSize:11.5,fontWeight:800,color:'#6B7F74',width:32,textAlign:'right'}}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialTab({ tenant }) {
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState({ company_id:'', date_from:'', date_to:'' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getCompanies(tenant.id).then(setCompanies); }, [tenant.id]);

  const run = async () => {
    setLoading(true);
    try { setData(await api.getFinancialReport(tenant.id, filters)); }
    catch(e) { alert(e.response?.data?.error || 'Failed to load report'); }
    setLoading(false);
  };

  const downloadCsv = async () => {
    const blob = await api.getFinancialReportCsv(tenant.id, filters);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='financial-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const STATUS_BADGE = {
    Delivered: 'adm-badge-delivered', Failed: 'adm-badge-failed',
    Assigned: 'adm-badge-assigned', 'Picked Up': 'adm-badge-pickup', Unassigned: 'adm-badge-unassigned',
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {/* Filters */}
      <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap',background:'#fff',padding:'14px 18px',borderRadius:12,border:'1px solid #E2E9E4'}}>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <span style={{fontSize:11,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase',color:'#9EB3A6'}}>Company</span>
          <div className="adm-field-select" style={{minWidth:170}}>
            <select value={filters.company_id} onChange={e=>setFilters(f=>({...f,company_id:e.target.value}))}>
              <option value="">All Companies</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name_en}</option>)}
            </select><Chevron/>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <span style={{fontSize:11,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase',color:'#9EB3A6'}}>From</span>
          <input type="date" className="adm-field-input" value={filters.date_from} onChange={e=>setFilters(f=>({...f,date_from:e.target.value}))} style={{width:145,height:38}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <span style={{fontSize:11,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase',color:'#9EB3A6'}}>To</span>
          <input type="date" className="adm-field-input" value={filters.date_to} onChange={e=>setFilters(f=>({...f,date_to:e.target.value}))} style={{width:145,height:38}}/>
        </div>
        <button className="adm-btn adm-btn-primary" style={{height:38,padding:'0 20px'}} onClick={run} disabled={loading}>{loading?'Loading…':'Run Report'}</button>
        {data && <button className="adm-btn adm-btn-ghost" style={{height:38,gap:6}} onClick={downloadCsv}><Download size={13}/> Export CSV</button>}
      </div>

      {/* Summary KPIs */}
      {data && (
        <div style={{display:'flex',gap:14}}>
          {[
            { label:'Total Orders', value:data.summary.total, accent:'#0B5132' },
            { label:'Total Revenue', value:`SAR ${data.summary.total_fee?.toFixed(2)||'0.00'}`, accent:'#156A8C' },
            { label:'Free Deliveries', value:data.summary.free_count, accent:'#8A6210' },
            { label:'Avg Fee / Order', value: data.summary.total > 0 ? `SAR ${((data.summary.total_fee||0)/(data.summary.total - data.summary.free_count||1)).toFixed(2)}` : '—', accent:'#6B7F74' },
          ].map(k=>(
            <div key={k.label} className="adm-kpi">
              <div className="adm-kpi-lbl">{k.label}</div>
              <div className="adm-kpi-val" style={{color:k.accent,fontSize:22}}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {data && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Status</th>
                <th>Driver</th>
                <th>Company</th>
                <th>Zone</th>
                <th>Time Slot</th>
                <th>Date</th>
                <th>Fee (SAR)</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,color:'#6B7F74',letterSpacing:'.06em'}}>{r.order_ref}</td>
                  <td><span className={`adm-badge ${STATUS_BADGE[r.status]||'adm-badge-inactive'}`}>{r.status}</span></td>
                  <td style={{fontSize:13,fontWeight:600}}>{r.driver_name||<span style={{color:'#C8D8CF'}}>—</span>}</td>
                  <td style={{fontSize:13}}>{r.company_name||<span style={{color:'#C8D8CF'}}>—</span>}</td>
                  <td>{r.zone_name ? <span className="adm-zone-chip">{r.zone_name}</span> : <span style={{color:'#C8D8CF',fontSize:12}}>—</span>}</td>
                  <td style={{fontSize:12,color:'#6B7F74',fontWeight:600}}>
                    {r.time_slot_name ? `${r.time_slot_name} ${r.start_time}–${r.end_time}` : <span style={{color:'#C8D8CF'}}>—</span>}
                  </td>
                  <td style={{fontSize:12.5,color:'#6B7F74',fontWeight:600,whiteSpace:'nowrap'}}>{r.created_at?.slice(0,10)||'—'}</td>
                  <td>
                    {r.free_delivery
                      ? <span className="adm-badge adm-badge-active" style={{fontSize:11}}>Free</span>
                      : <span style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:700,color:r.delivery_fee>0?'#0B5132':'#9EB3A6'}}>{r.delivery_fee?.toFixed(2)||'0.00'}</span>}
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan={8}><div className="adm-empty"><div className="adm-empty-title">No orders match filters</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!data && !loading && (
        <div className="adm-empty" style={{height:'30vh'}}>
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#D0DAD4" strokeWidth="1.2"><path d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3M13 21h8M17 17l4 4M17 21l4-4"/></svg>
          <div className="adm-empty-title">Set filters and run report</div>
          <div style={{fontSize:12.5,color:'#9EB3A6'}}>Choose a company and date range, then click Run Report</div>
        </div>
      )}
    </div>
  );
}

function RouteTab({ tenant }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const run = async () => {
    setLoading(true);
    try { setData(await api.getRouteReport(tenant.id)); }
    catch(e) { alert(e.response?.data?.error || 'Failed to load route report'); }
    setLoading(false);
  };

  useEffect(() => { run(); }, []);

  const SBADGE = {
    Assigned: 'adm-badge-assigned', 'Picked Up': 'adm-badge-pickup',
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',padding:'12px 18px',borderRadius:12,border:'1px solid #E2E9E4'}}>
        <div>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700}}>Best Route Per Driver</div>
          <div style={{fontSize:12.5,color:'#6B7F74',fontWeight:600,marginTop:2}}>Nearest-neighbour optimised route for drivers with active orders (Assigned / Picked Up)</div>
        </div>
        <button className="adm-btn adm-btn-ghost" style={{gap:6}} onClick={run} disabled={loading}>
          <svg width={13} height={13} viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a7 7 0 100 14A7 7 0 0010 3zm-1 4l3 3-3 3V7zm-2 3a5 5 0 118.66 2.5l-1.41-1.42A3 3 0 107 10H5z"/></svg>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {data && data.length === 0 && (
        <div className="adm-empty" style={{height:'30vh'}}>
          <div className="adm-empty-title">No active deliveries</div>
          <div style={{fontSize:12.5,color:'#9EB3A6'}}>No drivers have Assigned or Picked Up orders right now</div>
        </div>
      )}

      {data && data.map((driver, di) => (
        <div key={driver.id} className="adm-card" style={{overflow:'hidden'}}>
          {/* Driver header */}
          <div style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',background: expanded===driver.id?'#F8FAF9':'#fff'}}
            onClick={()=>setExpanded(e=>e===driver.id?null:driver.id)}>
            <div className="adm-avatar" style={{background:avatarColor(driver.name),width:42,height:42,fontSize:15,flexShrink:0}}>{initials(driver.name)}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:14.5,fontWeight:700,color:'#122B1D'}}>{driver.name}</div>
              <div style={{fontSize:12.5,color:'#6B7F74',fontWeight:600,display:'flex',gap:10,marginTop:2}}>
                <span>{driver.vehicle_type}</span>
                {driver.phone && <span>·</span>}
                {driver.phone && <span>{driver.phone}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:20,alignItems:'center'}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:800,color:'#0B5132'}}>{driver.order_count}</div>
                <div style={{fontSize:11,fontWeight:700,color:'#9EB3A6',textTransform:'uppercase',letterSpacing:'.06em'}}>stops</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:800,color:'#156A8C'}}>{driver.total_distance_km}</div>
                <div style={{fontSize:11,fontWeight:700,color:'#9EB3A6',textTransform:'uppercase',letterSpacing:'.06em'}}>km est.</div>
              </div>
              <svg width={16} height={16} viewBox="0 0 12 12" fill="none" stroke="#9EB3A6" strokeWidth="2" strokeLinecap="round"
                style={{transform: expanded===driver.id?'rotate(180deg)':'rotate(0deg)',transition:'.2s'}}>
                <path d="M2 4l4 4 4-4"/>
              </svg>
            </div>
          </div>

          {/* Stop list */}
          {expanded === driver.id && (
            <div style={{borderTop:'1px solid #E2E9E4'}}>
              {driver.orders.map((o, i) => (
                <div key={o.id} style={{display:'flex',alignItems:'flex-start',gap:14,padding:'12px 20px',borderBottom:'1px solid #F4F6F5',background:i%2===0?'#fff':'#FAFCFA'}}>
                  {/* Step number */}
                  <div style={{width:28,height:28,borderRadius:'50%',background:i===0?'#0B5132':'#E7F0EB',color:i===0?'#fff':'#0B5132',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,flexShrink:0,marginTop:2}}>
                    {i + 1}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                      <span style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,color:'#6B7F74',letterSpacing:'.08em'}}>{o.order_ref}</span>
                      <span className={`adm-badge ${SBADGE[o.status]||'adm-badge-inactive'}`} style={{fontSize:10}}>{o.status}</span>
                      {o.free_delivery ? <span className="adm-badge adm-badge-active" style={{fontSize:10}}>Free</span> : null}
                    </div>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:700,marginBottom:2}}>{o.customer_name}</div>
                    <div style={{fontSize:12.5,color:'#6B7F74',fontWeight:600,display:'flex',gap:8,flexWrap:'wrap'}}>
                      <span>📍 {o.customer_address}</span>
                      {o.zone_name && <span className="adm-zone-chip" style={{fontSize:11}}>{o.zone_name}</span>}
                    </div>
                    {o.notes && <div style={{fontSize:12,color:'#9EB3A6',fontWeight:600,marginTop:3}}>📝 {o.notes}</div>}
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    {o.dist_km != null && o.dist_km > 0 && (
                      <div style={{fontSize:12,fontWeight:800,color:'#156A8C'}}>+{o.dist_km} km</div>
                    )}
                    <div style={{fontSize:11.5,color:'#9EB3A6',fontWeight:600}}>{o.customer_phone}</div>
                  </div>
                </div>
              ))}
              <div style={{padding:'10px 20px',background:'#F8FAF9',display:'flex',alignItems:'center',gap:10,fontSize:12.5,fontWeight:700,color:'#6B7F74'}}>
                <svg width={14} height={14} viewBox="0 0 20 20" fill="currentColor" style={{color:'#0B5132'}}><path d="M4 15s0-4 4-4 8-4 8-8M4 15l-2-2m2 2l2-2"/></svg>
                Total estimated route: <strong style={{color:'#0B5132'}}>{driver.total_distance_km} km</strong> across <strong style={{color:'#0B5132'}}>{driver.order_count} stops</strong>
                <span style={{marginLeft:'auto',fontSize:11,color:'#9EB3A6'}}>Nearest-neighbour algorithm from Riyadh centre</span>
              </div>
            </div>
          )}
        </div>
      ))}

      {!data && !loading && (
        <div className="adm-empty" style={{height:'30vh'}}>
          <div className="adm-empty-title">Click Refresh to load routes</div>
        </div>
      )}
    </div>
  );
}

export default function Reports({ tenant }) {
  const [tab, setTab] = useState('overview');

  const TABS = [
    { id:'overview',  label:'Operations Overview' },
    { id:'financial', label:'Financial Reconciliation' },
    { id:'routes',    label:'Best Route by Driver' },
  ];

  return (
    <div className="adm-content" style={{overflow:'auto'}}>
      <div style={{display:'flex',gap:4,marginBottom:18,borderBottom:'2px solid #E2E9E4',paddingBottom:0}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'9px 18px',background:'none',border:'none',borderBottom:`2.5px solid ${tab===t.id?'#0B5132':'transparent'}`,color:tab===t.id?'#0B5132':'#6B7F74',fontFamily:"'Manrope',sans-serif",fontSize:13.5,fontWeight:700,cursor:'pointer',marginBottom:-2,transition:'.15s'}}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==='overview'  && <OverviewTab tenant={tenant}/>}
      {tab==='financial' && <FinancialTab tenant={tenant}/>}
      {tab==='routes'    && <RouteTab tenant={tenant}/>}
    </div>
  );
}
