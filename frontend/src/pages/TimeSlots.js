import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const Plus =  ({size=14}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>;
const Edit =  ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M10.6.9a2 2 0 012.5 3.1L4.8 12.3l-3.5.8.8-3.5L10.6.9z"/></svg>;
const X =     ({size=15}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>;
const Trash = ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M1 3h12v1.5H1V3zm2 1.5h8l-.8 8H3.8l-.8-8zm3-3h2v1H6V1.5z"/></svg>;
const Clock = ({size=15}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 8.5V6H9v5.5l3.5 2 1-1.7L11 10.5z"/></svg>;

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_COLORS = ['#0B5132','#1A7DA8','#7A5210','#156A8C','#2D6E4E','#6B7F74','#B83028'];

const EMPTY_FORM = { name: '', day_of_week: 0, start_time: '09:00', end_time: '13:00', active: 1 };

export default function TimeSlots({ tenant }) {
  const [slots, setSlots] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterDay, setFilterDay] = useState('');

  const load = useCallback(() => api.getTimeSlots(tenant.id).then(setSlots), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setError(''); setDrawer('add'); };
  const openEdit = s => {
    setForm({ name: s.name, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time, active: s.active });
    setError(''); setDrawer(s);
  };
  const close = () => setDrawer(null);

  const save = async () => {
    if (!form.name.trim()) return setError('Name is required');
    if (!form.start_time || !form.end_time) return setError('Start and end time required');
    setSaving(true); setError('');
    try {
      if (drawer === 'add') await api.createTimeSlot(tenant.id, form);
      else await api.updateTimeSlot(tenant.id, drawer.id, form);
      close(); load();
    } catch (e) { setError(e.response?.data?.error || 'Error saving time slot'); }
    setSaving(false);
  };

  const del = async s => {
    if (!window.confirm(`Delete time slot "${s.name}"?`)) return;
    await api.deleteTimeSlot(tenant.id, s.id); load();
  };

  const filtered = filterDay !== '' ? slots.filter(s => s.day_of_week === +filterDay) : slots;

  // Group by day for display
  const byDay = {};
  filtered.forEach(s => {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = [];
    byDay[s.day_of_week].push(s);
  });

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div className="adm-content">
        <div className="adm-filter-row">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterDay('')}
              style={{ padding: '5px 13px', borderRadius: 20, border: '1.5px solid', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: filterDay === '' ? '#0B5132' : 'transparent', color: filterDay === '' ? '#fff' : '#6B7F74', borderColor: filterDay === '' ? '#0B5132' : '#C8D8CF' }}>
              All Days
            </button>
            {DAYS.map((d, i) => (
              <button key={i}
                onClick={() => setFilterDay(filterDay === String(i) ? '' : String(i))}
                style={{ padding: '5px 13px', borderRadius: 20, border: '1.5px solid', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: filterDay === String(i) ? DAY_COLORS[i] : 'transparent', color: filterDay === String(i) ? '#fff' : '#6B7F74', borderColor: filterDay === String(i) ? DAY_COLORS[i] : '#C8D8CF' }}>
                {DAY_SHORT[i]}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto' }} />
          <button className="adm-btn adm-btn-primary" onClick={openAdd}><Plus /> Add Time Slot</button>
        </div>

        {Object.keys(byDay).sort((a, b) => +a - +b).map(day => (
          <div key={day} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ background: DAY_COLORS[+day], color: '#fff', fontWeight: 800, fontSize: 11, padding: '3px 10px', borderRadius: 99, letterSpacing: '.04em' }}>
                {DAYS[+day]}
              </span>
              <span style={{ fontSize: 12, color: '#9EB3A6', fontWeight: 600 }}>{byDay[day].length} slot{byDay[day].length !== 1 ? 's' : ''}</span>
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Time Range</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {byDay[day].map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#E7F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B5132' }}>
                            <Clock size={14} />
                          </div>
                          <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700 }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700, color: '#3D5247' }}>
                        {s.start_time} – {s.end_time}
                      </td>
                      <td>
                        <span className={`adm-badge ${s.active ? 'adm-badge-active' : 'adm-badge-inactive'}`}>
                          {s.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="adm-btn adm-btn-ghost" style={{ padding: '5px 11px', fontSize: 12 }} onClick={() => openEdit(s)}><Edit size={12} /> Edit</button>
                          <button className="adm-btn" style={{ padding: '5px 10px', fontSize: 12, background: '#FDE8E6', color: '#C8372D', border: 'none' }} onClick={() => del(s)}><Trash size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="adm-empty"><div className="adm-empty-title">No time slots</div><div style={{ fontSize: 12.5, color: '#9EB3A6' }}>Add time slots to schedule deliveries</div></div>
        )}
      </div>

      {drawer && (
        <div className="adm-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="adm-drawer">
            <div className="adm-drawer-hdr">
              <span className="adm-drawer-title">{drawer === 'add' ? 'Add Time Slot' : 'Edit Time Slot'}</span>
              <button className="adm-icon-btn" onClick={close}><X size={14} /></button>
            </div>
            <div className="adm-drawer-body">
              {error && <div className="adm-alert adm-alert-error">{error}</div>}
              <div className="adm-field">
                <span className="adm-field-lbl">Slot Name *</span>
                <input className="adm-field-input" value={form.name} onChange={f('name')} placeholder="e.g. Morning Delivery" />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Day of Week</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                  {DAYS.map((d, i) => (
                    <span key={i}
                      onClick={() => setForm(p => ({ ...p, day_of_week: i }))}
                      style={{ padding: '5px 13px', borderRadius: 20, border: '1.5px solid', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: form.day_of_week === i ? DAY_COLORS[i] : 'transparent', color: form.day_of_week === i ? '#fff' : '#6B7F74', borderColor: form.day_of_week === i ? DAY_COLORS[i] : '#C8D8CF' }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Start Time</span>
                <input type="time" className="adm-field-input" value={form.start_time} onChange={f('start_time')} />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">End Time</span>
                <input type="time" className="adm-field-input" value={form.end_time} onChange={f('end_time')} />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className={`adm-toggle${form.active ? '' : ' off'}`} onClick={() => setForm(p => ({ ...p, active: p.active ? 0 : 1 }))}>
                    <div className="adm-toggle-thumb" />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#122B1D' }}>{form.active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            <div className="adm-drawer-footer">
              <button className="adm-btn adm-btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={close}>Cancel</button>
              <button className="adm-btn adm-btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : drawer === 'add' ? 'Create Slot' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
