import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, AlertTriangle, Hospital, Navigation2, Activity, Info, Waves, Clock, Zap, Droplets, Wind, TrendingUp, Users, ShieldAlert } from 'lucide-react';
import Map, { Source, Layer, NavigationControl, FullscreenControl, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { AreaChart, Area, XAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { checkApiHealth } from '../lib/api-client';
import 'maplibre-gl/dist/maplibre-gl.css';
import clsx from 'clsx';

// ─── Zone metadata (all 7 Mangaluru zones) ─────────────────────────────────
const ZONE_META: Record<string, {
  name: string; area: string; pop: string; type: string;
  onset: string; peak: string; duration: string;
  drivers: { label: string; val: number }[];
  mitigation: string[];
  effects: string[];
  riskByStep: number[];   // risk % at each of the 5 time steps
  severityByStep: number[];
}> = {
  Z1: {
    name: 'Bengre Sandpit', area: '1.8 km²', pop: '2,500', type: 'Coastal Sandpit',
    onset: '2:00 PM', peak: '3:30 PM', duration: '~4 hrs',
    drivers: [{ label: 'River-Sea Merge', val: 38 }, { label: 'Tide Surge', val: 29 }, { label: 'Rainfall', val: 20 }, { label: 'Low Elev.', val: 13 }],
    mitigation: ['Immediate boat evacuation', 'Close Bengre bridge', 'Deploy coast guard'],
    effects: ['Complete road isolation', 'Ground-floor inundation', 'School closure'],
    riskByStep: [72, 82, 92, 85, 60],
    severityByStep: [3, 4, 4, 4, 3],
  },
  Z2: {
    name: 'Panambur Port Area', area: '4.2 km²', pop: '1,200', type: 'Industrial / Port',
    onset: '3:20 PM', peak: '4:35 PM', duration: '~3.5 hrs',
    drivers: [{ label: 'Storm Surge', val: 35 }, { label: 'High Tide', val: 28 }, { label: 'Wind Speed', val: 22 }, { label: 'Breakwater', val: 15 }],
    mitigation: ['Halt port operations', 'Secure chemical storage', 'Notify NDRF'],
    effects: ['Port operations disrupted', 'Hazmat risk from warehouses', 'Vessel damage'],
    riskByStep: [60, 72, 86, 78, 50],
    severityByStep: [3, 3, 4, 3, 2],
  },
  Z3: {
    name: 'Bunder (Old Port)', area: '3.1 km²', pop: '6,800', type: 'Commercial / Harbour',
    onset: '4:00 PM', peak: '5:30 PM', duration: '~5 hrs',
    drivers: [{ label: 'Estuary Backflow', val: 32 }, { label: 'Rainfall 3h', val: 26 }, { label: 'Drainage Fail', val: 24 }, { label: 'Density', val: 18 }],
    mitigation: ['Evacuate fish market', 'Deploy pumps at estuary', 'Reroute traffic via NH66'],
    effects: ['Wholesale market flooded', 'Fishing boats at risk', 'Road closures'],
    riskByStep: [55, 65, 78, 72, 45],
    severityByStep: [3, 3, 4, 3, 2],
  },
  Z4: {
    name: 'Ullal & Someshwara', area: '6.4 km²', pop: '5,400', type: 'Residential / Coastal',
    onset: '4:15 PM', peak: '5:00 PM', duration: '~4 hrs',
    drivers: [{ label: 'Wave Overtopping', val: 30 }, { label: 'Sea Wall Breach', val: 27 }, { label: 'Rainfall', val: 25 }, { label: 'Low Elev.', val: 18 }],
    mitigation: ['Reinforce sea wall', 'Hospital standby alert', 'Shelter in 2nd floors'],
    effects: ['Ground-floor flooding', 'Hospital access at risk', 'Beach erosion'],
    riskByStep: [42, 52, 65, 60, 38],
    severityByStep: [2, 3, 3, 3, 2],
  },
  Z5: {
    name: 'Netravati River Banks', area: '5.8 km²', pop: '3,200', type: 'Riverine / Low-lying',
    onset: '5:00 PM', peak: '6:45 PM', duration: '~6 hrs',
    drivers: [{ label: 'River Discharge', val: 34 }, { label: 'Backwater', val: 30 }, { label: 'High Tide', val: 22 }, { label: 'Drain Cap.', val: 14 }],
    mitigation: ['Open flood gates', 'Evacuate riverside homes', 'Position rescue boats'],
    effects: ['Backwater flooding', 'Agricultural damage', 'Road submersion near bridge'],
    riskByStep: [35, 45, 58, 55, 32],
    severityByStep: [2, 2, 3, 3, 2],
  },
  Z6: {
    name: 'Surathkal Coastal Belt', area: '8.2 km²', pop: '4,100', type: 'Coastal / University',
    onset: '5:30 PM', peak: '6:15 PM', duration: '~3 hrs',
    drivers: [{ label: 'Poor Drainage', val: 35 }, { label: 'Moderate Surge', val: 28 }, { label: 'Storm Runoff', val: 22 }, { label: 'Impervious', val: 15 }],
    mitigation: ['Close coastal road', 'Campus advisory issued', 'Unblock stormwater drains'],
    effects: ['Access roads flooded', 'Minor coastal erosion', 'Campus connectivity affected'],
    riskByStep: [25, 32, 42, 38, 22],
    severityByStep: [2, 2, 2, 2, 1],
  },
  Z7: {
    name: 'Kulai & Hosabettu', area: '9.5 km²', pop: '2,800', type: 'Residential / Inland',
    onset: '6:00 PM', peak: '7:00 PM', duration: '~2 hrs',
    drivers: [{ label: 'Blocked Drains', val: 40 }, { label: 'Heavy Rain', val: 32 }, { label: 'Flat Terrain', val: 18 }, { label: 'Soil Sat.', val: 10 }],
    mitigation: ['Clear storm drains', 'Monitor low-lying roads', 'Pre-position pumps'],
    effects: ['Minor road pooling', 'Delayed traffic', 'Waterlogging in basements'],
    riskByStep: [15, 20, 25, 22, 12],
    severityByStep: [1, 1, 1, 1, 1],
  },
};

const SEV_COLOR: Record<number, string> = { 1: '#22c55e', 2: '#eab308', 3: '#f97316', 4: '#ef4444' };
const SEV_LABEL: Record<number, string> = { 1: 'Minor', 2: 'Moderate', 3: 'Severe', 4: 'Critical' };

// ─── Time steps ────────────────────────────────────────────────────────────
const TIME_STEPS = [
  { label: 'NOW', offset: 0 },
  { label: '+30m', offset: 0.5 },
  { label: '+1 hr', offset: 1 },
  { label: '+2 hr', offset: 2 },
  { label: '+4 hr', offset: 4 },
];

// ─── Chart & timeline data ─────────────────────────────────────────────────
const rainfallSeries = [50, 88, 150, 120, 40];
const tideSeries = [2.8, 3.0, 3.5, 3.4, 2.6];
const riskSeries = [62, 74, 86, 80, 55];
const TINTS = ['#3b82f6', '#60a5fa', '#f97316', '#ef4444', '#22c55e'];

function buildChartData(series: number[], currentIdx: number) {
  return TIME_STEPS.map((t, i) => ({
    time: t.label,
    future: i > currentIdx ? series[i] : undefined,
    current: i <= currentIdx ? series[i] : undefined,
  }));
}

// ─── All 7 zone polygons (approximate Mangaluru coords) ────────────────────
const zonesBase = [
  { id: 'Z1', geometry: { type: 'Polygon', coordinates: [[[74.826, 12.858], [74.836, 12.858], [74.836, 12.870], [74.826, 12.870], [74.826, 12.858]]] } },
  { id: 'Z2', geometry: { type: 'Polygon', coordinates: [[[74.800, 12.928], [74.820, 12.928], [74.820, 12.948], [74.800, 12.948], [74.800, 12.928]]] } },
  { id: 'Z3', geometry: { type: 'Polygon', coordinates: [[[74.838, 12.862], [74.852, 12.862], [74.852, 12.874], [74.838, 12.874], [74.838, 12.862]]] } },
  { id: 'Z4', geometry: { type: 'Polygon', coordinates: [[[74.843, 12.800], [74.862, 12.800], [74.862, 12.818], [74.843, 12.818], [74.843, 12.800]]] } },
  { id: 'Z5', geometry: { type: 'Polygon', coordinates: [[[74.855, 12.838], [74.876, 12.838], [74.876, 12.858], [74.855, 12.858], [74.855, 12.838]]] } },
  { id: 'Z6', geometry: { type: 'Polygon', coordinates: [[[74.787, 12.994], [74.808, 12.994], [74.808, 13.012], [74.787, 13.012], [74.787, 12.994]]] } },
  { id: 'Z7', geometry: { type: 'Polygon', coordinates: [[[74.874, 12.900], [74.895, 12.900], [74.895, 12.920], [74.874, 12.920], [74.874, 12.900]]] } },
];

function buildGeoJSON(stepIdx: number) {
  return {
    type: 'FeatureCollection',
    features: zonesBase.map(z => {
      const meta = ZONE_META[z.id];
      const sev = meta?.severityByStep[stepIdx] ?? 1;
      const risk = meta?.riskByStep[stepIdx] ?? 10;
      return {
        type: 'Feature',
        properties: { id: z.id, severity: sev, risk },
        geometry: z.geometry,
      };
    })
  };
}

const mapStyle = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Esri' } },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 }]
};

// ─── Chart tooltip ──────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A1628] border border-[#1A2C46] rounded px-2 py-1 text-xs text-white">
      <div className="text-[#8A9EB8]">{label}</div>
      <div className="font-mono font-bold">{payload[0]?.value ?? payload[1]?.value}</div>
    </div>
  );
};

