import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const Search =  ({size=14}) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" strokeLinecap="round"/></svg>;
const Chevron = ({size=12}) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>;
const Filter =  ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M1 2h12v2L8 9v4l-2-1V9L1 4V2z"/></svg>;
const Clock =   ({size=12}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M7 0a7 7 0 100 14A7 7 0 007 0zm.5 7.7L5 6.3V3h1v2.9l2 1.3-.5.5z"/></svg>;
const Plus =    ({size=14}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>;
const X =       ({size=15}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>;
const Refresh = ({size=13}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a7 7 0 100 14A7 7 0 0010 3zm-1 4l3 3-3 3V7zm-2 3a5 5 0 118.66 2.5l-1.41-1.42A3 3 0 107 10H5z"/></svg>;

const STATUSES = ['Unassigned','Assigned','Picked Up','Delivered','Failed'];
const FAIL_REASONS = ['Customer Unavailable','Wrong Address','Customer Refused','Other'];

function Badge({ status }) {
  const map = {
    Unassigned: 'adm-badge-unassigned',
    Assigned:   'adm-badge-assigned',
    'Picked Up':'adm-badge-pickup',
    Delivered:  'adm-badge-delivered',
    Failed:     'adm-badge-failed',
  };
  return <span className={`adm-badge ${map[status]||'adm-badge-inactive'}`}>{status}</span>;
}

export default function Orders({ tenant }) {
  const [orders, setOrders] = useState([]);
  const [zones, setZones] = useState([]);
  const [branches, setBranches] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [detailOrder, setDetailOrder] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [statusForm, setStatusForm] = useState({ status:'', failed_reason:'', note:'' });
  const [newOrderDrawer, setNewOrderDrawer] = useState(false);
  const [orderForm, setOrderForm] = useState({ order_ref:'', customer_name:'', customer_phone:'', customer_address:'', zone_id:'', branch_id:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const load = useCallback(() => {
    const p = {};
    if (filterStatus) p.status = filterStatus;
    if (filterZone) p.zone_id = filterZone;
    if (filterDriver) p.driver_id = filterDriver;
    return api.getOrders(tenant.id, p).then(setOrders);
  }, [tenant.id, filterStatus, filterZone, filterDriver]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.getZones(tenant.id).then(setZones);
    api.getBranches(tenant.id).then(setBranches);
    api.getDrivers(tenant.id).then(setDrivers);
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
    try {
      await api.updateOrderStatus(tenant.id, statusModal.id, statusForm);
      setStatusModal(null); load();
    } catch(e) { setError(e.response?.data?.error||'Error'); }
    setSaving(false);
  };

  const saveOrder = async () => {
    if (!orderForm.order_ref||!orderForm.customer_name||!orderForm.customer_phone||!orderForm.customer_address) return setError('All required fields must be filled');
    setSaving(true); setError('');
    try {
      await api.createOrder(tenant.id, orderForm);
      setNewOrderDrawer(false);
      setOrderForm({ order_ref:'', customer_name:'', customer_phone:'', customer_address:'', zone_id:'', branch_id:'', notes:'' });
      load();
    } catch(e) { setError(e.response?.data?.error||'Error'); }
    setSaving(false);
  };

  const del = async o => {
    if (!window.confirm(`Delete order ${o.order_ref}?`)) return;
    await api.deleteOrder(tenant.id, o.id); load();
  };

  return (
    <div style={{position:'relative',flex:1,overflow:'hidden'}}>
      <div className="adm-content">
        {/* Filter row */}
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
          <button className="adm-btn adm-btn-ghost" style={{gap:5}}><Filter size={12}/> Filter</button>
          <div style={{marginLeft:'auto',display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
            {STATUSES.map(s=>(
              <span key={s} className={`adm-badge adm-badge-${s.toLowerCase().replace(' ','-').replace(' ','')}`}
                style={{cursor:'pointer'}} onClick={()=>setFilterStatus(f=>f===s?'':s)}>
                {summary[s]||0} {s}
              </span>
            ))}
          </div>
          <button className="adm-btn adm-btn-ghost" style={{gap:5}}><Refresh size={12}/></button>
          <button className="adm-btn adm-btn-primary" onClick={()=>setNewOrderDrawer(true)}><Plus/> New Order</button>
        </div>

        {/* Table */}
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Zone</th>
                <th>Time</th>
                <th>Assigned Driver</th>
                <th>Failure Reason</th>
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
                  </td>
                  <td><Badge status={o.status}/></td>
                  <td>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:700}}>{o.customer_name}</div>
                    <div style={{fontSize:11.5,color:'#6B7F74',fontWeight:600}}>{o.customer_phone}</div>
                  </td>
                  <td>{o.zone ? <span className="adm-zone-chip">{o.zone.name}</span> : <span style={{color:'#C8D8CF',fontSize:12}}>—</span>}</td>
                  <td style={{fontSize:12.5,color:'#6B7F74',fontWeight:600,whiteSpace:'nowrap'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5}}><Clock/> {new Date(o.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>
                  </td>
                  <td style={{fontSize:13,fontWeight:600,color:o.driver?'#122B1D':'#C8D8CF'}}>{o.driver?.name||'—'}</td>
                  <td style={{fontSize:12.5,fontWeight:700,color:'#C8372D'}}>{o.failed_reason||''}</td>
                  <td>
                    <div style={{display:'flex',gap:5}}>
                      <button className="adm-btn adm-btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>openStatusModal(o)}>
                        Update
                      </button>
                      <button className="adm-btn" style={{padding:'5px 10px',fontSize:12,background:'#FDE8E6',color:'#C8372D',border:'none'}} onClick={()=>del(o)}>
                        <X size={11}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length===0 && (
                <tr><td colSpan={8}>
                  <div className="adm-empty"><div className="adm-empty-title">No orders found</div></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:12.5,color:'#6B7F74',fontWeight:600}}>
            Showing {Math.min((page-1)*PER_PAGE+1, filtered.length)}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length} orders · Status timestamps retained per transition
          </span>
          <div style={{display:'flex',gap:5}}>
            {['←', ...Array.from({length:Math.min(totalPages,5)},(_,i)=>i+1), totalPages>5?'…':null, totalPages>5?totalPages:null, '→'].filter(Boolean).map((p,i) => (
              <div key={i} onClick={()=>typeof p==='number'&&setPage(p)}
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

      {/* ── Order Detail Drawer ── */}
      {detailOrder && (
        <div className="adm-overlay" onClick={e=>e.target===e.currentTarget&&setDetailOrder(null)}>
          <div className="adm-drawer">
            <div className="adm-drawer-hdr">
              <span className="adm-drawer-title">{detailOrder.order_ref}</span>
              <button className="adm-icon-btn" onClick={()=>setDetailOrder(null)}><X size={14}/></button>
            </div>
            <div className="adm-drawer-body" style={{gap:10}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {[['Customer',detailOrder.customer_name],['Phone',detailOrder.customer_phone],['Zone',detailOrder.zone?.name||'—'],['Branch',detailOrder.branch?.name||'—'],['Driver',detailOrder.driver?.name||'Unassigned'],['Status',null]].map(([label,val])=>(
                  <div key={label}>
                    <div style={{fontSize:10.5,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'#9EB3A6',marginBottom:3}}>{label}</div>
                    {val!==null ? <div style={{fontSize:13.5,fontWeight:700,color:'#122B1D'}}>{val}</div> : <Badge status={detailOrder.status}/>}
                  </div>
                ))}
                <div style={{gridColumn:'1/-1'}}>
                  <div style={{fontSize:10.5,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'#9EB3A6',marginBottom:3}}>Address</div>
                  <div style={{fontSize:13,fontWeight:600,color:'#3D5247'}}>{detailOrder.customer_address}</div>
                </div>
                {detailOrder.failed_reason && (
                  <div style={{gridColumn:'1/-1'}}>
                    <div style={{fontSize:10.5,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'#9EB3A6',marginBottom:3}}>Failure Reason</div>
                    <span className="adm-badge adm-badge-failed">{detailOrder.failed_reason}</span>
                  </div>
                )}
              </div>
            </div>
            {detailOrder.history?.length > 0 && (
              <div>
                <div style={{padding:'12px 20px 8px',fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,color:'#122B1D',borderTop:'1px solid #E2E9E4'}}>Status History</div>
                <div className="adm-timeline">
                  {detailOrder.history.map(h => (
                    <div key={h.id} className="adm-tl-item">
                      <div style={{flex:1}}>
                        <Badge status={h.status}/>
                        {h.note && <div style={{fontSize:11.5,color:'#6B7F74',fontWeight:600,marginTop:3}}>{h.note}</div>}
                      </div>
                      <div className="adm-tl-time">{new Date(h.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              {[['Order Ref *','order_ref','ORD-1234','text'],['Customer Name *','customer_name','Full name','text'],['Phone *','customer_phone','+966…','text'],['Delivery Address *','customer_address','Street address','text']].map(([lbl,key,ph,type])=>(
                <div className="adm-field" key={key}>
                  <span className="adm-field-lbl">{lbl}</span>
                  <input className="adm-field-input" type={type} value={orderForm[key]} onChange={e=>setOrderForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}/>
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
