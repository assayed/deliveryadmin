import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import Modal from '../components/Modal';
import api from '../api';

const EMPTY = { name: '', description: '', active: 1 };

export default function Zones({ tenant }) {
  const [zones, setZones] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => api.getZones(tenant.id).then(setZones), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY); setError(''); setModal('add'); };
  const openEdit = z => { setForm({ name: z.name, description: z.description || '', active: z.active }); setError(''); setModal(z); };

  const save = async () => {
    if (!form.name.trim()) return setError('Name is required');
    setSaving(true); setError('');
    try {
      if (modal === 'add') await api.createZone(tenant.id, form);
      else await api.updateZone(tenant.id, modal.id, form);
      setModal(null); load();
    } catch (e) { setError(e.response?.data?.error || 'Error saving'); }
    setSaving(false);
  };

  const del = async z => {
    if (!window.confirm(`Delete zone "${z.name}"?`)) return;
    await api.deleteZone(tenant.id, z.id); load();
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <span className="card-title"><MapPin size={16} style={{marginRight:6,verticalAlign:'middle'}}/>Delivery Zones</span>
          <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14}/>Add Zone</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {zones.map(z => (
                <tr key={z.id}>
                  <td><strong>{z.name}</strong></td>
                  <td>{z.description || '—'}</td>
                  <td><span className={`badge ${z.active ? 'badge-success' : 'badge-gray'}`}>{z.active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(z)}><Edit2 size={12}/>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(z)}><Trash2 size={12}/>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {zones.length === 0 && <tr><td colSpan={4}><div className="empty-state">No zones yet</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Zone' : 'Edit Zone'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid cols-1">
            <div className="form-group"><label>Name *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Zone name"/></div>
            <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Optional description"/></div>
            {modal !== 'add' && (
              <div className="form-group">
                <label>Status</label>
                <select value={form.active} onChange={e => setForm(f => ({...f, active: +e.target.value}))}>
                  <option value={1}>Active</option><option value={0}>Inactive</option>
                </select>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
