import { useState } from 'react';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import Modal from '../components/Modal';
import api from '../api';

const EMPTY = { name: '', contact_email: '', contact_phone: '', active: 1 };

export default function Tenants({ tenants, onRefresh }) {
  const [modal, setModal] = useState(null); // null | 'add' | tenant object
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setForm(EMPTY); setError(''); setModal('add'); };
  const openEdit = t => { setForm({ name: t.name, contact_email: t.contact_email || '', contact_phone: t.contact_phone || '', active: t.active }); setError(''); setModal(t); };

  const save = async () => {
    if (!form.name.trim()) return setError('Name is required');
    setSaving(true); setError('');
    try {
      if (modal === 'add') await api.createTenant(form);
      else await api.updateTenant(modal.id, form);
      setModal(null); onRefresh();
    } catch (e) { setError(e.response?.data?.error || 'Error saving'); }
    setSaving(false);
  };

  const del = async (t) => {
    if (!window.confirm(`Delete tenant "${t.name}"? This will remove all its data.`)) return;
    await api.deleteTenant(t.id);
    onRefresh();
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Building2 size={16} style={{marginRight:6,verticalAlign:'middle'}}/>Tenants</span>
          <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14}/>Add Tenant</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong></td>
                  <td>{t.contact_email || '—'}</td>
                  <td>{t.contact_phone || '—'}</td>
                  <td><span className={`badge ${t.active ? 'badge-success' : 'badge-gray'}`}>{t.active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}><Edit2 size={12}/>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(t)}><Trash2 size={12}/>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && <tr><td colSpan={5} className="empty-state">No tenants yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Tenant' : 'Edit Tenant'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid cols-1">
            <div className="form-group">
              <label>Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Tenant name"/>
            </div>
            <div className="form-group">
              <label>Contact Email</label>
              <input value={form.contact_email} onChange={e => setForm(f => ({...f, contact_email: e.target.value}))} placeholder="email@example.com" type="email"/>
            </div>
            <div className="form-group">
              <label>Contact Phone</label>
              <input value={form.contact_phone} onChange={e => setForm(f => ({...f, contact_phone: e.target.value}))} placeholder="+966…"/>
            </div>
            {modal !== 'add' && (
              <div className="form-group">
                <label>Status</label>
                <select value={form.active} onChange={e => setForm(f => ({...f, active: +e.target.value}))}>
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
