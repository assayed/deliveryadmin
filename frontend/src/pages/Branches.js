import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, GitBranch } from 'lucide-react';
import Modal from '../components/Modal';
import api from '../api';

const EMPTY = { name: '', address: '', zone_id: '', active: 1 };

export default function Branches({ tenant }) {
  const [branches, setBranches] = useState([]);
  const [zones, setZones] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => Promise.all([
    api.getBranches(tenant.id).then(setBranches),
    api.getZones(tenant.id).then(setZones),
  ]), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY); setError(''); setModal('add'); };
  const openEdit = b => { setForm({ name: b.name, address: b.address || '', zone_id: b.zone_id || '', active: b.active }); setError(''); setModal(b); };

  const save = async () => {
    if (!form.name.trim()) return setError('Name is required');
    setSaving(true); setError('');
    try {
      if (modal === 'add') await api.createBranch(tenant.id, form);
      else await api.updateBranch(tenant.id, modal.id, form);
      setModal(null); load();
    } catch (e) { setError(e.response?.data?.error || 'Error saving'); }
    setSaving(false);
  };

  const del = async b => {
    if (!window.confirm(`Delete branch "${b.name}"?`)) return;
    await api.deleteBranch(tenant.id, b.id); load();
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <span className="card-title"><GitBranch size={16} style={{marginRight:6,verticalAlign:'middle'}}/>Branches</span>
          <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14}/>Add Branch</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Address</th><th>Zone</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong></td>
                  <td>{b.address || '—'}</td>
                  <td>{b.zone_name ? <span className="zone-tag">{b.zone_name}</span> : '—'}</td>
                  <td><span className={`badge ${b.active ? 'badge-success' : 'badge-gray'}`}>{b.active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}><Edit2 size={12}/>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(b)}><Trash2 size={12}/>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && <tr><td colSpan={5}><div className="empty-state">No branches yet</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Branch' : 'Edit Branch'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid cols-1">
            <div className="form-group"><label>Name *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Branch name"/></div>
            <div className="form-group"><label>Address</label><input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} placeholder="Street address"/></div>
            <div className="form-group">
              <label>Zone</label>
              <select value={form.zone_id} onChange={e => setForm(f => ({...f, zone_id: e.target.value}))}>
                <option value="">— No zone —</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
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
