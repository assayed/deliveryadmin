import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const Chevron = ({size=12}) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>;

const AVATAR_COLORS = ['#1A7DA8','#0B5132','#7A5210','#156A8C','#6B7F74','#B83028','#2D6E4E','#8C4A15'];
function initials(name) { return name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join(''); }
function avatarColor(name) {
  let h = 0; for (let c of name) h=(h*31+c.charCodeAt(0))%AVATAR_COLORS.length; return AVATAR_COLORS[h];
}

export default function Reports({ tenant }) {
  const [data, setData] = useState(null);

  const load = useCallback(() => api.getReports(tenant.id).then(setData), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="adm-empty" style={{height:'60vh'}}><div className="adm-empty-title">Loading reports…</div></div>;

  const { summary, byDriver, byZone, failedReasons } = data;
  const rate = summary.total ? ((summary.delivered / summary.total) * 100).toFixed(0) : 0;
  const failRate = summary.total ? ((summary.failed / summary.total) * 100).toFixed(1) : 0;

  const kpis = [
    { label:'Delivery Rate',           value:`${rate}%`,            sub:`${summary.delivered} of ${summary.total} orders delivered`, accent:'#0B5132' },
    { label:'In Progress',             value:summary.inProgress,    sub:'Assigned + Picked Up',              accent:'#156A8C' },
    { label:'Unassigned',              value:summary.unassigned,    sub:'Awaiting dispatch',                  accent:'#8A6210' },
    { label:'Failed Deliveries',       value:summary.failed,        sub:`${failRate}% failure rate`,          accent:'#C8372D' },
  ];

  const maxDelivered = Math.max(...byDriver.map(d=>d.delivered||0), 1);
  const maxZone = Math.max(...byZone.map(z=>z.total||0), 1);

  return (
    <div className="adm-content" style={{overflow:'auto'}}>
      {/* KPI Row */}
      <div style={{display:'flex',gap:14,flexShrink:0}}>
        {kpis.map(k=>(
          <div key={k.label} className="adm-kpi">
            <div className="adm-kpi-lbl">{k.label}</div>
            <div className="adm-kpi-val" style={{color:k.accent}}>{k.value}</div>
            <div className="adm-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{display:'flex',gap:14,flex:1}}>
        {/* Driver performance table */}
        <div className="adm-card" style={{flex:1,overflow:'hidden'}}>
          <div className="adm-card-hdr">
            <span className="adm-card-title">Driver Performance</span>
            <span className="adm-card-sub">Completion rate · total activity</span>
          </div>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Delivered</th>
                <th>Failed</th>
                <th>Completion Rate</th>
                <th>In Progress</th>
              </tr>
            </thead>
            <tbody>
              {byDriver.map(d => {
                const r = d.total > 0 ? Math.round((d.delivered/d.total)*100) : 0;
                const inProg = d.total - d.delivered - d.failed;
                return (
                  <tr key={d.driver_id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:9}}>
                        <div className="adm-avatar" style={{background:avatarColor(d.driver_name),width:28,height:28,fontSize:11}}>{initials(d.driver_name)}</div>
                        <span style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:700}}>{d.driver_name}</span>
                      </div>
                    </td>
                    <td><span style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:'#0B5132'}}>{d.delivered}</span></td>
                    <td><span style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:d.failed>0?'#C8372D':'#9EB3A6'}}>{d.failed}</span></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:9}}>
                        <div style={{flex:1,height:5,background:'#E2E9E4',borderRadius:3,overflow:'hidden',minWidth:60}}>
                          <div style={{height:'100%',borderRadius:3,width:`${r}%`,background:r>=90?'#0B5132':r>=80?'#F2AF1F':'#C8372D',transition:'width .3s'}}/>
                        </div>
                        <span style={{fontSize:12.5,fontWeight:800,color:'#122B1D',width:36}}>{r}%</span>
                      </div>
                    </td>
                    <td style={{fontSize:13,fontWeight:600,color:'#3D5247'}}>{inProg > 0 ? inProg : <span style={{color:'#C8D8CF'}}>—</span>}</td>
                  </tr>
                );
              })}
              {byDriver.length===0 && (
                <tr><td colSpan={5}><div className="adm-empty">No driver data yet</div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Side column */}
        <div style={{width:288,display:'flex',flexDirection:'column',gap:14,flexShrink:0}}>
          {/* Failure reasons */}
          <div className="adm-card">
            <div className="adm-card-hdr">
              <span className="adm-card-title">Failure Reasons</span>
              <span className="adm-card-sub">{summary.failed} failures</span>
            </div>
            {failedReasons.length === 0 && (
              <div style={{padding:'24px 16px',textAlign:'center',color:'#9EB3A6',fontSize:13,fontWeight:600}}>No failures recorded</div>
            )}
            {failedReasons.map(r => (
              <div key={r.failed_reason} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:'1px solid #F2F6F3'}}>
                <span style={{fontSize:12.5,fontWeight:600,color:'#122B1D',flex:1}}>{r.failed_reason}</span>
                <div style={{width:70,height:6,background:'#F4F6F5',borderRadius:3,overflow:'hidden',flexShrink:0}}>
                  <div style={{height:'100%',background:'#C8372D',borderRadius:3,width:`${summary.failed>0?Math.round((r.count/summary.failed)*100):0}%`}}/>
                </div>
                <span style={{fontSize:12,fontWeight:800,color:'#6B7F74',width:16,textAlign:'right'}}>{r.count}</span>
              </div>
            ))}
          </div>

          {/* Zone performance */}
          <div className="adm-card" style={{padding:'14px 16px'}}>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:700,color:'#122B1D',marginBottom:12}}>Zone Performance</div>
            {byZone.length === 0 && <div style={{color:'#9EB3A6',fontSize:12,fontWeight:600}}>No zone data yet</div>}
            {byZone.map(z => {
              const pct = z.total > 0 ? Math.round((z.delivered/z.total)*100) : 0;
              return (
                <div key={z.zone_id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <span style={{fontSize:12,fontWeight:700,color:'#122B1D',width:130,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{z.zone_name}</span>
                  <div style={{flex:1,height:5,background:'#E2E9E4',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',background:'#0B5132',borderRadius:3,width:`${pct}%`,transition:'width .3s'}}/>
                  </div>
                  <span style={{fontSize:11.5,fontWeight:800,color:'#6B7F74',width:32,textAlign:'right'}}>{pct}%</span>
                </div>
              );
            })}
          </div>

          {/* Order status breakdown */}
          <div className="adm-card" style={{padding:'14px 16px'}}>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:700,color:'#122B1D',marginBottom:12}}>Orders Today</div>
            {[['Delivered','#0B5132',summary.delivered],['In Progress','#156A8C',summary.inProgress],['Unassigned','#8A6210',summary.unassigned],['Failed','#C8372D',summary.failed]].map(([label,color,count])=>(
              <div key={label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}>
                <div style={{width:8,height:8,borderRadius:2,background:color,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:600,color:'#122B1D',flex:1}}>{label}</span>
                <span style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,color}}>{count}</span>
                <span style={{fontSize:11,fontWeight:700,color:'#9EB3A6',width:32,textAlign:'right'}}>
                  {summary.total > 0 ? Math.round((count/summary.total)*100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
