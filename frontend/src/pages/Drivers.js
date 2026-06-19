import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, User } from 'lucide-react';
import Modal from '../components/Modal';
import api from '../api';

const EMPTY = { name: '', phone: '', vehicle_type: 'motorcycle', driver_type: 'in-house', max_concurrent_orders: 3, active: 1, zone_ids: [] };

export default function Drivers({ tenant }) {
  const [drivers, setDrivers] = useState([]);
  const [zones, setZones] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => Promise.all([
    api.getDrivers(tenant.id).then(setDrivers),
    api.getZones(tenant.id).then(setZones),
  ]), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY); setError(''); setModal('add'); };
  const openEdit = d => {
    setForm({ name: d.name, phone: d.phone, vehicle_type: d.vehicle_type, driver_type: d.driver_type, max_concurrent_orders: d.max_concurrent_orders, active: d.active, zone_ids: d.zones.map(z => z.id) });
    setError(''); setModal(d);
  };

  const toggleZone = id => setForm(f => ({ ...f, zone_ids: f.zone_ids.includes(id) ? f.zone_ids.filter(z => z !== id) : [...f.zone_ids, id] }));

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return setError('Name and phone are required');
    setSaving(true); setError('');
    try {
      if (modal === 'add') await api.createDriver(tenant.id, form);
      else await api.updateDriver(tenant.id, modal.id, form);
      setModal(null); load();
    } catch (e) { setError(e.response?.data?.error || 'Error saving'); }
    setSaving(false);
  };

  const del = async d => {
    if (!window.confirm(`Delete driver "${d.name}"?`)) return;
    await api.deleteDriver(tenant.id, d.id); load();
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <span className="card-title"><User size={16} style={{marginRight:6,verticalAlign:'middle'}}/>Drivers</span>
          <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14}/>Add Driver</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Vehicle</th><th>Type</th><th>Zones</th><th>Load</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {drivers.map(d => {
                const pct = d.max_concurrent_orders > 0 ? d.current_load / d.max_concurrent_orders : 0;
                return (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td>
                    <td>{d.phone}</td>
                    <td><span className="badge badge-gray">{d.vehicle_type}</span></td>
                    <td><span className={`badge ${d.driver_type === 'in-house' ? 'badge-info' : 'badge-purple'}`}>{d.driver_type}</span></td>
                    <td>
                      <div className="zone-tags">
                        {d.zones.map(z => <span key={z.id} className="zone-tag">{z.name}</span>)}
                        {d.zones.length === 0 && <span style={{color:'var(--gray-400)',fontSize:12}}>None</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`capacity ${pct >= 1 ? 'full' : ''}`}>{d.current_load}/{d.max_concurrent_orders}</span>
                    </td>
                    <td><span className={`badge ${d.active ? 'badge-success' : 'badge-gray'}`}>{d.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(d)}><Edit2 size={12}/>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(d)}><Trash2 size={12}/>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {drivers.length === 0 && <tr><td colSpan={8}><div className="empty-state">No drivers yet</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Driver' : 'Edit Driver'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid">
            <div className="form-group"><label>Name *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Driver name"/></div>
            <div className="form-group"><label>Phone *</label><input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+966…"/></div>
            <div className="form-group">
              <label>Vehicle Type</label>
              <select value={form.vehicle_type} onChange={e => setForm(f => ({...f, vehicle_type: e.target.value}))}>
                <option value="motorcycle">Motorcycle</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
                <option value="bicycle">Bicycle</option>
              </select>
            </div>
            <div className="form-group">
              <label>Driver Type</label>
              <select value={form.driver_type} onChange={e => setForm(f => ({...f, driver_type: e.target.value}))}>
                <option value="in-house">In-house</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div className="form-group">
              <label>Max Concurrent Orders</label>
              <input type="number" min={1} max={20} value={form.max_concurrent_orders} onChange={e => setForm(f => ({...f, max_concurrent_orders: +e.target.value}))}/>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.active} onChange={e => setForm(f => ({...f, active: +e.target.value}))}>
                <option value={1}>Active</option><option value={0}>Inactive</option>
              </select>
            </div>
            <div className="form-group full">
              <label>Assigned Zones</label>
              <div className="zone-checkbox-list">
                {zones.map(z => (
                  <div key={z.id} className={`zone-checkbox-item ${form.zone_ids.includes(z.id) ? 'checked' : ''}`} onClick={() => toggleZone(z.id)}>
                    {z.name}
                  </div>
                ))}
                {zones.length === 0 && <span style={{fontSize:12,color:'var(--gray-400)'}}>No zones defined yet</span>}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
