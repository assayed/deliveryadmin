import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';

const Plus =  ({size=14}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>;
const Edit =  ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M10.6.9a2 2 0 012.5 3.1L4.8 12.3l-3.5.8.8-3.5L10.6.9z"/></svg>;
const X =     ({size=15}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>;
const Trash = ({size=13}) => <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor"><path d="M1 3h12v1.5H1V3zm2 1.5h8l-.8 8H3.8l-.8-8zm3-3h2v1H6V1.5z"/></svg>;
const Map =   ({size=15}) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M12.9 2L7 4 2 2v16l5 2 6-2 5 2V4l-5.1-2zM7 18V5.5l6-1.5V17L7 18z"/></svg>;

const EMPTY_FORM = { name: '', color: '#0B5132', branch_id: '' };

// Leaflet map component for polygon drawing
function ZoneMapDrawer({ initialCoords, onSave, onClose }) {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const drawnLayersRef = useRef(null);

  useEffect(() => {
    // Dynamic import of leaflet
    const L = window.L;
    if (!L || mapRef.current._leaflet_id) return;

    const map = L.map(mapRef.current, { center: [24.7136, 46.6753], zoom: 11 });
    leafletRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    drawnLayersRef.current = drawnItems;
    map.addLayer(drawnItems);

    // If editing existing polygon, load it
    if (initialCoords && initialCoords.length > 0) {
      const polygon = L.polygon(initialCoords, { color: '#0B5132', fillOpacity: 0.25 });
      drawnItems.addLayer(polygon);
      map.fitBounds(polygon.getBounds(), { padding: [30, 30] });
    }

    // Check if leaflet-draw is available
    if (L.Control && L.Control.Draw) {
      const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItems },
        draw: {
          polygon: { shapeOptions: { color: '#0B5132', fillOpacity: 0.25 } },
          polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
        },
      });
      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, e => {
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);
      });
    }

    return () => { map.remove(); };
  }, []);

  const handleSave = () => {
    const layers = drawnLayersRef.current;
    if (!layers || layers.getLayers().length === 0) {
      alert('Please draw a polygon on the map first');
      return;
    }
    const coords = layers.getLayers()[0].getLatLngs()[0].map(ll => [ll.lat, ll.lng]);
    onSave(coords);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', width: '90vw', maxWidth: 760, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E9E4' }}>
          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15 }}>Draw Zone Polygon</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="adm-btn adm-btn-primary" onClick={handleSave}>Save Polygon</button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#6B7F74', padding: '8px 18px', background: '#F4F6F5', fontWeight: 600 }}>
          Use the polygon tool (⬡) in the top-left toolbar to draw the zone boundary. Click each corner point and double-click to finish.
        </div>
        <div ref={mapRef} style={{ height: 480, width: '100%' }} />
      </div>
    </div>
  );
}

