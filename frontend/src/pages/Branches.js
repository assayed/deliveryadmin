import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const Plus =   ({size=14}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>;
const Edit =   ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M10.6.9a2 2 0 012.5 3.1L4.8 12.3l-3.5.8.8-3.5L10.6.9z"/></svg>;
const X =      ({size=15}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>;
const Trash =  ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M1 3h12v1.5H1V3zm2 1.5h8l-.8 8H3.8l-.8-8zm3-3h2v1H6V1.5z"/></svg>;
const Branch = ({size=16}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M4 2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm8 4H8v2h4V6zm0 4H8v2h4v-2z"/></svg>;

const EMPTY_FORM = { name: '', address: '', phone: '', manager_name: '' };

export default function Branches({ tenant }) {
  const [branches, setBranches] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => api.getBranches(tenant.id).then(setBranches), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setError(''); setDrawer('add'); };
  const openEdit = b => { setForm({ name: b.name, address: b.address || '', phone: b.phone || '', manager_name: b.manager_name || '' }); setError(''); setDrawer(b); };
  const close = () => setDrawer(null);

  const save = async () => {
    if (!form.name.trim()) return setError('Branch name is required');
    if (!form.address.trim()) return setError('Address is required');
    setSaving(true); setError('');
    try {
      if (drawer === 'add') await api.createBranch(tenant.id, form);
      else await api.updateBranch(tenant.id, drawer.id, form);
      close(); load();
    } catch (e) { setError(e.response?.data?.error || 'Error saving branch'); }
    setSaving(false);
  };

  const del = async b => {
    if (!window.confirm(`Delete branch "${b.name}"?`)) return;
    await api.deleteBranch(tenant.id, b.id); load();
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div className="adm-content">
        <div className="adm-filter-row">
          <div style={{ fontSize: 13, color: '#6B7F74', fontWeight: 600 }}>
            <span style={{ color: '#0B5132', fontWeight: 800, fontSize: 18 }}>{branches.length}</span> branches
          </div>
          <div style={{ marginLeft: 'auto' }} />
          <button className="adm-btn adm-btn-primary" onClick={openAdd}><Plus /> Add Branch</button>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Manager</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E7F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B5132' }}>
                        <Branch size={15} />
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700 }}>{b.name}</div>
                        <div style={{ fontSize: 11.5, color: '#6B7F74', fontWeight: 600 }}>#{b.id.slice(0, 6)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: '#3D5247' }}>{b.address || <span style={{ color: '#C8D8CF' }}>—</span>}</td>
                  <td style={{ fontSize: 13, color: '#3D5247', fontWeight: 600 }}>{b.phone || <span style={{ color: '#C8D8CF' }}>—</span>}</td>
                  <td style={{ fontSize: 13, color: '#3D5247' }}>{b.manager_name || <span style={{ color: '#C8D8CF' }}>—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="adm-btn adm-btn-ghost" style={{ padding: '5px 11px', fontSize: 12 }} onClick={() => openEdit(b)}><Edit size={12} /> Edit</button>
                      <button className="adm-btn" style={{ padding: '5px 10px', fontSize: 12, background: '#FDE8E6', color: '#C8372D', border: 'none' }} onClick={() => del(b)}><Trash size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr><td colSpan={5}>
                  <div className="adm-empty"><div className="adm-empty-title">No branches yet</div><div style={{ fontSize: 12.5, color: '#9EB3A6' }}>Add your first branch to start organizing orders</div></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawer && (
        <div className="adm-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="adm-drawer">
            <div className="adm-drawer-hdr">
              <span className="adm-drawer-title">{drawer === 'add' ? 'Add Branch' : 'Edit Branch'}</span>
              <button className="adm-icon-btn" onClick={close}><X size={14} /></button>
            </div>
            <div className="adm-drawer-body">
              {error && <div className="adm-alert adm-alert-error">{error}</div>}
              <div className="adm-field">
                <span className="adm-field-lbl">Branch Name *</span>
                <input className="adm-field-input" value={form.name} onChange={f('name')} placeholder="e.g. Riyadh Central" />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Address *</span>
                <input className="adm-field-input" value={form.address} onChange={f('address')} placeholder="Full address" />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Phone</span>
                <input className="adm-field-input" value={form.phone} onChange={f('phone')} placeholder="+966 …" />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Manager Name</span>
                <input className="adm-field-input" value={form.manager_name} onChange={f('manager_name')} placeholder="Manager's name" />
              </div>
            </div>
            <div className="adm-drawer-footer">
              <button className="adm-btn adm-btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={close}>Cancel</button>
              <button className="adm-btn adm-btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : drawer === 'add' ? 'Create Branch' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
