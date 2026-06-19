import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, Zap } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import api from '../api';

export default function Dispatch({ tenant }) {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [zones, setZones] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterZone, setFilterZone] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(() => Promise.all([
    api.getOrders(tenant.id, { status: 'Unassigned' }).then(setOrders),
    api.getDrivers(tenant.id).then(setDrivers),
    api.getZones(tenant.id).then(setZones),
  ]), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  const filteredOrders = filterZone ? orders.filter(o => o.zone_id === filterZone) : orders;

  const candidateDrivers = selected
    ? drivers.filter(d => {
        if (!d.active) return false;
        if (selected.zone_id && !d.zones.some(z => z.id === selected.zone_id)) return false;
        return true;
      })
    : [];

  const assign = async (driver) => {
    if (!selected) return;
    if (driver.current_load >= driver.max_concurrent_orders) return;
    setAssigning(true); setError(''); setSuccess('');
    try {
      await api.assignOrder(tenant.id, selected.id, driver.id);
      setSuccess(`Assigned ${selected.order_ref} to ${driver.name}`);
      setSelected(null);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Assignment failed');
    }
    setAssigning(false);
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  return (
    <div className="page" style={{paddingBottom:0}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
        <h2 style={{fontSize:16,fontWeight:600}}><Zap size={16} style={{verticalAlign:'middle',marginRight:6}}/>Dispatch Board</h2>
        <select value={filterZone} onChange={e => setFilterZone(e.target.value)} style={{width:'auto',minWidth:160}}>
          <option value="">All Zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13}/>Refresh</button>
        {success && <span className="badge badge-success">{success}</span>}
        {error && <span className="badge badge-danger">{error}</span>}
      </div>

      <div className="dispatch-layout">
        {/* Left: Unassigned orders */}
        <div className="dispatch-panel">
          <div className="dispatch-panel-header">
            <h3>Unassigned Orders ({filteredOrders.length})</h3>
            <div style={{fontSize:11,color:'var(--gray-500)',marginTop:2}}>Click an order to see available drivers</div>
          </div>
          <div className="dispatch-panel-body">
            {filteredOrders.length === 0 && (
              <div className="empty-state"><CheckCircle size={32}/><div>All orders assigned</div></div>
            )}
            {filteredOrders.map(o => (
              <div key={o.id} className={`order-card ${selected?.id === o.id ? 'selected' : ''}`} onClick={() => setSelected(s => s?.id === o.id ? null : o)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div className="order-card-ref">{o.order_ref}</div>
                  <StatusBadge status={o.status}/>
                </div>
                <div className="order-card-customer">{o.customer_name} · {o.customer_phone}</div>
                <div className="order-card-zone">
                  {o.zone?.name && <span className="zone-tag" style={{marginRight:6}}>{o.zone.name}</span>}
                  {o.branch?.name && <span style={{fontSize:11}}>{o.branch.name}</span>}
                </div>
                <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>{o.customer_address}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Available drivers */}
        <div className="dispatch-panel">
          <div className="dispatch-panel-header">
            <h3>
              {selected
                ? `Available Drivers for ${selected.order_ref} ${selected.zone?.name ? `(${selected.zone.name})` : ''}`
                : 'Select an order to see drivers'}
            </h3>
            <div style={{fontSize:11,color:'var(--gray-500)',marginTop:2}}>Only active drivers matching the order zone are shown</div>
          </div>
          <div className="dispatch-panel-body">
            {!selected && (
              <div className="empty-state" style={{paddingTop:80}}>
                <div style={{fontSize:32}}>←</div>
                <div style={{marginTop:8}}>Pick an unassigned order</div>
              </div>
            )}
            {selected && candidateDrivers.length === 0 && (
              <div className="empty-state"><div>No eligible drivers for this zone</div><div style={{fontSize:12,marginTop:4}}>Check driver zone assignments and active status</div></div>
            )}
            {selected && candidateDrivers.map(d => {
              const full = d.current_load >= d.max_concurrent_orders;
              return (
                <div key={d.id} className={`driver-card ${full ? 'full' : 'available'}`} onClick={() => !full && !assigning && assign(d)}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{d.name}</div>
                    <div style={{fontSize:11,color:'var(--gray-500)',marginTop:2}}>{d.phone} · {d.vehicle_type}</div>
                    <div className="zone-tags" style={{marginTop:4}}>
                      {d.zones.map(z => <span key={z.id} className="zone-tag">{z.name}</span>)}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className={`capacity ${full ? 'full' : ''}`}>{d.current_load}/{d.max_concurrent_orders}</div>
                    <div style={{fontSize:10,color:'var(--gray-400)',marginTop:2}}>{full ? 'Full' : 'Available'}</div>
                    {!full && (
                      <button className="btn btn-success btn-sm" style={{marginTop:8}} disabled={assigning}>
                        Assign
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