export default function Zones({ tenant }) {
  const [zones, setZones] = useState([]);
  const [branches, setBranches] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [coords, setCoords] = useState([]);
  const [mapOpen, setMapOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => Promise.all([
    api.getZones(tenant.id).then(setZones),
    api.getBranches(tenant.id).then(setBranches),
  ]), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  // Load leaflet CSS
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      document.head.appendChild(script);
      script.onload = () => {
        // Load leaflet-draw
        const drawCss = document.createElement('link');
        drawCss.rel = 'stylesheet';
        drawCss.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
        document.head.appendChild(drawCss);
        const drawScript = document.createElement('script');
        drawScript.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
        document.head.appendChild(drawScript);
      };
    }
  }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setCoords([]); setError(''); setDrawer('add'); };
  const openEdit = z => {
    setForm({ name: z.name || '', color: z.color || '#0B5132', branch_id: z.branch_id || '' });
    setCoords(z.coordinates ? JSON.parse(z.coordinates) : []);
    setError(''); setDrawer(z);
  };
  const close = () => setDrawer(null);

  const save = async () => {
    if (!form.name.trim()) return setError('Zone name is required');
    setSaving(true); setError('');
    try {
      const data = { ...form, coordinates: coords.length ? JSON.stringify(coords) : null, branch_id: form.branch_id || null };
      if (drawer === 'add') await api.createZone(tenant.id, data);
      else await api.updateZone(tenant.id, drawer.id, data);
      close(); load();
    } catch (e) { setError(e.response?.data?.error || 'Error saving zone'); }
    setSaving(false);
  };

  const del = async z => {
    if (!window.confirm(`Delete zone "${z.name}"?`)) return;
    await api.deleteZone(tenant.id, z.id); load();
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const ZONE_COLORS = ['#0B5132','#1A7DA8','#7A5210','#C8372D','#2D6E4E','#156A8C','#6B1A7D','#7D6B1A'];

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div className="adm-content">
        <div className="adm-filter-row">
          <div style={{ fontSize: 13, color: '#6B7F74', fontWeight: 600 }}>
            <span style={{ color: '#0B5132', fontWeight: 800, fontSize: 18 }}>{zones.length}</span> zones defined
          </div>
          <div style={{ marginLeft: 'auto' }} />
          <button className="adm-btn adm-btn-primary" onClick={openAdd}><Plus /> Add Zone</button>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Branch</th>
                <th>Polygon</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {zones.map(z => {
                const parsedCoords = z.coordinates ? (() => { try { return JSON.parse(z.coordinates); } catch { return []; } })() : [];
                return (
                  <tr key={z.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: z.color || '#E7F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Map size={14} style={{ color: '#fff' }} />
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700 }}>{z.name}</div>
                          <div style={{ fontSize: 11.5, color: '#6B7F74', fontWeight: 600 }}>#{z.id.slice(0, 6)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: '#3D5247' }}>{z.branch?.name || <span style={{ color: '#C8D8CF' }}>—</span>}</td>
                    <td>
                      {parsedCoords.length > 0
                        ? <span className="adm-badge adm-badge-active">{parsedCoords.length} points</span>
                        : <span style={{ fontSize: 12, color: '#C8D8CF' }}>No polygon</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="adm-btn adm-btn-ghost" style={{ padding: '5px 11px', fontSize: 12 }} onClick={() => openEdit(z)}><Edit size={12} /> Edit</button>
                        <button className="adm-btn" style={{ padding: '5px 10px', fontSize: 12, background: '#FDE8E6', color: '#C8372D', border: 'none' }} onClick={() => del(z)}><Trash size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {zones.length === 0 && (
                <tr><td colSpan={4}>
                  <div className="adm-empty"><div className="adm-empty-title">No zones defined</div><div style={{ fontSize: 12.5, color: '#9EB3A6' }}>Add delivery zones to organize dispatch</div></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mapOpen && (
        <ZoneMapDrawer
          initialCoords={coords}
          onSave={c => { setCoords(c); setMapOpen(false); }}
          onClose={() => setMapOpen(false)}
        />
      )}

      {drawer && (
        <div className="adm-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="adm-drawer">
            <div className="adm-drawer-hdr">
              <span className="adm-drawer-title">{drawer === 'add' ? 'Add Zone' : 'Edit Zone'}</span>
              <button className="adm-icon-btn" onClick={close}><X size={14} /></button>
            </div>
            <div className="adm-drawer-body">
              {error && <div className="adm-alert adm-alert-error">{error}</div>}
              <div className="adm-field">
                <span className="adm-field-lbl">Zone Name *</span>
                <input className="adm-field-input" value={form.name} onChange={f('name')} placeholder="e.g. North Riyadh" />
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Branch</span>
                <div className="adm-field-select">
                  <select value={form.branch_id} onChange={f('branch_id')}>
                    <option value="">No branch linked</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Zone Color</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {ZONE_COLORS.map(c => (
                    <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer', border: form.color === c ? '3px solid #122B1D' : '2px solid transparent', transition: '.15s' }} />
                  ))}
                </div>
              </div>
              <div className="adm-field">
                <span className="adm-field-lbl">Polygon Boundary</span>
                {coords.length > 0
                  ? <div style={{ fontSize: 13, color: '#0B5132', fontWeight: 700, marginBottom: 6 }}>✓ {coords.length} points defined</div>
                  : <div style={{ fontSize: 12.5, color: '#9EB3A6', fontWeight: 600, marginBottom: 6 }}>No polygon drawn yet</div>
                }
                <button className="adm-btn adm-btn-ghost" style={{ gap: 6 }} onClick={() => setMapOpen(true)}>
                  <Map size={13} /> {coords.length > 0 ? 'Edit Polygon on Map' : 'Draw Polygon on Map'}
                </button>
              </div>
            </div>
            <div className="adm-drawer-footer">
              <button className="adm-btn adm-btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={close}>Cancel</button>
              <button className="adm-btn adm-btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : drawer === 'add' ? 'Create Zone' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