// ─── Map hover tooltip ──────────────────────────────────────────────────────
interface HoverState {
  x: number; y: number; zoneId: string;
  stepIdx: number;
}

function ZoneTooltip({ hover }: { hover: HoverState }) {
  const meta = ZONE_META[hover.zoneId];
  if (!meta) return null;
  const risk = meta.riskByStep[hover.stepIdx];
  const sev = meta.severityByStep[hover.stepIdx];
  const col = SEV_COLOR[sev];
  const circ = 2 * Math.PI * 28;
  const offset = circ * (1 - risk / 100);

  // Determine quadrant to flip tooltip direction and prevent clipping
  const isRight = hover.x > 300;
  const isBottom = hover.y > 250;
  const TOOLTIP_W = 290;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: isRight ? hover.x - 16 : hover.x + 16,
    top: isBottom ? hover.y - 16 : hover.y + 16,
    transform: `${isRight ? 'translateX(-100%) ' : ''}${isBottom ? 'translateY(-100%)' : ''}`.trim(),
    width: TOOLTIP_W,
    pointerEvents: 'none',
    zIndex: 50,
  };

  return (
    <div style={style} className="bg-[#080F1E]/95 backdrop-blur-md border border-[#1A2C46] rounded-xl shadow-2xl overflow-hidden text-white">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-2 border-b border-[#1A2C46]" style={{ borderLeftWidth: 3, borderLeftColor: col }}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-mono text-[#5C85C5]">{hover.zoneId}</div>
            <div className="font-bold text-sm leading-tight">{meta.name}</div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{ color: col, borderColor: col + '60', backgroundColor: col + '18' }}>
            {SEV_LABEL[sev]}
          </span>
        </div>
        <div className="text-[10px] text-[#5C85C5] mt-0.5">{meta.type}</div>
      </div>

      <div className="p-3 space-y-3">
        {/* Risk ring + key stats */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#1A2C46" strokeWidth="5" />
              <circle cx="32" cy="32" r="28" fill="none" stroke={col} strokeWidth="5"
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black leading-none" style={{ color: col }}>{risk}%</span>
              <span className="text-[8px] text-[#8A9EB8] uppercase">Risk</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 flex-1">
            <div><div className="text-[9px] text-[#5C85C5] uppercase">Area</div><div className="text-xs font-bold">{meta.area}</div></div>
            <div><div className="text-[9px] text-[#5C85C5] uppercase">Population</div><div className="text-xs font-bold">{meta.pop}</div></div>
            <div><div className="text-[9px] text-[#5C85C5] uppercase">Onset</div><div className="text-xs font-bold text-orange-400">{meta.onset}</div></div>
            <div><div className="text-[9px] text-[#5C85C5] uppercase">Peak</div><div className="text-xs font-bold text-red-400">{meta.peak}</div></div>
            <div><div className="text-[9px] text-[#5C85C5] uppercase">Duration</div><div className="text-xs font-bold">{meta.duration}</div></div>
            <div><div className="text-[9px] text-[#5C85C5] uppercase">Forecast</div><div className="text-xs font-bold text-blue-400">{TIME_STEPS[hover.stepIdx].label}</div></div>
          </div>
        </div>

        {/* Drivers */}
        <div>
          <div className="text-[9px] text-[#5C85C5] uppercase font-semibold tracking-wider mb-1.5">Flood Drivers</div>
          <div className="space-y-1.5">
            {meta.drivers.map(d => (
              <div key={d.label} className="flex items-center gap-2">
                <div className="w-24 text-[10px] text-[#8A9EB8] shrink-0 truncate">{d.label}</div>
                <div className="flex-1 h-1.5 bg-[#1A2C46] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${d.val * 2.5}%`, backgroundColor: col }} />
                </div>
                <div className="text-[10px] font-mono w-6 text-right" style={{ color: col }}>{d.val}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Effects & Mitigation side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] text-[#5C85C5] uppercase font-semibold tracking-wider mb-1.5 flex items-center gap-1">
              <AlertTriangle size={9} className="text-red-400" /> Effects
            </div>
            <ul className="space-y-1">
              {meta.effects.map(e => (
                <li key={e} className="text-[10px] text-[#B4C6DF] flex gap-1">
                  <span className="text-red-400 shrink-0">•</span>{e}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[9px] text-[#5C85C5] uppercase font-semibold tracking-wider mb-1.5 flex items-center gap-1">
              <ShieldAlert size={9} className="text-emerald-400" /> Mitigation
            </div>
            <ul className="space-y-1">
              {meta.mitigation.map(m => (
                <li key={m} className="text-[10px] text-[#B4C6DF] flex gap-1">
                  <span className="text-emerald-400 shrink-0">✓</span>{m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState('Z1');
  const mapRef = useRef<any>(null);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    checkApiHealth().then(setApiOnline);
  }, []);

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const features = e.features;
    if (features && features.length > 0) {
      const f = features[0];
      const zoneId = f.properties?.id as string;
      if (zoneId && ZONE_META[zoneId]) {
        setHoverState({ x: e.point.x, y: e.point.y, zoneId, stepIdx: activeStep });
        if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
      } else {
        setHoverState(null);
        if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
      }
    } else {
      setHoverState(null);
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
    }
  }, [activeStep]);

  const onMouseLeave = useCallback(() => {
    setHoverState(null);
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
  }, []);

  const onZoneClick = useCallback((e: MapLayerMouseEvent) => {
    const features = e.features;
    if (!features || features.length === 0) return;

    const zoneId = features[0].properties?.id as string;
    if (zoneId && ZONE_META[zoneId]) {
      setSelectedZoneId(zoneId);
    }
  }, []);

  const selectedZone = ZONE_META[selectedZoneId] ?? ZONE_META.Z1;
  const risk = selectedZone.riskByStep[activeStep];
  const rainfall = rainfallSeries[activeStep];
  const tide = tideSeries[activeStep];
  const riskColor = risk >= 80 ? '#d946ef' : risk >= 65 ? '#ef4444' : risk >= 45 ? '#f97316' : '#22c55e';
  const severityTxt = risk >= 80 ? 'CRITICAL' : risk >= 65 ? 'SEVERE' : risk >= 45 ? 'HIGH' : 'MODERATE';
  const circumference = 2 * Math.PI * 42; // ≈264
  const dashOffset = circumference * (1 - risk / 100);

  const rainfallData = buildChartData(rainfallSeries, activeStep);
  const tideData = buildChartData(tideSeries, activeStep);
  const geoJSON = buildGeoJSON(activeStep);

  return (
    <>
      {/* Left Column: Map & Timeline */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">

        {/* Map Container */}
        <div className="flex-1 min-h-0 bg-[#091524] rounded-lg border border-[#1A2C46] relative overflow-hidden">
          <Map
            ref={mapRef}
            initialViewState={{ longitude: 74.84, latitude: 12.87, zoom: 12 }}
            mapStyle={mapStyle as any}
            interactiveLayerIds={['zone-fill']}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onClick={onZoneClick}
          >
            <FullscreenControl position="top-right" />
            <NavigationControl position="bottom-right" />
            <Source id="zones" type="geojson" data={geoJSON as any}>
              <Layer id="zone-fill" type="fill" paint={{ 'fill-color': ['match', ['get', 'severity'], 1, '#22c55e', 2, '#eab308', 3, '#f97316', 4, '#ef4444', '#64748b'], 'fill-opacity': 0.55 }} />
              <Layer id="zone-line" type="line" paint={{ 'line-color': ['match', ['get', 'severity'], 1, '#22c55e', 2, '#eab308', 3, '#f97316', 4, '#ef4444', '#64748b'], 'line-width': 2, 'line-opacity': 0.9 }} />
            </Source>
            {hoverState && <ZoneTooltip hover={hoverState} />}
          </Map>

          {/* Step indicator on map */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#0A1628]/95 backdrop-blur border border-[#1A2C46] rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-bold text-white shadow-xl">
            <Clock size={12} className="text-blue-400" />
            Forecast: <span className="text-blue-400">{TIME_STEPS[activeStep].label}</span>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-[#0A1628]/90 backdrop-blur border border-[#1A2C46] rounded-lg p-3 w-56 shadow-xl text-white">
            <h4 className="text-xs font-bold mb-2">Flood Risk Level</h4>
            <div className="h-2.5 w-full rounded bg-gradient-to-r from-green-500 via-yellow-400 via-orange-500 to-red-600 mb-1" />
            <div className="flex justify-between text-[10px] text-[#8A9EB8] mb-3"><span>Safe</span><span>Critical</span></div>
            <div className="grid grid-cols-2 gap-y-1.5 text-[10px]">
              <div className="flex items-center gap-1.5"><Hospital size={11} /> Hospital</div>
              <div className="flex items-center gap-1.5"><Navigation2 size={11} /> Shelter</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-orange-400" />{' '}Critical Road</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-blue-500" />{' '}River / Drain</div>
            </div>
          </div>
        </div>

        {/* Forecast Timeline + Charts */}
        <div className="h-48 bg-[#0A1628] rounded-lg border border-[#1A2C46] flex p-3 gap-4 shrink-0">

          {/* Timeline scrubber */}
          <div className="flex-1 flex flex-col">
            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
              <Zap size={13} className="text-blue-400" /> Forecast Timeline
              <span className="ml-auto text-[10px] text-[#5C85C5] font-normal">Click to scrub</span>
            </h4>

            <div className="flex items-center gap-1 flex-1">
              {TIME_STEPS.map((step, i) => {
                const isActive = i === activeStep;
                const isPast = i < activeStep;
                const tint = TINTS[i];
                return (
                  <React.Fragment key={step.label}>
                    <button
                      onClick={() => setActiveStep(i)}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 flex-1 group transition-all duration-200 cursor-pointer rounded-lg p-1',
                        isActive ? 'scale-105' : 'hover:scale-102 opacity-70 hover:opacity-100'
                      )}
                    >
                      {/* Thumbnail card */}
                      <div className={clsx(
                        'w-full rounded-lg border-2 overflow-hidden relative',
                        'transition-all duration-200',
                        isActive
                          ? 'border-blue-400 shadow-[0_0_14px_rgba(59,130,246,0.6)]'
                          : 'border-[#1A2C46] group-hover:border-[#3A5276]'
                      )} style={{ aspectRatio: '16/9' }}>
                        {/* Map thumbnail background */}
                        <div
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url(https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1912/2927)` }}
                        />
                        {/* Flood tint overlay — intensity grows with time */}
                        <div
                          className="absolute inset-0 transition-opacity duration-300"
                          style={{ backgroundColor: tint, opacity: isPast ? 0.45 : isActive ? 0.55 : 0.25 }}
                        />
                        {/* Risk badge on thumbnail */}
                        <div className="absolute bottom-1 right-1 bg-black/70 rounded text-[9px] font-mono font-bold px-1"
                          style={{ color: riskSeries[i] >= 80 ? '#d946ef' : riskSeries[i] >= 65 ? '#ef4444' : riskSeries[i] >= 45 ? '#f97316' : '#22c55e' }}>
                          {riskSeries[i]}%
                        </div>
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                        )}
                      </div>

                      {/* Label */}
                      <span className={clsx('text-[11px] font-bold transition-colors', isActive ? 'text-blue-400' : 'text-[#8A9EB8] group-hover:text-white')}>
                        {step.label}
                      </span>
                    </button>

                    {/* Connector line */}
                    {i < TIME_STEPS.length - 1 && (
                      <div className={clsx('w-4 h-px shrink-0 transition-colors', i < activeStep ? 'bg-blue-500' : 'bg-[#1A2C46]')} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="w-px bg-[#1A2C46] mx-1" />

          {/* Mini charts */}
          <div className="w-60 flex flex-col gap-2">
            {/* Rainfall chart */}
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between text-xs text-white mb-0.5">
                <span className="flex items-center gap-1 text-blue-400"><Waves size={11} /> Rainfall (mm)</span>
                <span className="font-mono font-bold">{rainfall} mm</span>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rainfallData} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#5C85C5' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} dot={false} isAnimationActive={false} connectNulls />
                    <Area type="monotone" dataKey="future" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls />
                    <ReferenceLine x={TIME_STEPS[activeStep].label} stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="3 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tide chart */}
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between text-xs text-white mb-0.5">
                <span className="flex items-center gap-1 text-cyan-400"><Waves size={11} /> Tide (m)</span>
                <span className="font-mono font-bold">{tide.toFixed(1)} m</span>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tideData} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#5C85C5' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="current" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.35} dot={false} isAnimationActive={false} connectNulls />
                    <Area type="monotone" dataKey="future" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.1} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls />
                    <ReferenceLine x={TIME_STEPS[activeStep].label} stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="3 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="w-[420px] flex flex-col gap-2 shrink-0 overflow-y-auto pr-1 pb-4" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>

        {/* Zone Detail */}
        <div className="bg-[#0A1628] rounded-lg border border-[#1A2C46] p-4 flex flex-col">
          <div className="flex justify-between items-center mb-3 gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><MapPin size={15} /> Zone Detail</h3>
            <div className="flex items-center gap-2">
              <div className={clsx(
                'flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded border',
                apiOnline
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-red-400 bg-red-500/10 border-red-500/30'
              )}>
                <span className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  apiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                )} />
                {apiOnline ? 'AI MODEL ONLINE' : 'AI MODEL OFFLINE'}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#5C85C5] bg-[#112136] border border-[#1A2C46] px-2 py-0.5 rounded">
                <Clock size={10} /> {TIME_STEPS[activeStep].label}
              </div>
            </div>
          </div>

          <h2 className="text-base font-bold text-white mb-1">{selectedZone.name}</h2>
          <div className="text-[10px] text-[#5C85C5] mb-3">{selectedZoneId} • {selectedZone.type} • Click a zone on the map to inspect it</div>

          <div className="flex gap-5 items-center mb-4">
            {/* Risk ring — animates on step change */}
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="42" fill="none" stroke="#1A2C46" strokeWidth="8" />
                <circle cx="48" cy="48" r="42" fill="none" stroke={riskColor} strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-700"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white leading-none" style={{ color: riskColor }}>{risk}%</span>
                <span className="text-[9px] text-[#8A9EB8] uppercase text-center mt-1">Flood<br />Risk</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2.5">
              <div className="text-xs font-bold px-3 py-1 rounded tracking-widest w-fit text-white" style={{ backgroundColor: riskColor }}>
                {severityTxt}
              </div>
              <div className="flex items-center gap-2 text-white">
                <div className="w-6 h-6 rounded-full bg-[#112136] flex items-center justify-center"><Activity size={12} className="text-blue-400" /></div>
                <div className="flex flex-col"><span className="text-[10px] text-[#8A9EB8]">Onset</span><span className="font-mono text-sm">{selectedZone.onset}</span></div>
              </div>
              <div className="flex items-center gap-2 text-white">
                <div className="w-6 h-6 rounded-full bg-[#112136] flex items-center justify-center"><AlertTriangle size={12} className="text-blue-400" /></div>
                <div className="flex flex-col"><span className="text-[10px] text-[#8A9EB8]">Peak at</span><span className="font-mono text-sm">{selectedZone.peak}</span></div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 text-xs text-[#8A9EB8] pb-4 border-b border-[#1A2C46]">
            <span>• {selectedZone.type}</span>
            <span>• {selectedZone.area}</span>
            <span>• {selectedZone.pop} exposed</span>
          </div>

          <div className="pt-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-1"><Activity size={13} /> Main Drivers <span className="text-[#8A9EB8] font-normal">(scenario)</span></h3>
            <div className="space-y-2 mt-2">
              {selectedZone.drivers.map((d, i) => {
                const driverColors = ['bg-red-500', 'bg-orange-500', 'bg-orange-400', 'bg-yellow-500'];
                const barWidth = Math.min(d.val * 2.5, 100);
                return (
                  <div key={d.label} className="flex items-center gap-2 text-xs text-[#8A9EB8]">
                    <div className="w-24 shrink-0 flex items-center gap-1 truncate"><Info size={9} /> {d.label}</div>
                    <div className="flex-1 h-1.5 bg-[#1A2C46] rounded-full overflow-hidden">
                      <div className={`h-full ${driverColors[i % driverColors.length]} transition-all duration-500`} style={{ width: `${barWidth}%` }} />
                    </div>
                    <div className="w-7 text-right font-mono text-[10px]">{d.val}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Priority List */}
        <div className="bg-[#0A1628] rounded-lg border border-[#1A2C46] p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><AlertTriangle size={15} /> Emergency Priority</h3>
            <span className="text-[10px] text-[#8A9EB8] hover:text-white cursor-pointer transition-colors">View All →</span>
          </div>
          <div className="space-y-2">
            {[
              { rank: 1, name: 'Bengre Sandpit', desc: 'School • Isolated route', sev: 'CRITICAL', color: 'text-fuchsia-400', bar: '#d946ef', icon: MapPin },
              { rank: 2, name: 'Panambur Port Area', desc: 'Port • Industrial hazard', sev: 'CRITICAL', color: 'text-red-400', bar: '#ef4444', icon: AlertTriangle },
              { rank: 3, name: 'Bunder (Old Port)', desc: 'Market • Dense population', sev: 'CRITICAL', color: 'text-red-400', bar: '#ef4444', icon: Activity },
              { rank: 4, name: 'Ullal & Someshwara', desc: 'Hospital • Coastal erosion', sev: 'SEVERE', color: 'text-orange-400', bar: '#f97316', icon: Hospital },
            ].map(z => (
              <div key={z.rank} className="flex gap-3 bg-[#112136] border border-[#1A2C46] rounded-lg p-2.5 items-center hover:border-[#3A5276] transition-colors cursor-pointer">
                <div className={`font-mono font-black text-base w-7 shrink-0 ${z.color}`}>#{z.rank}</div>
                <div className="w-0.5 h-8 rounded-full shrink-0" style={{ backgroundColor: z.bar }} />
                <div className="w-7 h-7 rounded-full bg-[#1A2C46] flex items-center justify-center shrink-0">
                  <z.icon size={13} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{z.name}</div>
                  <div className="text-[10px] text-[#8A9EB8] truncate">{z.desc}</div>
                </div>
                <div className={`text-[10px] font-bold tracking-wider border rounded px-1.5 py-0.5 ${z.color}`} style={{ borderColor: z.bar + '60' }}>
                  {z.sev}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Briefing */}
        <div className="bg-[#0A1628] rounded-lg border border-blue-500/40 p-4 shrink-0 relative overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.08)]">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-cyan-500" />
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-2"><Activity size={13} className="text-blue-400" /> AI Briefing</h3>
            <span className={clsx(
              'text-[10px] flex items-center gap-1',
              apiOnline ? 'text-emerald-400' : 'text-red-400'
            )}>
              <span className={clsx(
                'w-1.5 h-1.5 rounded-full inline-block',
                apiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              )} />
              {apiOnline ? 'API Connected' : 'API Offline'}
            </span>
          </div>
          <ol className="text-xs text-[#B4C6DF] space-y-1.5 list-decimal pl-4">
            <li>High risk is concentrated in the most exposed coastal and river-adjacent zones in this demonstration scenario.</li>
            <li>Prioritise evacuation for ground-floor residents in low-lying coastal areas.</li>
            <li>Deploy response teams to Zones Z1, Z2, Z3 immediately.</li>
          </ol>
          <div className="mt-3 pt-2 border-t border-blue-500/20 text-[9px] leading-relaxed text-[#5C85C5]">
            Dashboard zone values are the current Mangaluru demonstration scenario. The connected XGBoost model is trained on the available MODIS/Sulawesi dataset and is not yet used to claim Mangaluru-specific predictions.
          </div>
        </div>
      </div>
    </>
  );
}