import { useState } from 'react';
import api from '../api';

const Plus =   ({size=14}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>;
const Edit =   ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M10.6.9a2 2 0 012.5 3.1L4.8 12.3l-3.5.8.8-3.5L10.6.9z"/></svg>;
const Trash =  ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M1 3h12v1.5H1V3zm2 1.5h8l-.8 8H3.8l-.8-8zm3-3h2v1H6V1.5z"/></svg>;
const X =      ({size=15}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>;
const Chevron =({size=12}) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>;

const EMPTY = { name:'', contact_email:'', contact_phone:'', active:1 };

export default function Tenants({ tenants, onRefresh }) {
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openAdd = () => { setForm(EMPTY); setError(''); setDrawer('add'); };
  const openEdit = t => { setForm({ name:t.name, contact_email:t.contact_email||'', contact_phone:t.contact_phone||'', active:t.active }); setError(''); setDrawer(t); };
  const close = () => setDrawer(null);

  const save = async () => {
    if (!form.name.trim()) return setError('Tenant name is required');
    setSaving(true); setError('');
    try {
      if (drawer==='add') await api.createTenant(form);
      else await api.updateTenant(drawer.id, form);
      close(); onRefresh();
    } catch(e) { setError(e.response?.data?.error||'Error saving'); }
    setSaving(false);
  };

  const del = async t => {
    if (!window.confirm(`Delete tenant "${t.name}"? All associated data will be removed.`)) return;
    await api.deleteTenant(t.id); onRefresh();
  };

  return (
    <div style={{position:'relative',flex:1,overflow:'hidden'}}>
      <div className="adm-content">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,color:'#122B1D',marginBottom:2}}>Multi-Tenant Configuration</div>
            <div style={{fontSize:12,color:'#6B7F74',fontWeight:600}}>Manage client tenants — each tenant has isolated drivers, zones, branches and orders</div>
          </div>
          <button className="adm-btn adm-btn-primary" onClick={openAdd}><Plus/> Add Tenant</button>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Tenant Name</th>
                <th>Contact Email</th>
                <th>Contact Phone</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:700}}>{t.name}</div>
                    <div style={{fontSize:11.5,color:'#9EB3A6',fontWeight:600}}>#{t.id.slice(0,8)}</div>
                  </td>
                  <td style={{fontSize:13,color:'#3D5247',fontWeight:600}}>{t.contact_email||'—'}</td>
                  <td style={{fontSize:13,color:'#3D5247',fontWeight:600}}>{t.contact_phone||'—'}</td>
                  <td><span className={`adm-badge ${t.active?'adm-badge-active':'adm-badge-inactive'}`}>{t.active?'Active':'Inactive'}</span></td>
                  <td style={{fontSize:12,color:'#9EB3A6',fontWeight:600}}>{new Date(t.created_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}</td>
                  <td>
                    <div style={{display:'flex',gap:5}}>
                      <button className="adm-btn adm-btn-ghost" style={{padding:'5px 11px',fontSize:12}} onClick={()=>openEdit(t)}><Edit size={12}/> Edit</button>
                      <button className="adm-btn" style={{padding:'5px 10px',fontSize:12,background:'#FDE8E6',color:'#C8372D',border:'none'}} onClick={()=>del(t)}><Trash size={12}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {tenants.length===0 && (
                <tr><td colSpan={6}><div className="adm-empty"><div className="adm-empty-title">No tenants yet</div><div style={{fontSize:12.5,color:'#9EB3A6'}}>Add your first tenant to get started</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawer && (
        <div className="adm-overlay" onClick={e=>e.target===e.currentTarget&&close()}>
          <div className="adm-drawer">
            <div className="adm-drawer-hdr">
              <span className="adm-drawer-title">{drawer==='add'?'Add Tenant':'Edit Tenant'}</span>
              <button className="adm-icon-btn" onClick={close}><X size={14}/></button>
            </div>
            <div className="adm-drawer-body">
              {error && <div className="adm-alert adm-alert-error">{error}</div>}
              <div className="adm-field">
                <span className="adm-field-lbl">Tenant Name *</span>
                <input className="adm-field-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. FODEK Riyadh"/>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Contact Email</span>
                <input className="adm-field-input" type="email" value={form.contact_email} onChange={e=>setForm(f=>({...f,contact_email:e.target.value}))} placeholder="ops@client.sa"/>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Contact Phone</span>
                <input className="adm-field-input" value={form.contact_phone} onChange={e=>setForm(f=>({...f,contact_phone:e.target.value}))} placeholder="+966…"/>
              </div>
              {drawer !== 'add' && (
                <div className="adm-field">
                  <span className="adm-field-lbl">Status</span>
                  <div className="adm-field-select">
                    <select value={form.active} onChange={e=>setForm(f=>({...f,active:+e.target.value}))}>
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select><Chevron/>
                  </div>
                </div>
              )}
            </div>
            <div className="adm-drawer-footer">
              <button className="adm-btn adm-btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={close}>Cancel</button>
              <button className="adm-btn adm-btn-primary" style={{flex:2,justifyContent:'center'}} onClick={save} disabled={saving}>
                {saving?'Saving…':drawer==='add'?'Create Tenant':'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
