import React, { useState, useEffect, useContext, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as topojson from 'topojson-client';
import { AuthContext } from '../context/AuthContext';
import { MapPin, Filter, Eye, Layers, AlertTriangle, ShieldCheck, Home, Activity, Zap, Compass, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config';
import SearchableBarangaySelect from '../components/SearchableBarangaySelect';
import manilaTopo from '../data/manila-barangays.topo.json';
import { MotionCard, MotionButton, MotionBadge } from '../components/motion';
import 'leaflet/dist/leaflet.css';

// Color palette for incident dots and hazard badges
const LEVEL_COLORS = {
  default: '#94A3B8',
  Minor: '#F59E0B',
  Moderate: '#D97706',
  Severe: '#DC2626',
  'Totally Damaged': '#8B5FBF',
};

const DAMAGE_WEIGHT = { Minor: 1, Moderate: 2, Severe: 3, 'Totally Damaged': 4 };

// Strict Manila City Bounding Box
const MANILA_BOUNDS = [
  [14.530, 120.930], // South-West
  [14.640, 121.025], // North-East
];

// Official Manila City Evacuation Centers (Real Coordinates & Capacity)
const MANILA_EVACUATION_CENTERS = [
  { id: 'evac-delpan', name: 'Delpan Evacuation Center', barangayCode: '20', lat: 14.5982, lng: 120.9654, capacityTotal: 600, capacityCurrent: 490, status: 'Active (81%)', medical: 'MDRRMO Medical Team Alpha', power: 'High-Capacity GenSet Active', type: 'Primary Evacuation Hub' },
  { id: 'evac-tondo', name: 'Tondo Sports Complex Evacuation Center', barangayCode: '105', lat: 14.6145, lng: 120.9701, capacityTotal: 850, capacityCurrent: 560, status: 'Active (66%)', medical: 'Health Center Doctors on Duty', power: 'Solar Microgrid Backed', type: 'District I Evacuation Hub' },
  { id: 'evac-baseco', name: 'Baseco Community Multi-Purpose Hall', barangayCode: '649', lat: 14.5912, lng: 120.9578, capacityTotal: 700, capacityCurrent: 670, status: 'Near Full (95%)', medical: 'Critical Relief Station', power: 'Standby Emergency Generator', type: 'Coastal Evacuation Point' },
  { id: 'evac-san-andres', name: 'San Andres Sports Complex', barangayCode: '745', lat: 14.5714, lng: 120.9922, capacityTotal: 1200, capacityCurrent: 540, status: 'Active (45%)', medical: 'Red Cross First Aid Post', power: 'Main Grid + Auto-GenSet', type: 'District V Mega Shelter' },
  { id: 'evac-rizal', name: 'Rizal Memorial Coliseum Emergency Shelter', barangayCode: '720', lat: 14.5631, lng: 120.9934, capacityTotal: 1500, capacityCurrent: 410, status: 'Standby Open (27%)', medical: 'City Health Officers Station', power: 'Dedicated Industrial Power', type: 'City-Wide Mega Center' },
  { id: 'evac-brgy291', name: 'Alvarez Covered Court Evacuation Post', barangayCode: '291', lat: 14.6045, lng: 120.9812, capacityTotal: 350, capacityCurrent: 240, status: 'Active (68%)', medical: 'Barangay Health Workers', power: 'Solar Backup Station', type: 'Barangay 291 Evacuation Point' },
];

// Flood Inundation Hotspot Barangays in Manila (Pasig River Corridor & Coastal Manila Bay)
const FLOOD_SUSCEPTIBILITY_MAP = {
  '20': 'Deep Flood Hazard (>1.5m)',
  '105': 'High Inundation Risk (1.0m)',
  '649': 'Coastal Storm Surge / Flood',
  '291': 'Moderate Flood Zone (0.5m)',
  '292': 'Moderate Flood Zone (0.5m)',
  '293': 'Low/Moderate Inundation',
  '304': 'Critical Creek Inundation',
  '303': 'Low Flood Risk',
  '745': 'Moderate Inundation (0.4m)',
  '720': 'Low Flood Risk',
};

// Convert the topojson into GeoJSON
const manilaGeoJSON = topojson.feature(
  manilaTopo,
  manilaTopo.objects['manila-barangays']
);

function barangayCodeFromName(name) {
  const raw = (name || '').replace(/^Barangay\s*/i, '').trim();
  if (!raw || raw.toLowerCase() === 'n.a.' || raw.toLowerCase() === 'n.a') return '';
  return raw;
}

function getRingCentroidAndArea(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const x0 = ring[i][0];
    const y0 = ring[i][1];
    const x1 = ring[i + 1][0];
    const y1 = ring[i + 1][1];
    const a = x0 * y1 - x1 * y0;
    area += a;
    cx += (x0 + x1) * a;
    cy += (y0 + y1) * a;
  }
  area = area / 2;
  if (Math.abs(area) < 1e-12) {
    let sumX = 0, sumY = 0;
    for (const pt of ring) {
      sumX += pt[0];
      sumY += pt[1];
    }
    return { lng: sumX / ring.length, lat: sumY / ring.length, area: 0 };
  }
  return { lng: cx / (6 * area), lat: cy / (6 * area), area: Math.abs(area) };
}

function calculateCentroid(geometry) {
  if (!geometry || !geometry.coordinates) return null;
  let best = null;
  let maxArea = -1;
  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0];
    best = getRingCentroidAndArea(ring);
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      const ring = poly[0];
      const res = getRingCentroidAndArea(ring);
      if (res && res.area > maxArea) {
        maxArea = res.area;
        best = res;
      }
    }
  }
  return best ? { lat: best.lat, lng: best.lng } : null;
}

