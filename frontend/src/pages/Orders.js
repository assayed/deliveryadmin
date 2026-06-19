import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Package, ChevronDown } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import api from '../api';

const EMPTY_ORDER = { order_ref: '', customer_name: '', customer_phone: '', customer_address: '', zone_id: '', branch_id: '', notes: '' };
const STATUSES = ['Unassigned', 'Assigned', 'Picked Up', 'Delivered', 'Failed'];
const FAIL_REASONS = ['Customer Unavailable', 'Wrong Address', 'Customer Refused', 'Other'];

export default function Orders({ tenant }) {
  const [orders, setOrders] = useState([]);
  const [zones, setZones] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ status: '', zone_id: '', branch_id: '' });
  const [modal, setModal] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [form, setForm] = useState(EMPTY_ORDER);
  const [statusForm, setStatusForm] = useState({ status: '', failed_reason: '', note: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const p = {};
    if (filters.status) p.status = filters.status;
    if (filters.zone_id) p.zone_id = filters.zone_id;
    if (filters.branch_id) p.branch_id = filters.branch_id;
    return api.getOrders(tenant.id, p).then(setOrders);
  }, [tenant.id, filters]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.getZones(tenant.id).then(setZones);
    api.getBranches(tenant.id).then(setBranches);
  }, [tenant.id]);

  const openAdd = () => { setForm(EMPTY_ORDER); setError(''); setModal('add'); };
  const openEdit = o => { setForm({ order_ref: o.order_ref, customer_name: o.customer_name, customer_phone: o.customer_phone, customer_address: o.customer_address, zone_id: o.zone_id || '', branch_id: o.branch_id || '', notes: o.notes || '' }); setError(''); setModal(o); };

  const save = async () => {
    if (!form.order_ref || !form.customer_name || !form.customer_phone || !form.customer_address) return setError('All required fields must be filled');
    setSaving(true); setError('');
    try {
      if (modal === 'add') await api.createOrder(tenant.id, form);
      else await api.updateOrder(tenant.id, modal.id, form);
      setModal(null); load();
    } catch (e) { setError(e.response?.data?.error || 'Error saving'); }
    setSaving(false);
  };

  const del = async o => {
    if (!window.confirm(`Delete order ${o.order_ref}?`)) return;
    await api.deleteOrder(tenant.id, o.id); load();
  };

  const openStatus = o => { setStatusForm({ status: o.status, failed_reason: o.failed_reason || '', note: '' }); setStatusModal(o); setError(''); };
  const saveStatus = async () => {
    if (statusForm.status === 'Failed' && !statusForm.failed_reason) return setError('Reason is required for Failed status');
    setSaving(true); setError('');
    try {
      await api.updateOrderStatus(tenant.id, statusModal.id, statusForm);
      setStatusModal(null);
      load();
      if (detailOrder?.id === statusModal.id) {
        const updated = await api.getOrders(tenant.id, {}).then(os => os.find(o => o.id === statusModal.id));
        if (updated) setDetailOrder(updated);
      }
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
    setSaving(false);
  };

  return (
    <div className="page">
      <div className="filter-bar">
        <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.zone_id} onChange={e => setFilters(f => ({...f, zone_id: e.target.value}))}>
          <option value="">All Zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select value={filters.branch_id} onChange={e => setFilters(f => ({...f, branch_id: e.target.value}))}>
          <option value="">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13}/>Refresh</button>
        <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}} onClick={openAdd}><Plus size={14}/>New Order</button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title"><Package size={16} style={{marginRight:6,verticalAlign:'middle'}}/>Orders ({orders.length})</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ref</th><th>Customer</th><th>Zone</th><th>Branch</th><th>Driver</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td><strong style={{cursor:'pointer',color:'var(--primary)'}} onClick={() => setDetailOrder(o)}>{o.order_ref}</strong></td>
                  <td>{o.customer_name}<br/><span style={{fontSize:11,color:'var(--gray-400)'}}>{o.customer_phone}</span></td>
                  <td>{o.zone?.name ? <span className="zone-tag">{o.zone.name}</span> : '—'}</td>
                  <td>{o.branch?.name || '—'}</td>
                  <td>{o.driver?.name || <span style={{color:'var(--gray-400)'}}>Unassigned</span>}</td>
                  <td><StatusBadge status={o.status}/></td>
                  <td style={{fontSize:11,color:'var(--gray-400)'}}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openStatus(o)} title="Update Status"><RefreshCw size={11}/></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(o)}><Edit2 size={11}/></button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(o)}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={8}><div className="empty-state">No orders found</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order form modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'New Order' : `Edit ${modal.order_ref}`} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid">
            <div className="form-group"><label>Order Ref *</label><input value={form.order_ref} onChange={e => setForm(f => ({...f, order_ref: e.target.value}))} placeholder="ORD-1234"/></div>
            <div className="form-group"><label>Customer Name *</label><input value={form.customer_name} onChange={e => setForm(f => ({...f, customer_name: e.target.value}))}/></div>
            <div className="form-group"><label>Phone *</label><input value={form.customer_phone} onChange={e => setForm(f => ({...f, customer_phone: e.target.value}))}/></div>
            <div className="form-group full"><label>Address *</label><input value={form.customer_address} onChange={e => setForm(f => ({...f, customer_address: e.target.value}))}/></div>
            <div className="form-group">
              <label>Zone</label>
              <select value={form.zone_id} onChange={e => setForm(f => ({...f, zone_id: e.target.value}))}>
                <option value="">— No zone —</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Branch</label>
              <select value={form.branch_id} onChange={e => setForm(f => ({...f, branch_id: e.target.value}))}>
                <option value="">— No branch —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group full"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}/></div>
          </div>
        </Modal>
      )}

      {/* Status update modal */}
      {statusModal && (
        <Modal title={`Update Status — ${statusModal.order_ref}`} onClose={() => setStatusModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setStatusModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveStatus} disabled={saving}>{saving ? 'Saving…' : 'Update'}</button>
          </>}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid cols-1">
            <div className="form-group">
              <label>Status</label>
              <select value={statusForm.status} onChange={e => setStatusForm(f => ({...f, status: e.target.value}))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {statusForm.status === 'Failed' && (
              <div className="form-group">
                <label>Failure Reason *</label>
                <select value={statusForm.failed_reason} onChange={e => setStatusForm(f => ({...f, failed_reason: e.target.value}))}>
                  <option value="">— Select reason —</option>
                  {FAIL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
            <div className="form-group"><label>Note (optional)</label><textarea value={statusForm.note} onChange={e => setStatusForm(f => ({...f, note: e.target.value}))} placeholder="Internal note…"/></div>
          </div>
        </Modal>
      )}

      {/* Order detail drawer */}
      {detailOrder && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDetailOrder(null)}>
          <div className="modal" style={{maxWidth:480}}>
            <div className="modal-header">
              <span className="modal-title">Order — {detailOrder.order_ref}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetailOrder(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                <div><div style={{fontSize:11,color:'var(--gray-400)'}}>Customer</div><strong>{detailOrder.customer_name}</strong></div>
                <div><div style={{fontSize:11,color:'var(--gray-400)'}}>Phone</div>{detailOrder.customer_phone}</div>
                <div className="full" style={{gridColumn:'1/-1'}}><div style={{fontSize:11,color:'var(--gray-400)'}}>Address</div>{detailOrder.customer_address}</div>
                <div><div style={{fontSize:11,color:'var(--gray-400)'}}>Zone</div>{detailOrder.zone?.name || '—'}</div>
                <div><div style={{fontSize:11,color:'var(--gray-400)'}}>Branch</div>{detailOrder.branch?.name || '—'}</div>
                <div><div style={{fontSize:11,color:'var(--gray-400)'}}>Driver</div>{detailOrder.driver?.name || 'Unassigned'}</div>
                <div><div style={{fontSize:11,color:'var(--gray-400)'}}>Status</div><StatusBadge status={detailOrder.status}/></div>
                {detailOrder.failed_reason && <div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,color:'var(--gray-400)'}}>Fail Reason</div><span className="badge badge-danger">{detailOrder.failed_reason}</span></div>}
              </div>
              <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>Status History</div>
              <div className="history-list">
                {detailOrder.history?.map(h => (
                  <div key={h.id} className="history-item">
                    <div>
                      <div className="history-status"><StatusBadge status={h.status}/></div>
                      {h.note && <div style={{fontSize:11,color:'var(--gray-500)',marginTop:2}}>{h.note}</div>}
                    </div>
                    <div className="history-time">{new Date(h.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
