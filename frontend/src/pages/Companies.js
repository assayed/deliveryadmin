import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const Plus =    ({size=14}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>;
const Edit =    ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M10.6.9a2 2 0 012.5 3.1L4.8 12.3l-3.5.8.8-3.5L10.6.9z"/></svg>;
const X =       ({size=15}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>;
const Trash =   ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M1 3h12v1.5H1V3zm2 1.5h8l-.8 8H3.8l-.8-8zm3-3h2v1H6V1.5z"/></svg>;
const Chevron = ({size=12}) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>;

function initials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '??';
}

const BG_COLORS = ['#1A7DA8','#0B5132','#7A5210','#156A8C','#6B7F74','#B83028','#2D6E4E'];
function bgColor(name) {
  let h = 0;
  for (let c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % BG_COLORS.length;
  return BG_COLORS[h];
}

const EMPTY_FORM = { name_en: '', name_ar: '', contact_name: '', contact_phone: '', email: '', order_price: '', free_delivery: 0, zone_ids: [], time_slot_ids: [] };

export default function Companies({ tenant }) {
  const [companies, setCompanies] = useState([]);
  const [zones, setZones] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => Promise.all([
    api.getCompanies(tenant.id).then(setCompanies),
    api.getZones(tenant.id).then(setZones),
    api.getTimeSlots(tenant.id).then(setTimeSlots),
  ]), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setError(''); setDrawer('add'); };
  const openEdit = c => {
    setForm({
      name_en: c.name_en || '', name_ar: c.name_ar || '',
      contact_name: c.contact_name || '', contact_phone: c.contact_phone || '',
      email: c.email || '', order_price: c.order_price ?? '',
      free_delivery: c.free_delivery || 0,
      zone_ids: (c.zones || []).map(z => z.id),
      time_slot_ids: (c.time_slots || []).map(t => t.id),
    });
    setError(''); setDrawer(c);
  };
  const close = () => setDrawer(null);

  const toggle = (key, id) => setForm(p => ({
    ...p,
    [key]: p[key].includes(id) ? p[key].filter(x => x !== id) : [...p[key], id],
  }));

  const save = async () => {
    if (!form.name_en.trim()) return setError('English name is required');
    setSaving(true); setError('');
    try {
      const data = { ...form, order_price: form.order_price === '' ? null : +form.order_price };
      if (drawer === 'add') await api.createCompany(tenant.id, data);
      else await api.updateCompany(tenant.id, drawer.id, data);
      close(); load();
    } catch (e) { setError(e.response?.data?.error || 'Error saving company'); }
    setSaving(false);
  };

  const del = async c => {
    if (!window.confirm(`Delete company "${c.name_en}"?`)) return;
    await api.deleteCompany(tenant.id, c.id); load();
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div className="adm-content">
        <div className="adm-filter-row">
          <div style={{ fontSize: 13, color: '#6B7F74', fontWeight: 600 }}>
            <span style={{ color: '#0B5132', fontWeight: 800, fontSize: 18 }}>{companies.length}</span> companies
          </div>
          <div style={{ marginLeft: 'auto' }} />
          <button className="adm-btn adm-btn-primary" onClick={openAdd}><Plus /> Add Company</button>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Order Price (SAR)</th>
                <th>Zones</th>
                <th>Free Delivery</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="adm-avatar" style={{ background: bgColor(c.name_en) }}>{initials(c.name_en)}</div>
                      <div>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700 }}>{c.name_en}</div>
                        {c.name_ar && <div style={{ fontSize: 12, color: '#6B7F74', fontWeight: 600, direction: 'rtl' }}>{c.name_ar}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, color: '#3D5247' }}>{c.contact_name || <span style={{ color: '#C8D8CF' }}>—</span>}</div>
                    {c.contact_phone && <div style={{ fontSize: 12, color: '#6B7F74', fontWeight: 600 }}>{c.contact_phone}</div>}
                  </td>
                  <td style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: '#0B5132' }}>
                    {c.order_price != null ? c.order_price.toFixed(2) : <span style={{ color: '#C8D8CF' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(c.zones || []).length ? c.zones.map(z => <span key={z.id} className="adm-zone-chip">{z.name}</span>) : <span style={{ color: '#C8D8CF', fontSize: 12 }}>—</span>}
                    </div>
                  </td>
                  <td>
                    {c.free_delivery ? <span className="adm-badge adm-badge-active">Yes</span> : <span className="adm-badge adm-badge-inactive">No</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="adm-btn adm-btn-ghost" style={{ padding: '5px 11px', fontSize: 12 }} onClick={() => openEdit(c)}><Edit size={12} /> Edit</button>
                      <button className="adm-btn" style={{ padding: '5px 10px', fontSize: 12, background: '#FDE8E6', color: '#C8372D', border: 'none' }} onClick={() => del(c)}><Trash size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr><td colSpan={6}>
                  <div className="adm-empty"><div className="adm-empty-title">No companies yet</div><div style={{ fontSize: 12.5, color: '#9EB3A6' }}>Add companies that supply drivers</div></div>
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
              <span className="adm-drawer-title">{drawer === 'add' ? 'Add Company' : 'Edit Company'}</span>
              <button className="adm-icon-btn" onClick={close}><X size={14} /></button>
            </div>
            <div className="adm-drawer-body">
              {error && <div className="adm-alert adm-alert-error">{error}</div>}
              <div className="adm-field">
                <span className="adm-field-lbl">Name (English) *</span>
                <input className="adm-field-input" value={form.name_en} onChange={f('name_en')} placeholder="Company name in English" />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Name (Arabic)</span>
                <input className="adm-field-input" value={form.name_ar} onChange={f('name_ar')} placeholder="اسم الشركة بالعربية" dir="rtl" />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Contact Name</span>
                <input className="adm-field-input" value={form.contact_name} onChange={f('contact_name')} placeholder="Contact person" />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Contact Phone</span>
                <input className="adm-field-input" value={form.contact_phone} onChange={f('contact_phone')} placeholder="+966 …" />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Email</span>
                <input className="adm-field-input" type="email" value={form.email} onChange={f('email')} placeholder="company@example.com" />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Order Price (SAR)</span>
                <input className="adm-field-input" type="number" min={0} step={0.01} value={form.order_price} onChange={f('order_price')} placeholder="e.g. 12.50" />
                <span style={{ fontSize: 11.5, color: '#9EB3A6', fontWeight: 600, marginTop: 4, display: 'block' }}>Delivery fee charged to this company per order</span>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Default Free Delivery</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className={`adm-toggle${form.free_delivery ? '' : ' off'}`} onClick={() => setForm(p => ({ ...p, free_delivery: p.free_delivery ? 0 : 1 }))}>
                    <div className="adm-toggle-thumb" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#3D5247' }}>
                    {form.free_delivery ? 'All orders from this company are free' : 'Normal pricing applies'}
                  </span>
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Assigned Zones</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 2 }}>
                  {zones.map(z => (
                    <span key={z.id} className={`adm-zone-sel${form.zone_ids.includes(z.id) ? ' on' : ''}`}
                      onClick={() => toggle('zone_ids', z.id)}>{z.name}</span>
                  ))}
                  {zones.length === 0 && <span style={{ fontSize: 12, color: '#9EB3A6' }}>No zones defined</span>}
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Assigned Time Slots</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 2 }}>
                  {timeSlots.map(t => (
                    <span key={t.id} className={`adm-zone-sel${form.time_slot_ids.includes(t.id) ? ' on' : ''}`}
                      onClick={() => toggle('time_slot_ids', t.id)}>
                      {t.name} <span style={{ opacity: 0.65 }}>({t.day_name})</span>
                    </span>
                  ))}
                  {timeSlots.length === 0 && <span style={{ fontSize: 12, color: '#9EB3A6' }}>No time slots defined</span>}
                </div>
              </div>
            </div>
            <div className="adm-drawer-footer">
              <button className="adm-btn adm-btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={close}>Cancel</button>
              <button className="adm-btn adm-btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : drawer === 'add' ? 'Create Company' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