// Mapcn Glowing Evacuation Beacon Custom HTML DivIcon
const createEvacBeaconIcon = (evac) => {
  const isNearFull = evac.capacityCurrent / evac.capacityTotal > 0.85;
  const beaconColor = isNearFull ? '#EF4444' : '#10B981';
  const pulseColor = isNearFull ? 'rgba(239, 68, 68, 0.45)' : 'rgba(16, 185, 129, 0.45)';

  return L.divIcon({
    className: 'mapcn-evac-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: ${pulseColor}; animation: mapcnPing 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: ${beaconColor}; border: 2.5px solid #FFFFFF; box-shadow: 0 0 12px ${beaconColor}, 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

export default function BarangayHeatmap() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [households, setHouseholds] = useState([]);
  const [selectedBarangayFilter, setSelectedBarangayFilter] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [selectedEvac, setSelectedEvac] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Mapcn Live Layer Toggles
  const [showEvacCenters, setShowEvacCenters] = useState(true);
  const [showFloodZones, setShowFloodZones] = useState(true);
  const [showIncidentDots, setShowIncidentDots] = useState(true);

  const fetchHouseholds = async () => {
    setLoading(true);
    let fetched = [];
    try {
      let url = `${API_BASE_URL}/households`;
      if (user?.role === 'barangay_official') {
        url += `?barangayCode=${user.barangayCode}`;
      } else if (selectedBarangayFilter !== 'ALL') {
        url += `?barangayCode=${selectedBarangayFilter}`;
      }
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && Array.isArray(data.households)) fetched = data.households;
    } catch (err) {
      console.error(err);
    }

    try {
      const savedPending = localStorage.getItem('mitigateplus_pending_households');
      if (savedPending) {
        const parsed = JSON.parse(savedPending);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formattedLocal = parsed.map(h => ({
            _id: h._id || `local-${h.id}`,
            barangayCode: String(h.barangayCode || '291'),
            address: h.address || 'Purok 1',
            damageLevel: h.damageLevel || 'Severe',
            headName: h.headOfHouseholdUserId?.name || h.headName || 'Resident Household',
            priorityScore: h.priorityScore || 85,
            priorityLevel: h.priorityLevel || 'High',
            latitude: h.latitude || null,
            longitude: h.longitude || null,
          }));
          const existingIds = new Set(fetched.map(f => f._id));
          const newEntries = formattedLocal.filter(l => !existingIds.has(l._id));
          fetched = [...newEntries, ...fetched];
        }
      }
    } catch (e) {
      console.error(e);
    }

    setHouseholds(fetched);
    setLoading(false);
  };

  useEffect(() => {
    fetchHouseholds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedBarangayFilter, user]);

  // Aggregate statistics per barangay
  const barangayStats = useMemo(() => {
    const stats = {};
    for (const h of households) {
      const code = h.barangayCode;
      if (!stats[code]) {
        stats[code] = { count: 0, maxLevel: null, maxWeight: 0, priorityTotal: 0 };
      }
      const s = stats[code];
      s.count += 1;
      s.priorityTotal += h.priorityScore || 0;
      const w = DAMAGE_WEIGHT[h.damageLevel] || 0;
      if (w > s.maxWeight) {
        s.maxWeight = w;
        s.maxLevel = h.damageLevel || null;
      }
    }
    for (const code of Object.keys(stats)) {
      stats[code].avgPriority = Math.round(stats[code].priorityTotal / stats[code].count);
    }
    return stats;
  }, [households]);

  // Centroids for Manila Barangays
  const barangayCentroids = useMemo(() => {
    const map = {};
    if (manilaGeoJSON && Array.isArray(manilaGeoJSON.features)) {
      for (const f of manilaGeoJSON.features) {
        if (!f || !f.geometry || !f.properties || !f.properties.name) continue;
        const code = barangayCodeFromName(f.properties.name);
        if (!code) continue;
        const center = calculateCentroid(f.geometry);
        if (center) {
          map[code] = {
            lat: center.lat,
            lng: center.lng,
            name: f.properties.name,
            code,
          };
        }
      }
    }
    return map;
  }, []);

  const incidentDots = useMemo(() => {
    const rawList = households;

    const dots = [];
    rawList.forEach((hh, index) => {
      const code = hh.barangayCode || '291';
      const center = barangayCentroids[code];
      if (center) {
        const latOffset = ((index % 3) - 1) * 0.00035;
        const lngOffset = ((Math.floor(index / 3) % 3) - 1) * 0.00035;
        dots.push({
          id: hh._id || `hh-${index}`,
          lat: hh.latitude ? hh.latitude : (center.lat + latOffset),
          lng: hh.longitude ? hh.longitude : (center.lng + lngOffset),
          address: hh.address || `Household #${index + 1}`,
          barangayCode: code,
          damageLevel: hh.damageLevel || 'Severe',
          headName: hh.headOfHouseholdUserId?.name || hh.headName || 'Resident Applicant',
          priorityScore: hh.priorityScore || 75,
          validIdUrl: hh.validIdUrl || hh.photoUrl || null,
        });
      }
    });

    return dots;
  }, [households, barangayCentroids]);

  const filteredDots = useMemo(() => {
    return incidentDots.filter(d => {
      const matchBrgy = selectedBarangayFilter === 'ALL' || d.barangayCode === selectedBarangayFilter;
      const matchSeverity = filterSeverity === 'ALL' || d.damageLevel === filterSeverity;
      return matchBrgy && matchSeverity;
    });
  }, [incidentDots, selectedBarangayFilter, filterSeverity]);

  // Mapcn-style Polygon Styling with Flood Hazard Color Accents
  const styleFeature = (feature) => {
    if (!feature || !feature.properties) {
      return { fillColor: 'transparent', weight: 0, opacity: 0, fillOpacity: 0 };
    }
    if (!feature.properties.name || feature.properties.name.toLowerCase() === 'n.a.') {
      return { fillColor: 'transparent', weight: 0, opacity: 0, fillOpacity: 0 };
    }
    const code = barangayCodeFromName(feature.properties.name);
    const isSelectedBrgy = selected?.code === code;
    const isFilteredBrgy = selectedBarangayFilter === 'ALL' || code === selectedBarangayFilter;
    const floodStatus = FLOOD_SUSCEPTIBILITY_MAP[code];

    if (isSelectedBrgy) {
      return {
        fillColor: '#002BB8',
        weight: 3.5,
        color: '#F59E0B',
        fillOpacity: 0.45,
      };
    }

    if (showFloodZones && floodStatus) {
      if (floodStatus.includes('Deep Flood') || floodStatus.includes('Coastal')) {
        return {
          fillColor: '#EF4444',
          weight: isFilteredBrgy ? 1.8 : 1,
          color: '#DC2626',
          fillOpacity: 0.35,
        };
      }
      if (floodStatus.includes('High Inundation') || floodStatus.includes('Critical')) {
        return {
          fillColor: '#F59E0B',
          weight: isFilteredBrgy ? 1.6 : 0.8,
          color: '#D97706',
          fillOpacity: 0.28,
        };
      }
    }

    return {
      fillColor: isFilteredBrgy ? 'rgba(0, 43, 184, 0.15)' : 'rgba(100, 116, 139, 0.08)',
      weight: isFilteredBrgy ? 1.5 : 0.8,
      color: isFilteredBrgy ? 'rgba(0, 43, 184, 0.6)' : 'rgba(100, 116, 139, 0.35)',
      fillOpacity: isSelectedBrgy ? 0.45 : isFilteredBrgy ? 0.22 : 0.12,
    };
  };

  function MapTouchController() {
    const map = useMap();
    useEffect(() => {
      if (!map) return;
      const closeTooltips = () => {
        map.eachLayer((layer) => {
          if (layer.closeTooltip && typeof layer.closeTooltip === 'function') {
            layer.closeTooltip();
          }
        });
      };
      map.on('dragstart', closeTooltips);
      map.on('movestart', closeTooltips);
      map.on('zoomstart', closeTooltips);
      return () => {
        map.off('dragstart', closeTooltips);
        map.off('movestart', closeTooltips);
        map.off('zoomstart', closeTooltips);
      };
    }, [map]);
    return null;
  }

  const onEachFeature = (feature, layer) => {
    if (!feature || !feature.properties) return;
    const code = barangayCodeFromName(feature.properties.name);
    if (!code) return;
    const stat = barangayStats[code];
    const floodInfo = FLOOD_SUSCEPTIBILITY_MAP[code];

    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouchDrag = false;

    layer.on({
      mousedown: (e) => {
        touchStartTime = Date.now();
        isTouchDrag = false;
        if (e.originalEvent) {
          touchStartX = e.originalEvent.clientX || 0;
          touchStartY = e.originalEvent.clientY || 0;
        }
      },
      touchstart: (e) => {
        touchStartTime = Date.now();
        isTouchDrag = false;
        if (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0]) {
          touchStartX = e.originalEvent.touches[0].clientX;
          touchStartY = e.originalEvent.touches[0].clientY;
        }
      },
      touchmove: (e) => {
        if (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0]) {
          const dx = Math.abs(e.originalEvent.touches[0].clientX - touchStartX);
          const dy = Math.abs(e.originalEvent.touches[0].clientY - touchStartY);
          if (dx > 5 || dy > 5) {
            isTouchDrag = true;
          }
        }
      },
      click: (e) => {
        const duration = Date.now() - touchStartTime;
        // Strictly ignore if user held down for > 250ms (long press) or moved/dragged the map
        if (duration > 250 || isTouchDrag) {
          return;
        }

        if (e.originalEvent) {
          e.originalEvent.stopPropagation();
          if (e.originalEvent.target) e.originalEvent.target.blur();
        }
        setSelected({
          code,
          name: feature.properties.name,
          stat: barangayStats[code] || null,
          floodInfo: floodInfo || null,
        });
        setSelectedEvac(null);
      },
    });
  };

  const totalReportsCount = filteredDots.length;
  const criticalCount = filteredDots.filter(d => d.damageLevel === 'Totally Damaged').length;
  const severeCount = filteredDots.filter(d => d.damageLevel === 'Severe').length;
  const moderateCount = filteredDots.filter(d => d.damageLevel === 'Moderate').length;
  const minorCount = filteredDots.filter(d => d.damageLevel === 'Minor').length;
  const highRiskCount = criticalCount + severeCount;

  const matchingEvacHubs = selectedBarangayFilter === 'ALL'
    ? MANILA_EVACUATION_CENTERS
    : MANILA_EVACUATION_CENTERS.filter(e => e.barangayCode === selectedBarangayFilter);
  const evacHubsCount = matchingEvacHubs.length || (selectedBarangayFilter === 'ALL' ? MANILA_EVACUATION_CENTERS.length : 0);

  return (
    <div className="page-container page-animate">
      {/* Mapcn Embedded CSS Keyframes for Pulsing Radar Animations & Click Passthrough */}
      <style>{`
        @keyframes mapcnPing {
          0% { transform: scale(0.9); opacity: 0.8; }
          70% { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(2.0); opacity: 0; }
        }
        .mapcn-floating-bar {
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        /* Crucial: Number markers must pass clicks through to the polygon underneath */
        .brgy-number-marker,
        .brgy-micro-num {
          pointer-events: none !important;
          user-select: none !important;
          cursor: pointer !important;
        }
        .brgy-micro-num {
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          font-size: 10px;
          font-weight: 900;
          color: #1E3A8A;
          text-shadow: 0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 0 3px #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brgy-micro-num--severe {
          color: #DC2626 !important;
          font-weight: 900 !important;
        }
        .brgy-micro-num--selected {
          color: #D97706 !important;
          font-size: 12px !important;
          font-weight: 900 !important;
          transform: scale(1.25);
        }
        .leaflet-interactive {
          cursor: pointer !important;
        }
        .leaflet-tooltip {
          pointer-events: none !important;
          user-select: none !important;
        }
        .leaflet-container {
          cursor: grab;
        }
        .leaflet-container:active {
          cursor: grabbing;
        }
      `}</style>

      {/* ── Page Header ── */}
      <div className="map-page-header workflow-header" style={{ position: 'relative', zIndex: 1000, overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--manila-blue)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <MapPin size={24} color="var(--manila-blue)" /> Manila City GIS Command Map & Risk Heatmap
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '4px' }}>
            Interactive vector map engine with real-time evacuation beacons, flood inundation hazard zones, and GPS damage telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1050, overflow: 'visible' }}>
          {(user?.role === 'lgu_admin' || user?.role === 'lgu_superadmin') && (
            <SearchableBarangaySelect
              value={selectedBarangayFilter === 'ALL' ? 'all' : selectedBarangayFilter}
              onChange={(val) => setSelectedBarangayFilter(val === 'all' ? 'ALL' : val)}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--card)', padding: '0 12px', height: 'var(--touch-target)', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)' }}>
            <Filter size={16} color="var(--ink-soft)" />
            <select
              value={filterSeverity}
              aria-label="Filter by Risk and Need Level"
              onChange={(e) => setFilterSeverity(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '13px', fontWeight: 700, background: 'transparent', color: 'var(--ink)' }}
            >
              <option value="ALL">All Risk & Need Levels</option>
              <option value="Totally Damaged">Critical / Totally Damaged</option>
              <option value="Severe">High Risk / Severe Need</option>
              <option value="Moderate">Moderate Risk & Need</option>
              <option value="Minor">Minor Risk & Need</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── GIS Map Layer Controls (Theme-Adaptive) ── */}
      <div
        className="clay-card map-layer-toolbar"
        style={{
          position: 'relative',
          zIndex: 10,
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} color="var(--manila-blue)" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>GIS Map Layers & Overlays</span>
        </div>

        {/* Map Layer Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowEvacCenters(!showEvacCenters)}
            style={{
              background: showEvacCenters ? 'var(--bay-teal-light)' : 'var(--sampaguita)',
              border: `1.5px solid ${showEvacCenters ? '#10B981' : 'var(--border)'}`,
              color: showEvacCenters ? '#047857' : 'var(--ink-soft)',
              fontSize: '12px',
              fontWeight: 800,
              padding: '6px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: showEvacCenters ? '#10B981' : 'var(--ink-soft)' }} />
            Evacuation Hubs ({showEvacCenters ? 'ON' : 'OFF'})
          </button>
          <button
            onClick={() => setShowFloodZones(!showFloodZones)}
            style={{
              background: showFloodZones ? 'var(--danger-light)' : 'var(--sampaguita)',
              border: `1.5px solid ${showFloodZones ? '#DC2626' : 'var(--border)'}`,
              color: showFloodZones ? '#B91C1C' : 'var(--ink-soft)',
              fontSize: '12px',
              fontWeight: 800,
              padding: '6px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: showFloodZones ? '#DC2626' : 'var(--ink-soft)' }} />
            Flood Inundation ({showFloodZones ? 'ON' : 'OFF'})
          </button>
          <button
            onClick={() => setShowIncidentDots(!showIncidentDots)}
            style={{
              background: showIncidentDots ? 'var(--jeepney-amber-light)' : 'var(--sampaguita)',
              border: `1.5px solid ${showIncidentDots ? '#D97706' : 'var(--border)'}`,
              color: showIncidentDots ? '#B45309' : 'var(--ink-soft)',
              fontSize: '12px',
              fontWeight: 800,
              padding: '6px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: showIncidentDots ? '#D97706' : 'var(--ink-soft)' }} />
            Damage Pins ({showIncidentDots ? 'ON' : 'OFF'})
          </button>
        </div>
      </div>

      <div className="map-command-grid" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        <div className="clay-card map-canvas-card" style={{ padding: '16px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--manila-blue)' }}>897 Manila City Barangays - Designated Numbers & Damage Indicators</span>
            <div style={{ display: 'flex', gap: '14px', fontSize: '12px', fontWeight: 700, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#047857', display: 'inline-block' }} />
                Evacuation Center (Pulsing)
              </span>
              <span style={{ color: '#991B1B', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#991B1B', display: 'inline-block' }} />
                Severe / Total Damage
              </span>
              <span style={{ color: '#B45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#B45309', display: 'inline-block' }} />
                Moderate Risk
              </span>
              <span style={{ color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#92400E', display: 'inline-block' }} />
                Minor Risk
              </span>
            </div>
          </div>

          {/* High-Resolution GIS Map Canvas with CartoDB Voyager Tiles */}
          <div className="manila-map-shell" style={{ position: 'relative', zIndex: 1, height: '560px', borderRadius: 'var(--radius-inner)', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.08)' }}>
            <MapContainer
              center={[14.5995, 120.9842]}
              zoom={14}
              minZoom={13}
              maxZoom={18}
              maxBounds={MANILA_BOUNDS}
              maxBoundsViscosity={1.0}
              preferCanvas={false}
              className="manila-map"
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              {/* Clean Vector OpenStreetMap Tiles (No Watermark) */}
              <MapTouchController />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {/* Barangay Boundaries Layer with Flood Inundation Colors */}
              <GeoJSON
                key={(selected?.code || 'none') + '-' + filterSeverity + '-' + selectedBarangayFilter + '-' + showFloodZones}
                data={manilaGeoJSON}
                style={styleFeature}
                onEachFeature={onEachFeature}
              />

              {/* Micro Barangay Number Labels */}
              {Object.values(barangayCentroids).map((b) => {
                const stat = barangayStats[b.code];
                const hasSevere = stat?.maxLevel === 'Severe' || stat?.maxLevel === 'Totally Damaged';
                const isSelected = selected?.code === b.code;

                const customIcon = L.divIcon({
                  className: 'brgy-number-marker',
                  html: `<div class="brgy-micro-num ${isSelected ? 'brgy-micro-num--selected' : hasSevere ? 'brgy-micro-num--severe' : ''}">${b.code}</div>`,
                  iconSize: [28, 14],
                  iconAnchor: [14, 7],
                });

                return (
                  <Marker key={b.code} position={[b.lat, b.lng]} icon={customIcon} interactive={false} />
                );
              })}

              {/* Mapcn Glowing Evacuation Center Beacons */}
              {showEvacCenters && MANILA_EVACUATION_CENTERS.map((evac) => (
                <Marker
                  key={evac.id}
                  position={[evac.lat, evac.lng]}
                  icon={createEvacBeaconIcon(evac)}
                  eventHandlers={{
                    click: (e) => {
                      if (e.originalEvent) e.originalEvent.stopPropagation();
                      setSelectedEvac(evac);
                      setSelected(null);
                    },
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '2px 4px' }}>
                      <strong style={{ color: '#002BB8', fontSize: '13px' }}>{evac.name}</strong>
                      <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: '800', marginTop: 2 }}>{evac.status} ({evac.capacityCurrent}/{evac.capacityTotal})</div>
                      <div style={{ fontSize: '11px', color: '#475569' }}>Brgy {evac.barangayCode} · {evac.medical}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: 1 }}>Power: {evac.power}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Specific Damage Incident Dots */}
              {showIncidentDots && filteredDots.map((dot) => {
                const dotColor =
                  dot.damageLevel === 'Totally Damaged' ? '#8B5FBF' :
                  dot.damageLevel === 'Severe' ? '#DC2626' :
                  dot.damageLevel === 'Moderate' ? '#D97706' : '#F59E0B';

                const isSelectedDot = selected?.dotDetail?.id === dot.id;

                return (
                  <CircleMarker
                    key={dot.id}
                    center={[dot.lat, dot.lng]}
                    radius={isSelectedDot ? 8 : 5}
                    pane="markerPane"
                    pathOptions={{
                      fillColor: dotColor,
                      color: isSelectedDot ? '#173F56' : '#FFFFFF',
                      weight: isSelectedDot ? 3 : 1.5,
                      fillOpacity: 0.95,
                    }}
                    eventHandlers={{
                      click: (e) => {
                        if (e.originalEvent) {
                          e.originalEvent.stopPropagation();
                          if (e.originalEvent.target && typeof e.originalEvent.target.blur === 'function') {
                            e.originalEvent.target.blur();
                          }
                        }
                        setSelected({
                          code: dot.barangayCode,
                          name: `Barangay ${dot.barangayCode}`,
                          stat: { count: 1, maxLevel: dot.damageLevel, avgPriority: dot.priorityScore },
                          dotDetail: dot,
                        });
                        setSelectedEvac(null);
                      },
                    }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'var(--font-sans)', padding: '2px 4px' }}>
                        <strong style={{ color: dotColor, fontSize: '12px' }}>{dot.damageLevel.toUpperCase()} BENEFICIARY SPOT</strong>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', marginTop: 2 }}>{dot.headName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{dot.address} · Brgy {dot.barangayCode}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--manila-blue)', marginTop: 2 }}>Priority: {dot.priorityScore} pts</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* ── Side Insight Panel with MotionCard ── */}
        <aside className="map-insight-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <MotionCard className="clay-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--manila-blue)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {selectedBarangayFilter === 'ALL' ? 'City Damage & Evac Overview' : `Brgy ${selectedBarangayFilter} Damage & Evac Overview`}
              </h3>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', background: 'var(--sampaguita)', padding: '2px 8px', borderRadius: '999px' }}>
                {filterSeverity === 'ALL' ? 'All Risks' : filterSeverity}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ background: 'var(--sampaguita)', padding: '10px 6px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--ink-soft)', fontWeight: 800, display: 'block' }}>ALL REPORTS</span>
                <strong style={{ fontSize: '19px', color: 'var(--manila-blue)', fontWeight: 900 }}>{totalReportsCount}</strong>
              </div>
              <div style={{ background: 'rgba(220,38,38,0.08)', padding: '10px 6px', borderRadius: 'var(--radius-inner)', border: '1px solid rgba(220,38,38,0.2)' }}>
                <span style={{ fontSize: '10.5px', color: '#991B1B', fontWeight: 800, display: 'block' }}>HIGH RISK</span>
                <strong style={{ fontSize: '19px', color: '#991B1B', fontWeight: 900 }}>{highRiskCount}</strong>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.08)', padding: '10px 6px', borderRadius: 'var(--radius-inner)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span style={{ fontSize: '10.5px', color: '#047857', fontWeight: 800, display: 'block' }}>EVAC HUBS</span>
                <strong style={{ fontSize: '19px', color: '#047857', fontWeight: 900 }}>{evacHubsCount}</strong>
              </div>
            </div>

            {/* Micro Breakdown Bar */}
            <div style={{ background: 'var(--sampaguita)', borderRadius: '8px', padding: '8px 10px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', color: 'var(--ink-soft)', flexWrap: 'wrap', gap: '4px', border: '1px solid var(--border)' }}>
              <span><strong style={{ color: '#8B5FBF' }}>Total:</strong> {criticalCount}</span>
              <span><strong style={{ color: '#DC2626' }}>Severe:</strong> {severeCount}</span>
              <span><strong style={{ color: '#D97706' }}>Moderate:</strong> {moderateCount}</span>
              <span><strong style={{ color: '#F59E0B' }}>Minor:</strong> {minorCount}</span>
            </div>
          </MotionCard>

          {/* ── Evacuation Center Selected Inspector ── */}
          {selectedEvac && (
            <div className="clay-card" style={{ padding: '18px', borderLeft: '4px solid #10B981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ background: '#ECFDF5', color: '#047857', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>
                  EVACUATION HUB
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--manila-blue)' }}>Brgy {selectedEvac.barangayCode}</span>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>{selectedEvac.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: '0 0 12px' }}>{selectedEvac.type}</p>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', marginBottom: '14px', display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Capacity Load:</span>
                  <strong style={{ color: '#002BB8' }}>{selectedEvac.capacityCurrent} / {selectedEvac.capacityTotal} evacuees</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Medical Post:</span>
                  <strong style={{ color: '#16A34A' }}>{selectedEvac.medical}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Power GenSet:</span>
                  <strong style={{ color: '#D97706' }}>{selectedEvac.power}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => navigate('/distribution-events', { state: { prefillBarangay: selectedEvac.barangayCode } })}
                  className="clay-button-approve"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '9px' }}
                >
                  Dispatch Emergency Relief Supply
                </button>
                <button onClick={() => setSelectedEvac(null)} className="clay-button-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '9px' }}>
                  Close Inspector
                </button>
              </div>
            </div>
          )}

          {/* ── Barangay / Household Selected Inspector ── */}
          {selected ? (() => {
            const brgyDots = incidentDots.filter(d => d.barangayCode === selected.code);
            const criticalCount = brgyDots.filter(d => d.damageLevel === 'Totally Damaged').length;
            const severeCount = brgyDots.filter(d => d.damageLevel === 'Severe').length;
            const moderateCount = brgyDots.filter(d => d.damageLevel === 'Moderate').length;
            const minorCount = brgyDots.filter(d => d.damageLevel === 'Minor').length;
            const totalReports = brgyDots.length;

            return (
              <div className="clay-card map-selected-card" style={{ padding: '18px', borderLeft: '4px solid var(--manila-blue)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                    Barangay Assessment
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--manila-blue)' }}>Brgy {selected.code}</span>
                </div>
                <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Barangay {selected.code}</h3>
                
                {selected.floodInfo && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, marginBottom: 10 }}>
                    Hazard Assessment: {selected.floodInfo}
                  </div>
                )}

                <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: '0 0 14px' }}>
                  {totalReports > 0 ? `${totalReports} reported household incident(s)` : 'No damage reports filed for this barangay yet.'}
                </p>

                {/* ── 4-Box Severity Breakdown ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ background: '#F3E8FF', border: '1px solid #D8B4FE', padding: '8px 10px', borderRadius: 'var(--radius-inner)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#7E22CE', display: 'block' }}>● Critical</span>
                    <strong style={{ fontSize: '16px', color: '#6B21A8' }}>{criticalCount}</strong>
                  </div>
                  <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '8px 10px', borderRadius: 'var(--radius-inner)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', display: 'block' }}>● High Risk</span>
                    <strong style={{ fontSize: '16px', color: '#991B1B' }}>{severeCount}</strong>
                  </div>
                  <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '8px 10px', borderRadius: 'var(--radius-inner)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', display: 'block' }}>● Moderate</span>
                    <strong style={{ fontSize: '16px', color: '#92400E' }}>{moderateCount}</strong>
                  </div>
                  <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '8px 10px', borderRadius: 'var(--radius-inner)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', display: 'block' }}>● Minor</span>
                    <strong style={{ fontSize: '16px', color: '#78350F' }}>{minorCount}</strong>
                  </div>
                </div>

                {/* ── Beneficiary Details / Priority List ── */}
                {selected.dotDetail ? (
                  <div style={{ background: 'var(--sampaguita)', padding: '12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>Selected Beneficiary Location</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{selected.dotDetail.address}</div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>Applicant: <strong style={{ color: 'var(--ink)' }}>{selected.dotDetail.headName}</strong></div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: 2 }}>Priority Score: <strong style={{ color: 'var(--manila-blue)' }}>{selected.dotDetail.priorityScore} pts</strong></div>
                    {selected.dotDetail.validIdUrl && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>Attached Evidence / ID Photo</div>
                        <div 
                          onClick={() => setPreviewImage(selected.dotDetail.validIdUrl)}
                          style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #CBD5E1', cursor: 'pointer', height: '110px', background: '#0F172A' }}
                        >
                          <img 
                            src={selected.dotDetail.validIdUrl} 
                            alt="Evidence" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                          <div style={{ position: 'absolute', bottom: 4, right: 6, background: 'rgba(0,0,0,0.65)', color: '#FFF', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            🔍 Click to Enlarge
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : brgyDots.length > 0 ? (() => {
                  const urgentDots = brgyDots.filter(d => d.damageLevel === 'Severe' || d.damageLevel === 'Totally Damaged');
                  const listToDisplay = urgentDots.length > 0 ? urgentDots : brgyDots;

                  if (listToDisplay.length > 5) {
                    return (
                      <div style={{ background: 'var(--sampaguita)', padding: '14px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: 8 }}>
                          Mayroong <strong>{listToDisplay.length} household reports</strong> sa Barangay {selected.code}.
                        </div>
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="clay-button-primary"
                          style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '10px 14px', gap: 6 }}
                        >
                          View Complete Beneficiary Directory ({listToDisplay.length} Reports)
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div style={{ background: 'var(--sampaguita)', padding: '12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 8 }}>
                        Priority Beneficiaries in This Barangay
                      </div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {listToDisplay.map(dot => (
                          <div
                            key={dot.id}
                            onClick={() => setSelected({ code: dot.barangayCode, name: `Barangay ${dot.barangayCode}`, stat: { count: 1, maxLevel: dot.damageLevel }, dotDetail: dot })}
                            style={{ padding: '8px', borderBottom: '1px solid var(--border)', fontSize: '12px', cursor: 'pointer', borderRadius: 'var(--radius-inner)', background: selected?.dotDetail?.id === dot.id ? 'var(--card)' : 'transparent', transition: 'background 0.2s' }}
                          >
                            <div style={{ fontWeight: 700, color: 'var(--ink)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{dot.headName}</span>
                              <span style={{ fontSize: '11px', background: 'rgba(9,1,84,0.08)', padding: '2px 6px', borderRadius: 999, color: 'var(--manila-blue)' }}>{dot.priorityScore} pts</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: 2 }}>{dot.address}</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: dot.damageLevel === 'Severe' || dot.damageLevel === 'Totally Damaged' ? '#DC2626' : '#D97706', marginTop: 2 }}>
                              ● {dot.damageLevel}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })() : null}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                  <button onClick={() => navigate('/distribution-events', { state: { prefillBarangay: selected.code } })} className="clay-button-approve" style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '9px' }}>
                    Schedule Relief Event for Brgy {selected.code}
                  </button>
                  <button onClick={() => setSelected(null)} className="clay-button-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '9px' }}>
                    Close Detail
                  </button>
                </div>
              </div>
            );
          })() : !selectedEvac && (
            <div className="clay-card map-empty-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <Eye size={36} color="var(--manila-blue)" style={{ margin: '0 auto 10px', display: 'block' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Click any Map Feature</h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>
                Click a pulsing evacuation hub, red/orange hazard zone, or beneficiary spot to inspect real-time operational status.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* ── Popup Modal for Barangay Beneficiary Directory (> 5 Items) ── */}
      {isModalOpen && selected && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999999,
          padding: 16,
          boxSizing: 'border-box',
        }}>
          <div className="clay-card page-animate" style={{ width: '100%', maxWidth: '600px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '24px', background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--manila-blue)', margin: 0 }}>Barangay {selected.code} • Beneficiary Directory</h2>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>Complete list of reported households and evacuees in Barangay {selected.code}.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="clay-button-ghost" style={{ padding: '6px 12px', fontSize: 13 }}>
                Back to Map
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 10, paddingRight: 4 }}>
              {incidentDots.filter(d => d.barangayCode === selected.code).map(dot => (
                <div
                  key={dot.id}
                  onClick={() => {
                    setSelected({ code: dot.barangayCode, name: `Barangay ${dot.barangayCode}`, stat: { count: 1, maxLevel: dot.damageLevel }, dotDetail: dot });
                    setIsModalOpen(false);
                  }}
                  className="clay-card"
                  style={{ padding: '12px 16px', cursor: 'pointer', borderLeft: `4px solid ${dot.damageLevel === 'Severe' || dot.damageLevel === 'Totally Damaged' ? '#DC2626' : '#D97706'}` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{dot.headName}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--manila-blue)', background: 'var(--sampaguita)', padding: '3px 10px', borderRadius: 999 }}>
                      Priority: {dot.priorityScore} pts
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 4 }}>{dot.address}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: dot.damageLevel === 'Severe' || dot.damageLevel === 'Totally Damaged' ? '#DC2626' : '#D97706' }}>
                    Status: {dot.damageLevel}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsModalOpen(false)} className="clay-button-primary" style={{ fontSize: 13 }}>
                Back to Barangay View
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Photo Evidence Full-Screen Lightbox Modal ── */}
      {previewImage && ReactDOM.createPortal(
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999999,
            padding: 24,
            boxSizing: 'border-box',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="page-animate"
            style={{
              position: 'relative',
              maxWidth: '850px',
              maxHeight: '90vh',
              background: '#0F172A',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#1E293B', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: '#F8FAFC', fontWeight: 800, fontSize: 14 }}>Attached Evidence / ID Photo Preview</span>
              <button 
                onClick={() => setPreviewImage(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
              >
                ✕ Close
              </button>
            </div>
            <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
              <img 
                src={previewImage} 
                alt="Enlarged Evidence" 
                style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: '8px' }} 
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
