import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart2 } from 'lucide-react';
import api from '../api';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed'];

export default function Reports({ tenant }) {
  const [data, setData] = useState(null);

  const load = useCallback(() => api.getReports(tenant.id).then(setData), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="loading">Loading reports…</div>;

  const { summary, byDriver, byZone, failedReasons } = data;
  const completionRate = summary.total ? ((summary.delivered / summary.total) * 100).toFixed(1) : 0;

  return (
    <div className="page">
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
        <BarChart2 size={18}/>
        <h2 style={{fontSize:16,fontWeight:600}}>Reports & Analytics</h2>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns:'repeat(5,1fr)'}}>
        <div className="stat-card"><div className="stat-label">Total Orders</div><div className="stat-value">{summary.total}</div></div>
        <div className="stat-card"><div className="stat-label">Delivered</div><div className="stat-value" style={{color:'var(--success)'}}>{summary.delivered}</div></div>
        <div className="stat-card"><div className="stat-label">Failed</div><div className="stat-value" style={{color:'var(--danger)'}}>{summary.failed}</div></div>
        <div className="stat-card"><div className="stat-label">In Progress</div><div className="stat-value" style={{color:'var(--primary)'}}>{summary.inProgress}</div></div>
        <div className="stat-card"><div className="stat-label">Completion Rate</div><div className="stat-value">{completionRate}%</div><div className="stat-sub">delivered / total</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <div className="card">
          <div className="card-header"><span className="card-title">Delivery by Driver</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDriver} margin={{top:0,bottom:0,left:-20,right:0}}>
                <XAxis dataKey="driver_name" tick={{fontSize:11}} interval={0} angle={-20} textAnchor="end" height={50}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip/>
                <Bar dataKey="delivered" fill="#16a34a" name="Delivered" radius={[3,3,0,0]}/>
                <Bar dataKey="failed" fill="#dc2626" name="Failed" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Delivery by Zone</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byZone} margin={{top:0,bottom:0,left:-20,right:0}}>
                <XAxis dataKey="zone_name" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip/>
                <Bar dataKey="delivered" fill="#2563eb" name="Delivered" radius={[3,3,0,0]}/>
                <Bar dataKey="failed" fill="#dc2626" name="Failed" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="card">
          <div className="card-header"><span className="card-title">Failed Delivery Reasons</span></div>
          <div className="card-body">
            {failedReasons.length === 0 ? (
              <div className="empty-state">No failed deliveries</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={failedReasons} dataKey="count" nameKey="failed_reason" cx="50%" cy="50%" outerRadius={80} label={({name,percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                    {failedReasons.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Driver Performance</span></div>
          <div className="card-body">
            <table>
              <thead><tr><th>Driver</th><th>Total</th><th>Delivered</th><th>Failed</th><th>Rate</th></tr></thead>
              <tbody>
                {byDriver.map(d => (
                  <tr key={d.driver_id}>
                    <td>{d.driver_name}</td>
                    <td>{d.total}</td>
                    <td><span className="badge badge-success">{d.delivered}</span></td>
                    <td><span className="badge badge-danger">{d.failed}</span></td>
                    <td>{d.total ? ((d.delivered/d.total)*100).toFixed(0) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
