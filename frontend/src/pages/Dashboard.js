import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';

export default function Dashboard({ tenant }) {
  const [orders, setOrders] = useState([]);
  const [zones, setZones] = useState([]);
  const [mode, setMode] = useState('all'); // all | delivered | failed | unassigned
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const load = useCallback(() => Promise.all([
    api.getOrders(tenant.id, {}).then(setOrders),
    api.getZones(tenant.id).then(setZones),
  ]), [tenant.id]);
  useEffect(() => { load(); }, [load]);

  // Load Leaflet + leaflet.heat
  useEffect(() => {
    if (!document.getElementById('leaflet-css-dash')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-dash';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!window.L) {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = loadHeat;
      document.head.appendChild(s);
    } else {
      loadHeat();
    }
    function loadHeat() {
      if (window.L && !window.L.heatLayer) {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
        s.onload = () => initMap();
        document.head.appendChild(s);
      } else {
        initMap();
      }
    }
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) updateHeat();
  }, [orders, zones, mode]);

  function initMap() {
    if (!window.L || !mapRef.current || mapInstanceRef.current) return;
    const map = window.L.map(mapRef.current, { center: [24.7136, 46.6753], zoom: 11 });
    mapInstanceRef.current = map;
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    updateHeat();
  }

  function updateHeat() {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (heatLayerRef.current) { map.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }

    // Draw zone polygons
    zones.forEach(z => {
      if (!z.coordinates) return;
      try {
        const coords = JSON.parse(z.coordinates);
        if (coords.length > 2) {
          const fill = z.color || '#0B5132';
          window.L.polygon(coords, { color: fill, fillOpacity: 0.12, weight: 1.5 })
            .bindTooltip(z.name, { permanent: false, direction: 'center' })
            .addTo(map);
        }
      } catch {}
    });

    // Build heat points from zone centroids weighted by order count
    const zoneCounts = {};
    const filteredOrders = mode === 'all' ? orders : orders.filter(o => {
      if (mode === 'delivered') return o.status === 'Delivered';
      if (mode === 'failed') return o.status === 'Failed';
      if (mode === 'unassigned') return o.status === 'Unassigned';
      return true;
    });

    filteredOrders.forEach(o => {
      if (o.zone_id) zoneCounts[o.zone_id] = (zoneCounts[o.zone_id] || 0) + 1;
    });

    const heatPoints = [];
    zones.forEach(z => {
      if (!z.coordinates || !zoneCounts[z.id]) return;
      try {
        const coords = JSON.parse(z.coordinates);
        if (coords.length > 0) {
          const lat = coords.reduce((s,p)=>s+p[0],0)/coords.length;
          const lng = coords.reduce((s,p)=>s+p[1],0)/coords.length;
          heatPoints.push([lat, lng, zoneCounts[z.id]]);
        }
      } catch {}
    });

    if (heatPoints.length > 0 && L.heatLayer) {
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 40,
        blur: 25,
        maxZoom: 14,
        gradient: mode === 'failed' ? { 0.4:'blue', 0.65:'lime', 1:'red' } :
                  mode === 'delivered' ? { 0.4:'#aaffaa', 0.65:'#00cc44', 1:'#005500' } :
                  mode === 'unassigned' ? { 0.4:'#ffffaa', 0.65:'#ffaa00', 1:'#cc5500' } :
                  { 0.4:'blue', 0.65:'lime', 1:'red' },
      }).addTo(map);
    }
  }

  // Stats
  const total = orders.length;
  const delivered = orders.filter(o=>o.status==='Delivered').length;
  const failed = orders.filter(o=>o.status==='Failed').length;
  const unassigned = orders.filter(o=>o.status==='Unassigned').length;
  const inProgress = orders.filter(o=>['Assigned','Picked Up'].includes(o.status)).length;

  // Zone breakdown
  const zoneStats = zones.map(z => {
    const zOrders = orders.filter(o => o.zone_id === z.id);
    return {
      ...z,
      total: zOrders.length,
      delivered: zOrders.filter(o=>o.status==='Delivered').length,
      failed: zOrders.filter(o=>o.status==='Failed').length,
      unassigned: zOrders.filter(o=>o.status==='Unassigned').length,
    };
  }).sort((a,b) => b.total - a.total);

  const MODES = [
    { id:'all', label:'All Orders', color:'#156A8C' },
    { id:'delivered', label:'Delivered', color:'#0B5132' },
    { id:'failed', label:'Failed', color:'#C8372D' },
    { id:'unassigned', label:'Unassigned', color:'#8A6210' },
  ];

  return (
    <div className="adm-content" style={{ overflow:'auto' }}>
      {/* KPI row */}
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        {[
          { label:'Total Orders', value:total, color:'#122B1D' },
          { label:'Delivered', value:delivered, color:'#0B5132' },
          { label:'In Progress', value:inProgress, color:'#156A8C' },
          { label:'Unassigned', value:unassigned, color:'#8A6210' },
          { label:'Failed', value:failed, color:'#C8372D' },
        ].map(k=>(
          <div key={k.label} className="adm-kpi" style={{ flex:1 }}>
            <div className="adm-kpi-lbl">{k.label}</div>
            <div className="adm-kpi-val" style={{ color:k.color, fontSize:26 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:14 }}>
        {/* Map */}
        <div className="adm-card" style={{ flex:1, padding:0, overflow:'hidden', minHeight:480 }}>
          <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid #E2E9E4', flexWrap:'wrap' }}>
            <span style={{ fontFamily:"'Sora',sans-serif", fontSize:13.5, fontWeight:700 }}>Zone Density Heatmap</span>
            <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
              {MODES.map(m=>(
                <button key={m.id} onClick={() => setMode(m.id)}
                  style={{ padding:'5px 12px', borderRadius:20, border:`1.5px solid ${m.color}`, fontSize:12, fontWeight:700, cursor:'pointer', background:mode===m.id?m.color:'transparent', color:mode===m.id?'#fff':m.color }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div ref={mapRef} style={{ height:430 }} />
        </div>

        {/* Zone breakdown */}
        <div className="adm-card" style={{ width:280, flexShrink:0, overflow:'auto' }}>
          <div className="adm-card-hdr">
            <span className="adm-card-title">Zones Breakdown</span>
            <span className="adm-card-sub">{zones.length} zones</span>
          </div>
          {zoneStats.map(z => {
            const rate = z.total > 0 ? Math.round((z.delivered/z.total)*100) : 0;
            return (
              <div key={z.id} style={{ padding:'10px 16px', borderBottom:'1px solid #F2F6F3' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:z.color||'#0B5132', flexShrink:0 }}/>
                  <span style={{ fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:700, flex:1 }}>{z.name}</span>
                  <span style={{ fontSize:12.5, fontWeight:800, color:'#0B5132' }}>{z.total}</span>
                </div>
                <div style={{ display:'flex', gap:12, fontSize:11.5, fontWeight:700 }}>
                  <span style={{ color:'#0B5132' }}>✓ {z.delivered}</span>
                  <span style={{ color:'#C8372D' }}>✗ {z.failed}</span>
                  <span style={{ color:'#8A6210' }}>⏳ {z.unassigned}</span>
                  <span style={{ marginLeft:'auto', color:'#6B7F74' }}>{rate}%</span>
                </div>
                <div style={{ marginTop:5, height:4, background:'#E2E9E4', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:'#0B5132', borderRadius:3, width:`${rate}%`, transition:'width .3s' }}/>
                </div>
              </div>
            );
          })}
          {zoneStats.length === 0 && <div style={{ padding:'24px 16px', textAlign:'center', color:'#9EB3A6', fontSize:13, fontWeight:600 }}>No zones defined</div>}
        </div>
      </div>
    </div>
  );
}
