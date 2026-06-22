import { useState, useEffect, useCallback } from 'react';
import api from '../api';

/* ── Icons ── */
const Plus =    ({size=14}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>;
const Search =  ({size=14}) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" strokeLinecap="round"/></svg>;
const Edit =    ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M10.6.9a2 2 0 012.5 3.1L4.8 12.3l-3.5.8.8-3.5L10.6.9z"/></svg>;
const Chevron = ({size=12}) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>;
const X =       ({size=15}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>;
const Filter =  ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M1 2h12v2L8 9v4l-2-1V9L1 4V2z"/></svg>;
const Trash =   ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M1 3h12v1.5H1V3zm2 1.5h8l-.8 8H3.8l-.8-8zm3-3h2v1H6V1.5z"/></svg>;

function LoadBar({ current, max }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const full = current >= max;
  const warn = !full && pct >= 67;
  const fillColor = full ? '#C8372D' : warn ? '#F2AF1F' : '#0B5132';
  const textColor = full ? '#C8372D' : warn ? '#8A6210' : '#6B7F74';
  return (
    <div className="adm-load">
      <div className="adm-load-track">
        <div style={{height:'100%',borderRadius:3,background:fillColor,width:`${pct}%`,transition:'width .3s'}}/>
      </div>
      <span className="adm-load-label" style={{color:textColor}}>{current}/{max}</span>
    </div>
  );
}

function Badge({ status }) {
  const map = {
    active:   ['adm-badge-active',   'Active'],
    inactive: ['adm-badge-inactive', 'Inactive'],
  };
  const [cls, label] = map[status] || ['adm-badge-inactive', status];
  return <span className={`adm-badge ${cls}`}>{label}</span>;
}

const VEHICLE_OPTIONS = ['Motorcycle','Toyota Camry','Honda Civic','Hyundai Accent','Toyota Yaris','Hyundai Sonata','Kia Cerato','Van','Bicycle'];
const AVATAR_COLORS = ['#1A7DA8','#0B5132','#7A5210','#156A8C','#6B7F74','#B83028','#2D6E4E','#8C4A15','#4A158C'];

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join('');
}

function avatarColor(name) {
  let h = 0;
  for (let c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

const EMPTY_FORM = { name:'', phone:'', vehicle_type:'Motorcycle', driver_type:'in-house', max_concurrent_orders:3, active:1, zone_ids:[], company_id:'', time_slot_ids:[] };

export default function Drivers({ tenant }) {
  const [drivers, setDrivers] = useState([]);
  const [zones, setZones] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [search, setSearch] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [drawer, setDrawer] = useState(null); // null | 'add' | driver object
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => Promise.all([
    api.getDrivers(tenant.id).then(setDrivers),
    api.getZones(tenant.id).then(setZones),
    api.getCompanies(tenant.id).then(setCompanies),
    api.getTimeSlots(tenant.id).then(setTimeSlots),
  ]), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setError(''); setDrawer('add'); };
  const openEdit = d => {
    setForm({ name:d.name, phone:d.phone, vehicle_type:d.vehicle_type, driver_type:d.driver_type, max_concurrent_orders:d.max_concurrent_orders, active:d.active, zone_ids:d.zones.map(z=>z.id), company_id:d.company_id||'', time_slot_ids:(d.time_slots||[]).map(t=>t.id) });
    setError(''); setDrawer(d);
  };
  const closeDrawer = () => setDrawer(null);

  const toggleZone = id => setForm(f => ({ ...f, zone_ids: f.zone_ids.includes(id) ? f.zone_ids.filter(z=>z!==id) : [...f.zone_ids, id] }));
  const toggleSlot = id => setForm(f => ({ ...f, time_slot_ids: f.time_slot_ids.includes(id) ? f.time_slot_ids.filter(x=>x!==id) : [...f.time_slot_ids, id] }));

  const save = async () => {
    if (!form.name.trim()) return setError('Full name is required');
    if (!form.phone.trim()) return setError('Phone number is required');
    setSaving(true); setError('');
    try {
      if (drawer === 'add') await api.createDriver(tenant.id, form);
      else await api.updateDriver(tenant.id, drawer.id, form);
      closeDrawer(); load();
    } catch(e) { setError(e.response?.data?.error || 'Error saving driver'); }
    setSaving(false);
  };

  const del = async d => {
    if (!window.confirm(`Delete driver "${d.name}"? This cannot be undone.`)) return;
    await api.deleteDriver(tenant.id, d.id); load();
  };

  const filtered = drivers.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.phone.includes(search)) return false;
    if (filterZone && !d.zones.some(z => z.id === filterZone)) return false;
    if (filterStatus && d.active !== (filterStatus === 'active' ? 1 : 0)) return false;
    return true;
  });

  const activeCount = drivers.filter(d=>d.active).length;
  const inactiveCount = drivers.filter(d=>!d.active).length;

  return (
    <div style={{position:'relative',flex:1,overflow:'hidden'}}>
      <div className="adm-content">
        {/* Filter Row */}
        <div className="adm-filter-row">
          <div className="adm-search">
            <Search size={14}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search drivers…"/>
          </div>
          <div className="adm-select">
            <select value={filterZone} onChange={e=>setFilterZone(e.target.value)}>
              <option value="">All Zones</option>
              {zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            <Chevron/>
          </div>
          <div className="adm-select">
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <Chevron/>
          </div>
          <div style={{marginLeft:'auto',fontSize:12.5,fontWeight:600,color:'#6B7F74',display:'flex',gap:10,alignItems:'center'}}>
            <span style={{color:'#0B5132',fontWeight:800}}>{activeCount}</span> active
            <span style={{color:'#C8D8CF'}}>·</span>
            <span style={{color:'#C8372D',fontWeight:800}}>{inactiveCount}</span> inactive
          </div>
          <button className="adm-btn adm-btn-ghost" style={{gap:5}}><Filter/> Filter</button>
          <button className="adm-btn adm-btn-primary" onClick={openAdd}><Plus/> Add Driver</button>
        </div>

        {/* Table */}
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Zone(s)</th>
                <th>Vehicle</th>
                <th style={{textAlign:'center'}}>Max Orders</th>
                <th>Current Load</th>
                <th>Status</th>
                <th>Type</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div className="adm-avatar" style={{background:avatarColor(d.name)}}>{initials(d.name)}</div>
                      <div>
                        <div style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:700}}>{d.name}</div>
                        <div style={{fontSize:11.5,color:'#6B7F74',fontWeight:600}}>#{d.id.slice(0,6)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{fontSize:13,color:'#3D5247',fontWeight:600}}>{d.phone}</td>
                  <td style={{fontSize:12.5,color:'#3D5247'}}>{d.company?.name_en || <span style={{color:'#C8D8CF'}}>—</span>}</td>
                  <td>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {d.zones.length ? d.zones.map(z=><span key={z.id} className="adm-zone-chip">{z.name}</span>) : <span style={{color:'#C8D8CF',fontSize:12}}>—</span>}
                    </div>
                  </td>
                  <td style={{fontSize:13,color:'#3D5247',fontWeight:600}}>{d.vehicle_type}</td>
                  <td style={{textAlign:'center',fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700}}>{d.max_concurrent_orders}</td>
                  <td><LoadBar current={d.current_load} max={d.max_concurrent_orders}/></td>
                  <td><Badge status={d.active ? 'active' : 'inactive'}/></td>
                  <td><span className={`adm-badge ${d.driver_type==='in-house'?'adm-badge-assigned':'adm-badge-pickup'}`}>{d.driver_type}</span></td>
                  <td>
                    <div style={{display:'flex',gap:5}}>
                      <button className="adm-btn adm-btn-ghost" style={{padding:'5px 11px',fontSize:12}} onClick={()=>openEdit(d)}>
                        <Edit size={12}/> Edit
                      </button>
                      <button className="adm-btn" style={{padding:'5px 10px',fontSize:12,background:'#FDE8E6',color:'#C8372D',border:'none'}} onClick={()=>del(d)}>
                        <Trash size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10}>
                  <div className="adm-empty"><div className="adm-empty-title">No drivers found</div><div style={{fontSize:12.5,color:'#9EB3A6'}}>Try adjusting your filters</div></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{fontSize:12,color:'#9EB3A6',fontWeight:600}}>
          * Deactivating a driver does not affect orders already in their active queue — only blocks new assignments and app login.
        </div>
      </div>

      {/* ── Drawer ── */}
      {drawer && (
        <div className="adm-overlay" onClick={e=>e.target===e.currentTarget&&closeDrawer()}>
          <div className="adm-drawer">
            <div className="adm-drawer-hdr">
              <span className="adm-drawer-title">{drawer==='add'?'Add New Driver':'Edit Driver'}</span>
              <button className="adm-icon-btn" onClick={closeDrawer}><X size={14}/></button>
            </div>
            <div className="adm-drawer-body">
              {error && <div className="adm-alert adm-alert-error">{error}</div>}

              <div className="adm-field">
                <span className="adm-field-lbl">Full Name</span>
                <input className="adm-field-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Driver's full name"/>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Phone Number</span>
                <div style={{display:'flex',alignItems:'center',gap:8,background:'#F4F6F5',border:'1.5px solid #E2E9E4',borderRadius:10,padding:'10px 13px'}}>
                  <span style={{fontSize:17}}>🇸🇦</span>
                  <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+966 5X XXX XXXX"
                    style={{border:'none',outline:'none',background:'transparent',fontFamily:"'Manrope',sans-serif",fontSize:13.5,fontWeight:600,color:'#122B1D',flex:1}}/>
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Vehicle Type</span>
                <div className="adm-field-select">
                  <select value={form.vehicle_type} onChange={e=>setForm(f=>({...f,vehicle_type:e.target.value}))}>
                    {VEHICLE_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                  <Chevron/>
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Assigned Zone(s)</span>
                <div style={{display:'flex',flexWrap:'wrap',gap:7,marginTop:2}}>
                  {zones.map(z=>(
                    <span key={z.id} className={`adm-zone-sel${form.zone_ids.includes(z.id)?' on':''}`} onClick={()=>toggleZone(z.id)}>{z.name}</span>
                  ))}
                  {zones.length===0 && <span style={{fontSize:12,color:'#9EB3A6'}}>No zones defined — add zones first</span>}
                </div>
                <div style={{fontSize:11.5,color:'#9EB3A6',fontWeight:600,marginTop:5}}>Reuses existing delivery-zone data</div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Max Concurrent Orders</span>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <input type="number" min={1} max={20} value={form.max_concurrent_orders}
                    onChange={e=>setForm(f=>({...f,max_concurrent_orders:+e.target.value}))}
                    className="adm-field-input"
                    style={{width:64,textAlign:'center',fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:700,color:'#0B5132',padding:'8px 12px'}}/>
                  <span style={{fontSize:12.5,color:'#6B7F74',fontWeight:600,lineHeight:1.45}}>Driver can handle up to this many active deliveries simultaneously</span>
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Driver Type</span>
                <div style={{display:'flex',gap:8}}>
                  <span className={`adm-zone-sel${form.driver_type==='in-house'?' on':''}`} onClick={()=>setForm(f=>({...f,driver_type:'in-house'}))}>In-House</span>
                  <span className={`adm-zone-sel${form.driver_type==='hybrid'?' on':''}`} onClick={()=>setForm(f=>({...f,driver_type:'hybrid'}))}>Hybrid</span>
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Company (External)</span>
                <div className="adm-field-select">
                  <select value={form.company_id} onChange={e=>setForm(f=>({...f,company_id:e.target.value}))}>
                    <option value="">No company (in-house)</option>
                    {companies.map(c=><option key={c.id} value={c.id}>{c.name_en}</option>)}
                  </select>
                  <Chevron/>
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Time Slots</span>
                <div style={{display:'flex',flexWrap:'wrap',gap:7,marginTop:2}}>
                  {timeSlots.map(t=>(
                    <span key={t.id} className={`adm-zone-sel${form.time_slot_ids.includes(t.id)?' on':''}`} onClick={()=>toggleSlot(t.id)}>
                      {t.name} <span style={{opacity:.65,fontSize:11}}>({t.day_name})</span>
                    </span>
                  ))}
                  {timeSlots.length===0 && <span style={{fontSize:12,color:'#9EB3A6'}}>No time slots defined</span>}
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Status</span>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div className={`adm-toggle${form.active?'':' off'}`} onClick={()=>setForm(f=>({...f,active:f.active?0:1}))}>
                    <div className="adm-toggle-thumb"/>
                  </div>
                  <div>
                    <div style={{fontSize:13.5,fontWeight:700,color:'#122B1D'}}>{form.active?'Active':'Inactive'}</div>
                    <div style={{fontSize:12,color:'#6B7F74',fontWeight:600}}>{form.active?'Driver can receive assignment immediately':'Driver will not appear in dispatch'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="adm-drawer-footer">
              <button className="adm-btn adm-btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={closeDrawer}>Cancel</button>
              <button className="adm-btn adm-btn-primary" style={{flex:2,justifyContent:'center'}} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : drawer==='add' ? 'Create Driver' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
