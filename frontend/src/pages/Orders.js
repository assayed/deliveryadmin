import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const Search =  ({size=14}) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" strokeLinecap="round"/></svg>;
const Chevron = ({size=12}) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>;
const Plus =    ({size=14}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>;
const X =       ({size=15}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>;
const Clock =   ({size=12}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M7 0a7 7 0 100 14A7 7 0 007 0zm.5 7.7L5 6.3V3h1v2.9l2 1.3-.5.5z"/></svg>;
const Refresh = ({size=13}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a7 7 0 100 14A7 7 0 0010 3zm-1 4l3 3-3 3V7zm-2 3a5 5 0 118.66 2.5l-1.41-1.42A3 3 0 107 10H5z"/></svg>;
const Camera =  ({size=14}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M8 2l-1.5 2H3a1 1 0 00-1 1v10a1 1 0 001 1h14a1 1 0 001-1V5a1 1 0 00-1-1h-3.5L12 2H8zm2 3.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7z"/></svg>;
const Trash =   ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M1 3h12v1.5H1V3zm2 1.5h8l-.8 8H3.8l-.8-8zm3-3h2v1H6V1.5z"/></svg>;

const STATUSES = ['Unassigned','Assigned','Picked Up','Delivered','Failed'];
const FAIL_REASONS = ['Customer Unavailable','Wrong Address','Customer Refused','Other'];

function Badge({ status }) {
  const map = {
    Unassigned: 'adm-badge-unassigned', Assigned: 'adm-badge-assigned',
    'Picked Up':'adm-badge-pickup', Delivered: 'adm-badge-delivered', Failed: 'adm-badge-failed',
  };
  return <span className={`adm-badge ${map[status]||'adm-badge-inactive'}`}>{status}</span>;
}

function AuditTimeline({ items }) {
  if (!items || items.length === 0) return null;
  const ICONS = { order_created:'🆕', order_assigned:'🚗', order_reassigned:'🔄', status_changed:'📋', order_updated:'✏️' };
  return (
    <div>
      <div style={{ padding:'12px 20px 6px', fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:700, color:'#122B1D', borderTop:'1px solid #E2E9E4' }}>Audit Log</div>
      <div className="adm-timeline">
        {items.map(a => (
          <div key={a.id} className="adm-tl-item">
            <span style={{ fontSize: 15 }}>{ICONS[a.action] || '📌'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#122B1D', textTransform: 'capitalize' }}>{a.action.replace(/_/g,' ')}</div>
              {a.new_value && (() => { try { const v = JSON.parse(a.new_value); return <div style={{ fontSize: 11.5, color: '#6B7F74', fontWeight: 600 }}>{Object.entries(v).filter(([,val]) => val != null).map(([k,v]) => `${k}: ${v}`).join(' · ')}</div>; } catch { return null; } })()}
              <div style={{ fontSize: 11, color: '#9EB3A6', fontWeight: 600 }}>{a.performed_by}</div>
            </div>
            <div className="adm-tl-time">{new Date(a.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageGallery({ tenantId, orderId, images, onRefresh }) {
  const [uploading, setUploading] = useState(false);

  const upload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append('image', file);
    try { await api.uploadOrderImage(tenantId, orderId, fd); onRefresh(); }
    catch (err) { alert(err.response?.data?.error || 'Upload failed'); }
    setUploading(false);
    e.target.value = '';
  };

  const del = async imgId => {
    if (!window.confirm('Delete this image?')) return;
    await api.deleteOrderImage(tenantId, orderId, imgId); onRefresh();
  };

  const BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  return (
    <div>
      <div style={{ padding:'12px 20px 6px', fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:700, color:'#122B1D', borderTop:'1px solid #E2E9E4', display:'flex', alignItems:'center', gap:8 }}>
        Proof of Delivery <span style={{ fontWeight:600, fontSize:12, color:'#6B7F74' }}>({images.length} photo{images.length!==1?'s':''})</span>
      </div>
      <div style={{ padding:'0 20px 12px', display:'flex', flexWrap:'wrap', gap:10 }}>
        {images.map(img => (
          <div key={img.id} style={{ position:'relative', width:90, height:90 }}>
            <img src={`${BASE}${img.url}`} alt="proof" style={{ width:90, height:90, objectFit:'cover', borderRadius:9, border:'1.5px solid #E2E9E4' }} />
            <button onClick={() => del(img.id)} style={{ position:'absolute', top:3, right:3, width:20, height:20, borderRadius:'50%', background:'rgba(200,55,45,0.85)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
              <X size={9} />
            </button>
          </div>
        ))}
        <label style={{ width:90, height:90, borderRadius:9, border:'2px dashed #C8D8CF', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#9EB3A6', fontSize:11, fontWeight:700, gap:4 }}>
          {uploading ? 'Uploading…' : <><Camera size={20} />Upload</>}
          <input type="file" accept="image/*" style={{ display:'none' }} onChange={upload} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

export default function Orders({ tenant }) {
  const [orders, setOrders] = useState([]);
  const [zones, setZones] = useState([]);
  const [branches, setBranches] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterSlot, setFilterSlot] = useState('');
  const [detailOrder, setDetailOrder] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [statusForm, setStatusForm] = useState({ status:'', failed_reason:'', note:'' });
  const [reassignModal, setReassignModal] = useState(null);
  const [reassignDriver, setReassignDriver] = useState('');
  const [newOrderDrawer, setNewOrderDrawer] = useState(false);
  const [orderForm, setOrderForm] = useState({ order_ref:'', customer_name:'', customer_phone:'', customer_address:'', zone_id:'', branch_id:'', time_slot_id:'', free_delivery:0, notes:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const load = useCallback(() => {
    const p = {};
    if (filterStatus) p.status = filterStatus;
    if (filterZone) p.zone_id = filterZone;
    if (filterDriver) p.driver_id = filterDriver;
    if (filterSlot) p.time_slot_id = filterSlot;
    return api.getOrders(tenant.id, p).then(setOrders);
  }, [tenant.id, filterStatus, filterZone, filterDriver, filterSlot]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.getZones(tenant.id).then(setZones);
    api.getBranches(tenant.id).then(setBranches);
    api.getDrivers(tenant.id).then(setDrivers);
    api.getTimeSlots(tenant.id).then(setTimeSlots);
  }, [tenant.id]);

  const filtered = orders.filter(o =>
    !search || o.order_ref.toLowerCase().includes(search.toLowerCase()) || o.customer_name.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const summary = STATUSES.reduce((acc, s) => ({ ...acc, [s]: orders.filter(o=>o.status===s).length }), {});

  const openStatusModal = o => { setStatusForm({ status:o.status, failed_reason:o.failed_reason||'', note:'' }); setError(''); setStatusModal(o); };
  const saveStatus = async () => {
    if (statusForm.status==='Failed' && !statusForm.failed_reason) return setError('Failure reason is required');
    setSaving(true); setError('');
    try { await api.updateOrderStatus(tenant.id, statusModal.id, statusForm); setStatusModal(null); load(); }
    catch(e) { setError(e.response?.data?.error||'Error'); }
    setSaving(false);
  };

  const openReassign = o => { setReassignDriver(''); setError(''); setReassignModal(o); };
  const saveReassign = async () => {
    if (!reassignDriver) return setError('Select a driver');
    setSaving(true); setError('');
    try { await api.reassignOrder(tenant.id, reassignModal.id, reassignDriver); setReassignModal(null); load(); }
    catch(e) { setError(e.response?.data?.error||'Error'); }
    setSaving(false);
  };

  const saveOrder = async () => {
    if (!orderForm.order_ref||!orderForm.customer_name||!orderForm.customer_phone||!orderForm.customer_address) return setError('All required fields must be filled');
    setSaving(true); setError('');
    try {
      await api.createOrder(tenant.id, { ...orderForm, zone_id: orderForm.zone_id||null, branch_id: orderForm.branch_id||null, time_slot_id: orderForm.time_slot_id||null });
      setNewOrderDrawer(false);
      setOrderForm({ order_ref:'', customer_name:'', customer_phone:'', customer_address:'', zone_id:'', branch_id:'', time_slot_id:'', free_delivery:0, notes:'' });
      load();
    } catch(e) { setError(e.response?.data?.error||'Error'); }
    setSaving(false);
  };

  const del = async o => {
    if (!window.confirm(`Delete order ${o.order_ref}?`)) return;
    await api.deleteOrder(tenant.id, o.id); load();
  };

  const refreshDetail = async () => {
    if (!detailOrder) return;
    const fresh = await api.getOrders(tenant.id, {}).then(list => list.find(o => o.id === detailOrder.id));
    if (fresh) setDetailOrder(fresh);
  };

  return (
    <div style={{position:'relative',flex:1,overflow:'hidden'}}>
      <div className="adm-content">
        <div className="adm-filter-row" style={{flexWrap:'wrap',gap:8}}>
          <div className="adm-search">
            <Search size={14}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by order ID or customer…"/>
          </div>
          <div className="adm-select">
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select><Chevron/>
          </div>
          <div className="adm-select">
            <select value={filterZone} onChange={e=>setFilterZone(e.target.value)}>
              <option value="">All Zones</option>
              {zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}
            </select><Chevron/>
          </div>
          <div className="adm-select">
            <select value={filterDriver} onChange={e=>setFilterDriver(e.target.value)}>
              <option value="">All Drivers</option>
              {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select><Chevron/>
          </div>
          <div className="adm-select">
            <select value={filterSlot} onChange={e=>setFilterSlot(e.target.value)}>
              <option value="">All Slots</option>
              {timeSlots.map(t=><option key={t.id} value={t.id}>{t.name} ({t.day_name})</option>)}
            </select><Chevron/>
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
            {STATUSES.map(s=>(
              <span key={s} className={`adm-badge adm-badge-${s.toLowerCase().replace(/ /g,'-')}`}
                style={{cursor:'pointer'}} onClick={()=>setFilterStatus(f=>f===s?'':s)}>
                {summary[s]||0} {s}
              </span>
            ))}
          </div>
          <button className="adm-btn adm-btn-ghost" style={{gap:5}} onClick={load}><Refresh size={12}/></button>
          <button className="adm-btn adm-btn-primary" onClick={()=>setNewOrderDrawer(true)}><Plus/> New Order</button>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Zone</th>
                <th>Time Slot</th>
                <th>Assigned Driver</th>
                <th>Fee</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(o => (
                <tr key={o.id} style={o.status==='Failed'?{background:'#FFF9F8'}:{}}>
                  <td>
                    <span style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,color:'#6B7F74',letterSpacing:'.08em',cursor:'pointer',textDecoration:'underline',textDecorationColor:'#C8D8CF'}}
                      onClick={()=>setDetailOrder(o)}>
                      {o.order_ref}
                    </span>
                    {o.failed_reason && <div style={{fontSize:11,color:'#C8372D',fontWeight:700}}>{o.failed_reason}</div>}
                  </td>
                  <td><Badge status={o.status}/></td>
                  <td>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:700}}>{o.customer_name}</div>
                    <div style={{fontSize:11.5,color:'#6B7F74',fontWeight:600}}>{o.customer_phone}</div>
                  </td>
                  <td>{o.zone ? <span className="adm-zone-chip">{o.zone.name}</span> : <span style={{color:'#C8D8CF',fontSize:12}}>—</span>}</td>
                  <td style={{fontSize:12,color:'#6B7F74',fontWeight:600}}>
                    {o.time_slot ? <span><Clock size={11}/> {o.time_slot.name}</span> : <span style={{color:'#C8D8CF'}}>—</span>}
                  </td>
                  <td style={{fontSize:13,fontWeight:600,color:o.driver?'#122B1D':'#C8D8CF'}}>{o.driver?.name||'—'}</td>
                  <td>
                    {o.free_delivery
                      ? <span className="adm-badge adm-badge-active" style={{fontSize:11}}>Free</span>
                      : <span style={{fontSize:12.5,fontWeight:700,color:'#3D5247'}}>—</span>}
                  </td>
                  <td>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      <button className="adm-btn adm-btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>openStatusModal(o)}>Status</button>
                      {['Assigned','Picked Up'].includes(o.status) && (
                        <button className="adm-btn adm-btn-ghost" style={{padding:'5px 10px',fontSize:12,color:'#1A7DA8',borderColor:'#B8D8EB'}} onClick={()=>openReassign(o)}>Reassign</button>
                      )}
                      <button className="adm-btn" style={{padding:'5px 10px',fontSize:12,background:'#FDE8E6',color:'#C8372D',border:'none'}} onClick={()=>del(o)}><X size={11}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length===0 && (
                <tr><td colSpan={8}><div className="adm-empty"><div className="adm-empty-title">No orders found</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:12.5,color:'#6B7F74',fontWeight:600}}>
            Showing {Math.min((page-1)*PER_PAGE+1,filtered.length)}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length} orders
          </span>
          <div style={{display:'flex',gap:5}}>
            {Array.from({length:Math.min(totalPages,7)},(_,i)=>i+1).map(p=>(
              <div key={p} onClick={()=>setPage(p)}
                style={{width:28,height:28,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12.5,fontWeight:700,background:p===page?'#0B5132':'#fff',color:p===page?'#fff':'#6B7F74',border:'1px solid #E2E9E4',cursor:'pointer',userSelect:'none'}}>
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Status Update Modal ── */}
      {statusModal && (
        <div className="adm-modal-wrap" onClick={e=>e.target===e.currentTarget&&setStatusModal(null)}>
          <div className="adm-modal">
            <div className="adm-modal-hdr">
              <span className="adm-modal-title">Update Status — {statusModal.order_ref}</span>
              <button className="adm-icon-btn" onClick={()=>setStatusModal(null)}><X size={14}/></button>
            </div>
            <div className="adm-modal-body">
              {error && <div className="adm-alert adm-alert-error">{error}</div>}
              <div className="adm-field">
                <span className="adm-field-lbl">New Status</span>
                <div className="adm-field-select">
                  <select value={statusForm.status} onChange={e=>setStatusForm(f=>({...f,status:e.target.value}))}>
                    {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select><Chevron/>
                </div>
              </div>
              {statusForm.status==='Failed' && (
                <div className="adm-field">
                  <span className="adm-field-lbl">Failure Reason *</span>
                  <div className="adm-field-select">
                    <select value={statusForm.failed_reason} onChange={e=>setStatusForm(f=>({...f,failed_reason:e.target.value}))}>
                      <option value="">— Select reason —</option>
                      {FAIL_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
                    </select><Chevron/>
                  </div>
                </div>
              )}
              <div className="adm-field">
                <span className="adm-field-lbl">Note (optional)</span>
                <textarea className="adm-field-input" value={statusForm.note} onChange={e=>setStatusForm(f=>({...f,note:e.target.value}))} placeholder="Internal note…" rows={3}/>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={()=>setStatusModal(null)}>Cancel</button>
              <button className="adm-btn adm-btn-primary" onClick={saveStatus} disabled={saving}>{saving?'Saving…':'Update Status'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reassign Modal ── */}
      {reassignModal && (
        <div className="adm-modal-wrap" onClick={e=>e.target===e.currentTarget&&setReassignModal(null)}>
          <div className="adm-modal">
            <div className="adm-modal-hdr">
              <span className="adm-modal-title">Reassign — {reassignModal.order_ref}</span>
              <button className="adm-icon-btn" onClick={()=>setReassignModal(null)}><X size={14}/></button>
            </div>
            <div className="adm-modal-body">
              {error && <div className="adm-alert adm-alert-error">{error}</div>}
              <div style={{fontSize:13,color:'#6B7F74',fontWeight:600,marginBottom:10}}>
                Currently assigned to: <strong style={{color:'#122B1D'}}>{reassignModal.driver?.name || '—'}</strong>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">New Driver</span>
                <div className="adm-field-select">
                  <select value={reassignDriver} onChange={e=>setReassignDriver(e.target.value)}>
                    <option value="">— Select driver —</option>
                    {drivers.filter(d=>d.active && d.id !== reassignModal.driver_id).map(d=>(
                      <option key={d.id} value={d.id}>{d.name} ({d.current_load}/{d.max_concurrent_orders})</option>
                    ))}
                  </select><Chevron/>
                </div>
              </div>
              <div style={{fontSize:12,color:'#9EB3A6',fontWeight:600,marginTop:4}}>Old and new driver will be logged in the audit trail. New driver receives a notification.</div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={()=>setReassignModal(null)}>Cancel</button>
              <button className="adm-btn adm-btn-primary" onClick={saveReassign} disabled={saving}>{saving?'Saving…':'Reassign Driver'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Detail Drawer ── */}
      {detailOrder && (
        <div className="adm-overlay" onClick={e=>e.target===e.currentTarget&&setDetailOrder(null)}>
          <div className="adm-drawer" style={{width:500,maxWidth:'95vw'}}>
            <div className="adm-drawer-hdr">
              <span className="adm-drawer-title">{detailOrder.order_ref}</span>
              <div style={{display:'flex',gap:8}}>
                {detailOrder.free_delivery ? <span className="adm-badge adm-badge-active">Free Delivery</span> : null}
                <button className="adm-icon-btn" onClick={()=>setDetailOrder(null)}><X size={14}/></button>
              </div>
            </div>
            <div className="adm-drawer-body" style={{gap:10}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {[
                  ['Customer', detailOrder.customer_name],
                  ['Phone', detailOrder.customer_phone],
                  ['Zone', detailOrder.zone?.name||'—'],
                  ['Branch', detailOrder.branch?.name||'—'],
                  ['Driver', detailOrder.driver?.name||'Unassigned'],
                  ['Time Slot', detailOrder.time_slot ? `${detailOrder.time_slot.name} (${detailOrder.time_slot.start_time}–${detailOrder.time_slot.end_time})` : '—'],
                  ['Status', null],
                  ['Created', new Date(detailOrder.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})],
                ].map(([label,val])=>(
                  <div key={label}>
                    <div style={{fontSize:10.5,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'#9EB3A6',marginBottom:3}}>{label}</div>
                    {val!==null ? <div style={{fontSize:13.5,fontWeight:700,color:'#122B1D'}}>{val}</div> : <Badge status={detailOrder.status}/>}
                  </div>
                ))}
                <div style={{gridColumn:'1/-1'}}>
                  <div style={{fontSize:10.5,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'#9EB3A6',marginBottom:3}}>Address</div>
                  <div style={{fontSize:13,fontWeight:600,color:'#3D5247'}}>{detailOrder.customer_address}</div>
                </div>
                {detailOrder.notes && (
                  <div style={{gridColumn:'1/-1'}}>
                    <div style={{fontSize:10.5,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'#9EB3A6',marginBottom:3}}>Notes</div>
                    <div style={{fontSize:13,color:'#3D5247'}}>{detailOrder.notes}</div>
                  </div>
                )}
                {detailOrder.failed_reason && (
                  <div style={{gridColumn:'1/-1'}}>
                    <div style={{fontSize:10.5,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'#9EB3A6',marginBottom:3}}>Failure Reason</div>
                    <span className="adm-badge adm-badge-failed">{detailOrder.failed_reason}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status history */}
            {detailOrder.history?.length > 0 && (
              <div>
                <div style={{padding:'12px 20px 8px',fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,color:'#122B1D',borderTop:'1px solid #E2E9E4'}}>Status History</div>
                <div className="adm-timeline">
                  {detailOrder.history.map((h,i) => (
                    <div key={i} className="adm-tl-item">
                      <div style={{flex:1}}>
                        <Badge status={h.status}/>
                        {h.note && <div style={{fontSize:11.5,color:'#6B7F74',fontWeight:600,marginTop:3}}>{h.note}</div>}
                      </div>
                      <div className="adm-tl-time">{new Date(h.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <AuditTimeline items={detailOrder.audit} />

            <ImageGallery tenantId={tenant.id} orderId={detailOrder.id} images={detailOrder.images||[]} onRefresh={refreshDetail} />

            <div className="adm-drawer-footer">
              <button className="adm-btn adm-btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setDetailOrder(null)}>Close</button>
              <button className="adm-btn adm-btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>{openStatusModal(detailOrder);setDetailOrder(null);}}>Update Status</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Order Drawer ── */}
      {newOrderDrawer && (
        <div className="adm-overlay" onClick={e=>e.target===e.currentTarget&&setNewOrderDrawer(false)}>
          <div className="adm-drawer">
            <div className="adm-drawer-hdr">
              <span className="adm-drawer-title">New Order</span>
              <button className="adm-icon-btn" onClick={()=>setNewOrderDrawer(false)}><X size={14}/></button>
            </div>
            <div className="adm-drawer-body">
              {error && <div className="adm-alert adm-alert-error">{error}</div>}
              {[['Order Ref *','order_ref','ORD-1234'],['Customer Name *','customer_name','Full name'],['Phone *','customer_phone','+966…'],['Delivery Address *','customer_address','Street address']].map(([lbl,key,ph])=>(
                <div className="adm-field" key={key}>
                  <span className="adm-field-lbl">{lbl}</span>
                  <input className="adm-field-input" value={orderForm[key]} onChange={e=>setOrderForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}/>
                </div>
              ))}
              <div className="adm-field">
                <span className="adm-field-lbl">Zone</span>
                <div className="adm-field-select">
                  <select value={orderForm.zone_id} onChange={e=>setOrderForm(f=>({...f,zone_id:e.target.value}))}>
                    <option value="">— No zone —</option>
                    {zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}
                  </select><Chevron/>
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Branch</span>
                <div className="adm-field-select">
                  <select value={orderForm.branch_id} onChange={e=>setOrderForm(f=>({...f,branch_id:e.target.value}))}>
                    <option value="">— No branch —</option>
                    {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                  </select><Chevron/>
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Time Slot</span>
                <div className="adm-field-select">
                  <select value={orderForm.time_slot_id} onChange={e=>setOrderForm(f=>({...f,time_slot_id:e.target.value}))}>
                    <option value="">— No time slot —</option>
                    {timeSlots.map(t=><option key={t.id} value={t.id}>{t.name} ({t.day_name})</option>)}
                  </select><Chevron/>
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Free Delivery</span>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div className={`adm-toggle${orderForm.free_delivery?' ':' off'}`} onClick={()=>setOrderForm(f=>({...f,free_delivery:f.free_delivery?0:1}))}>
                    <div className="adm-toggle-thumb"/>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:'#3D5247'}}>{orderForm.free_delivery?'No delivery fee charged':'Normal delivery fee applies'}</span>
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Notes</span>
                <textarea className="adm-field-input" value={orderForm.notes} onChange={e=>setOrderForm(f=>({...f,notes:e.target.value}))} placeholder="Internal notes…" rows={3}/>
              </div>
            </div>
            <div className="adm-drawer-footer">
              <button className="adm-btn adm-btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setNewOrderDrawer(false)}>Cancel</button>
              <button className="adm-btn adm-btn-primary" style={{flex:2,justifyContent:'center'}} onClick={saveOrder} disabled={saving}>{saving?'Saving…':'Create Order'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
