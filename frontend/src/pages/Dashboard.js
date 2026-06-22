import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const AVATAR_COLORS = ['#1A7DA8','#0B5132','#7A5210','#156A8C','#6B7F74','#B83028','#2D6E4E','#8C4A15'];
function initials(name) { return (name||'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'?'; }
function avatarColor(name) { let h=0; for(let c of (name||'')) h=(h*31+c.charCodeAt(0))%AVATAR_COLORS.length; return AVATAR_COLORS[h]; }

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="adm-kpi" style={{ flex: 1 }}>
      <div className="adm-kpi-lbl">{label}</div>
      <div className="adm-kpi-val" style={{ color, fontSize: 28 }}>{value}</div>
      {sub && <div className="adm-kpi-sub">{sub}</div>}
    </div>
  );
}

function HBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#E2E9E4', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#6B7F74', width: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// Mini donut using SVG
function Donut({ delivered, failed, inProgress, unassigned }) {
  const total = delivered + failed + inProgress + unassigned || 1;
  const SEGMENTS = [
    { val: delivered,  color: '#0B5132', label: 'Delivered' },
    { val: inProgress, color: '#1A7DA8', label: 'In Progress' },
    { val: unassigned, color: '#F2AF1F', label: 'Unassigned' },
    { val: failed,     color: '#C8372D', label: 'Failed' },
  ];
  const R = 54, CX = 64, CY = 64, stroke = 18;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const arcs = SEGMENTS.map(s => {
    const dash = (s.val / total) * circ;
    const arc = { ...s, dash, gap: circ - dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={128} height={128} viewBox="0 0 128 128">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E2E9E4" strokeWidth={stroke} />
        {arcs.filter(a => a.val > 0).map((a, i) => (
          <circle key={i} cx={CX} cy={CY} r={R} fill="none"
            stroke={a.color} strokeWidth={stroke}
            strokeDasharray={`${a.dash} ${a.gap}`}
            strokeDashoffset={-a.offset + circ / 4}
            style={{ transition: 'stroke-dasharray .4s' }} />
        ))}
        <text x={CX} y={CY - 5} textAnchor="middle" fontSize="18" fontWeight="800" fontFamily="'Sora',sans-serif" fill="#122B1D">{total}</text>
        <text x={CX} y={CY + 13} textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="'Manrope',sans-serif" fill="#9EB3A6">orders</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {SEGMENTS.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#122B1D', flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.val}</span>
            <span style={{ fontSize: 11, color: '#9EB3A6', fontWeight: 600, width: 34, textAlign: 'right' }}>
              {total > 1 ? Math.round((s.val / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ tenant }) {
  const [orders, setOrders] = useState([]);
  const [zones, setZones] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const load = useCallback(() => Promise.all([
    api.getOrders(tenant.id, {}).then(setOrders),
    api.getZones(tenant.id).then(setZones),
    api.getDrivers(tenant.id).then(setDrivers),
  ]), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  const delivered  = orders.filter(o => o.status === 'Delivered').length;
  const failed     = orders.filter(o => o.status === 'Failed').length;
  const inProgress = orders.filter(o => ['Assigned','Picked Up'].includes(o.status)).length;
  const unassigned = orders.filter(o => o.status === 'Unassigned').length;
  const total      = orders.length;
  const rate       = total ? Math.round((delivered / total) * 100) : 0;

  // Zone breakdown
  const zoneStats = zones.map(z => {
    const zo = orders.filter(o => o.zone_id === z.id);
    return {
      ...z,
      total:      zo.length,
      delivered:  zo.filter(o => o.status === 'Delivered').length,
      failed:     zo.filter(o => o.status === 'Failed').length,
      unassigned: zo.filter(o => o.status === 'Unassigned').length,
      inProgress: zo.filter(o => ['Assigned','Picked Up'].includes(o.status)).length,
    };
  }).sort((a, b) => b.total - a.total);

  const maxZone = Math.max(...zoneStats.map(z => z.total), 1);

  // Driver load
  const activeDrivers = drivers.filter(d => d.active);
  const busyDrivers   = activeDrivers.filter(d => d.current_load > 0);
  const fullDrivers   = activeDrivers.filter(d => d.current_load >= d.max_concurrent_orders);

  return (
    <div className="adm-content" style={{ overflow: 'auto' }}>
      {/* KPI Row */}
      <div style={{ display: 'flex', gap: 12 }}>
        <KpiCard label="Total Orders"    value={total}      color="#122B1D" sub="all time" />
        <KpiCard label="Delivery Rate"   value={`${rate}%`} color="#0B5132" sub={`${delivered} delivered`} />
        <KpiCard label="In Progress"     value={inProgress} color="#1A7DA8" sub="active deliveries" />
        <KpiCard label="Unassigned"      value={unassigned} color="#F2AF1F" sub="awaiting dispatch" />
        <KpiCard label="Failed"          value={failed}     color="#C8372D" sub="delivery failed" />
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>

          {/* Order status donut */}
          <div className="adm-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700, color: '#122B1D', marginBottom: 14 }}>Order Status Breakdown</div>
            <Donut delivered={delivered} failed={failed} inProgress={inProgress} unassigned={unassigned} />
          </div>

          {/* Driver load */}
          <div className="adm-card" style={{ overflow: 'hidden' }}>
            <div className="adm-card-hdr">
              <span className="adm-card-title">Driver Capacity</span>
              <span className="adm-card-sub">{busyDrivers.length} busy · {fullDrivers.length} at max · {activeDrivers.length - busyDrivers.length} free</span>
            </div>
            <table className="adm-table">
              <thead><tr><th>Driver</th><th>Vehicle</th><th>Load</th><th>Capacity</th></tr></thead>
              <tbody>
                {activeDrivers.sort((a, b) => b.current_load - a.current_load).map(d => {
                  const pct = d.max_concurrent_orders > 0 ? (d.current_load / d.max_concurrent_orders) * 100 : 0;
                  const color = pct >= 100 ? '#C8372D' : pct >= 67 ? '#F2AF1F' : '#0B5132';
                  return (
                    <tr key={d.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div className="adm-avatar" style={{ background: avatarColor(d.name), width: 28, height: 28, fontSize: 11 }}>{initials(d.name)}</div>
                          <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700 }}>{d.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12.5, color: '#6B7F74', fontWeight: 600 }}>{d.vehicle_type}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 80, height: 6, background: '#E2E9E4', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .3s' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 800, color }}>{d.current_load}/{d.max_concurrent_orders}</span>
                        </div>
                      </td>
                      <td>
                        {pct >= 100 ? <span className="adm-badge adm-badge-failed">Full</span>
                          : pct >= 67 ? <span className="adm-badge adm-badge-pickup">Busy</span>
                          : d.current_load > 0 ? <span className="adm-badge adm-badge-assigned">Active</span>
                          : <span className="adm-badge adm-badge-active">Free</span>}
                      </td>
                    </tr>
                  );
                })}
                {activeDrivers.length === 0 && (
                  <tr><td colSpan={4}><div className="adm-empty">No active drivers</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column — zone breakdown */}
        <div className="adm-card" style={{ width: 320, flexShrink: 0, overflow: 'auto' }}>
          <div className="adm-card-hdr">
            <span className="adm-card-title">Zone Performance</span>
            <span className="adm-card-sub">{zones.length} zones</span>
          </div>
          {zoneStats.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9EB3A6', fontSize: 13, fontWeight: 600 }}>No zone data yet</div>
          )}
          {zoneStats.map(z => {
            const rate = z.total > 0 ? Math.round((z.delivered / z.total) * 100) : 0;
            return (
              <div key={z.id} style={{ padding: '12px 16px', borderBottom: '1px solid #F2F6F3' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: z.color || '#0B5132', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, flex: 1 }}>{z.name}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0B5132' }}>{rate}%</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginBottom: 8 }}>
                  {[['✓', z.delivered, '#0B5132'], ['⚡', z.inProgress, '#1A7DA8'], ['⏳', z.unassigned, '#F2AF1F'], ['✗', z.failed, '#C8372D']].map(([icon, val, col]) => (
                    <div key={icon} style={{ textAlign: 'center', padding: '4px 0' }}>
                      <div style={{ fontSize: 10, color: '#9EB3A6', fontWeight: 700 }}>{icon}</div>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: col }}>{val}</div>
                    </div>
                  ))}
                </div>

                <HBar value={z.total} max={maxZone} color={z.color || '#0B5132'} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
