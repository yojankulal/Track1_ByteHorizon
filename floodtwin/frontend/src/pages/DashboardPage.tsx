import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  MapPin, AlertTriangle, Activity, Droplets,
  TrendingUp, Sliders, RefreshCw, BarChart3,
  Layers, Compass, Mountain, ArrowUpRight, ArrowDownRight, Filter, Clock,
  Sparkles, CheckCircle2, ChevronDown, ChevronUp, FileText,
  Shield, Crosshair, Target, Map as MapIcon
} from 'lucide-react';
import Map, { Source, Layer, NavigationControl, FullscreenControl, MapLayerMouseEvent, Marker } from 'react-map-gl/maplibre';
import {
  checkApiHealth, fetchGrid, fetchPriorities, explainFlood, simulateScenario,
  computePhysicalHydrologicalSimulation, fetchModelMetrics, fetchInfrastructure
} from '../lib/api-client';
import type {
  GridCell, GridResponse, PriorityArea, LocalShapResponse, ModelMetricsResponse
} from '../lib/api-client';
import 'maplibre-gl/dist/maplibre-gl.css';
import clsx from 'clsx';
import TimelineSlider, { TIMELINE_STEPS } from '../components/timeline/TimelineSlider';
import BriefingCard from '../components/briefing/BriefingCard';
import { TippingPointCard, TIP_COLORS } from '../components/TippingPointCard';

const RISK_COLORS: Record<string, string> = {
  Low: '#10b981',
  Moderate: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
};

const RISK_BG_CLASSES: Record<string, string> = {
  Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  Moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  High: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  Critical: 'bg-red-500/20 text-red-400 border-red-500/40',
};

const mapStyle = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
    },
  },
  layers: [{ id: 'esri-sat', type: 'raster', source: 'esri', minzoom: 0, maxzoom: 20 }],
};

interface HoverInfo {
  x: number;
  y: number;
  cell: GridCell;
}

export default function DashboardPage() {
  const [gridData, setGridData] = useState<GridResponse | null>(null);
  const [priorities, setPriorities] = useState<PriorityArea[]>([]);
  const [metrics, setMetrics] = useState<ModelMetricsResponse | null>(null);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [shapData, setShapData] = useState<LocalShapResponse | null>(null);
  const [isLoadingShap, setIsLoadingShap] = useState(false);
  const [showTechShap, setShowTechShap] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  // Infrastructure Data
  const [infraData, setInfraData] = useState<{roads: any, buildings: any, facilities: any} | null>(null);
  const [showInfra, setShowInfra] = useState<boolean>(true);
  const [showSensitivity, setShowSensitivity] = useState<boolean>(false);

  // Forecast Timeline State
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const activeTimelineStep = TIMELINE_STEPS[currentStepIndex] || TIMELINE_STEPS[0];

  // What-If scenario states for selected cell
  const [simRain1d, setSimRain1d] = useState<number>(0);
  const [simRain3d, setSimRain3d] = useState<number>(0);
  const [simElevAdj, setSimElevAdj] = useState<number>(0);
  const [simResult, setSimResult] = useState<{
    scenarioProb: number;
    scenarioRisk: 'Low' | 'Moderate' | 'High' | 'Critical';
    deltaPercent: number;
    explanation: string;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Tab view on the right panel
  const [rightTab, setRightTab] = useState<'details' | 'shap' | 'whatif' | 'performance'>('details');

  // Bottom operations center view: Briefing vs Emergency Priorities (defaults to briefing)
  const [bottomSection, setBottomSection] = useState<'briefing' | 'priority'>('briefing');

  const mapRef = useRef<any>(null);

  // Initial load
  useEffect(() => {
    checkApiHealth().then(setApiOnline);

    fetchGrid(1200)
      .then(data => {
        setGridData(data);
        if (data.cells.length > 0) {
          const sorted = [...data.cells].sort((a, b) => b.flood_probability - a.flood_probability);
          setSelectedCell(sorted[0]);
        }
      })
      .catch(console.error);

    fetchPriorities(10).then(setPriorities).catch(console.error);
    fetchModelMetrics().then(setMetrics).catch(console.error);
    fetchInfrastructure().then(setInfraData).catch(console.error);

    const interval = setInterval(() => {
      checkApiHealth().then(setApiOnline);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // When selected cell changes, fetch local SHAP explanation and reset what-if inputs
  useEffect(() => {
    if (!selectedCell) return;

    setSimRain1d(selectedCell.precip_1d);
    setSimRain3d(selectedCell.precip_3d);
    setSimElevAdj(0);

    // Compute baseline simulation result immediately
    const initialSim = computePhysicalHydrologicalSimulation(
      selectedCell,
      selectedCell.precip_1d,
      selectedCell.precip_3d,
      0
    );
    setSimResult(initialSim);

    setIsLoadingShap(true);
    explainFlood({
      lon: selectedCell.lon,
      lat: selectedCell.lat,
      precip_1d: selectedCell.precip_1d,
      precip_3d: selectedCell.precip_3d,
      landcover: selectedCell.landcover,
      elevation: selectedCell.elevation,
      slope: selectedCell.slope,
      TWI: selectedCell.TWI,
      upstream_area_log: selectedCell.upstream_area_log,
      aspect_sin: selectedCell.aspect_sin,
      aspect_cos: selectedCell.aspect_cos,
    })
      .then(data => {
        setShapData(data);
        setIsLoadingShap(false);
      })
      .catch(err => {
        console.error('SHAP error:', err);
        setIsLoadingShap(false);
      });
  }, [selectedCell]);

  // Handle What-If Simulation: strictly physically coupled and monotonic
  const handleRunSimulation = async (r1d = simRain1d, r3d = simRain3d, eAdj = simElevAdj) => {
    if (!selectedCell) return;
    setIsSimulating(true);

    try {
      // First compute client-side physical hydrological simulation for instant response
      const clientRes = computePhysicalHydrologicalSimulation(
        selectedCell,
        r1d,
        r3d,
        eAdj
      );
      setSimResult(clientRes);

      // Attempt backend API sync if online
      try {
        const res = await simulateScenario({
          baseline_features: {
            lon: selectedCell.lon,
            lat: selectedCell.lat,
            precip_1d: selectedCell.precip_1d,
            precip_3d: selectedCell.precip_3d,
            landcover: selectedCell.landcover,
            elevation: selectedCell.elevation,
            slope: selectedCell.slope,
            TWI: selectedCell.TWI,
            upstream_area_log: selectedCell.upstream_area_log,
            aspect_sin: selectedCell.aspect_sin,
            aspect_cos: selectedCell.aspect_cos,
          },
          sim_precip_1d: r1d,
          sim_precip_3d: r3d,
          sim_elevation_adj: eAdj,
        });

        setSimResult({
          scenarioProb: res.scenario_probability_percent,
          scenarioRisk: res.scenario_risk_level,
          deltaPercent: res.delta_percentage_points,
          explanation: res.explanation,
        });
      } catch {
        // Fallback already set via clientRes
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Timeline Step Change Handler
  const handleTimelineStepChange = (idx: number) => {
    setCurrentStepIndex(idx);
  };

  // Modulate cells according to the active timeline step
  const modulatedCells = useMemo(() => {
    if (!gridData) return [];

    return gridData.cells.map(c => {
      // Calculate dynamic risk scaling under timeline storm forcing
      const multiplier = activeTimelineStep.riskMultiplier;
      const precipAdd = activeTimelineStep.precip3dDelta;

      // Base probability scaled by storm timeline
      let prob = Math.round(c.flood_probability_percent * multiplier * 10) / 10;
      prob = Math.max(0.2, Math.min(99.8, prob));

      let risk: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
      if (prob >= 75) risk = 'Critical';
      else if (prob >= 50) risk = 'High';
      else if (prob >= 20) risk = 'Moderate';
      else risk = 'Low';

      return {
        ...c,
        flood_probability_percent: prob,
        flood_probability: prob / 100,
        risk_level: risk,
        precip_3d: c.precip_3d + precipAdd,
      };
    });
  }, [gridData, activeTimelineStep]);

  // Dynamic counts for active timeline
  const activeCriticalCount = useMemo(() => {
    return modulatedCells.filter(c => c.risk_level === 'Critical').length;
  }, [modulatedCells]);

  const activeHighRiskCount = useMemo(() => {
    return modulatedCells.filter(c => c.risk_level === 'High').length;
  }, [modulatedCells]);

  // GeoJSON features for map
  const geoJSON = useMemo(() => {
    if (!modulatedCells || modulatedCells.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    let filtered = modulatedCells;
    if (selectedEvent !== 'ALL') {
      filtered = filtered.filter(c => c.event_id === selectedEvent);
    }
    if (riskFilter !== 'ALL') {
      filtered = filtered.filter(c => c.risk_level === riskFilter);
    }

    return {
      type: 'FeatureCollection',
      features: filtered.map(c => ({
        type: 'Feature',
        properties: {
          id: c.id,
          risk_level: c.risk_level,
          rain_sensitivity: c.rain_sensitivity ?? 'Resilient',
          prob: c.flood_probability_percent,
          elev: c.elevation,
          precip_3d: c.precip_3d,
          cellData: JSON.stringify(c),
        },
        geometry: {
          type: 'Point',
          coordinates: [c.lon, c.lat],
        },
      })),
    };
  }, [modulatedCells, selectedEvent, riskFilter]);

  // Translucent Hover Sphere Spread GeoJSON
  const hoverGeoJSON = useMemo(() => {
    if (!hoverInfo?.cell) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            risk_level: hoverInfo.cell.risk_level,
            color: RISK_COLORS[hoverInfo.cell.risk_level] || '#3b82f6',
          },
          geometry: {
            type: 'Point',
            coordinates: [hoverInfo.cell.lon, hoverInfo.cell.lat],
          },
        },
      ],
    };
  }, [hoverInfo]);

  // Selected Zone Targeted Beacon GeoJSON for high-visibility focus
  const selectedZoneGeoJSON = useMemo(() => {
    if (!selectedCell) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: selectedCell.id,
            risk_level: selectedCell.risk_level,
            color: RISK_COLORS[selectedCell.risk_level] || '#3b82f6',
          },
          geometry: {
            type: 'Point',
            coordinates: [selectedCell.lon, selectedCell.lat],
          },
        },
      ],
    };
  }, [selectedCell]);



  // Map interaction
  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const features = e.features;
    if (features && features.length > 0) {
      const f = features[0];
      if (f.properties?.cellData) {
        try {
          const parsed = JSON.parse(f.properties.cellData) as GridCell;
          setHoverInfo({ x: e.point.x, y: e.point.y, cell: parsed });
          if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
          return;
        } catch {}
      }
    }
    setHoverInfo(null);
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoverInfo(null);
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
  }, []);

  const onMapClick = useCallback((e: MapLayerMouseEvent) => {
    const features = e.features;
    if (!features || features.length === 0) return;
    const f = features[0];
    if (f.properties?.cellData) {
      try {
        const parsed = JSON.parse(f.properties.cellData) as GridCell;
        setSelectedCell(parsed);
      } catch {}
    }
  }, []);

  const selectPriority = (p: PriorityArea) => {
    const found = gridData?.cells.find(c => c.id === p.id);
    if (found) {
      setSelectedCell(found);
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [found.lon, found.lat],
          zoom: 9.8,
          duration: 1200,
        });
      }
    }
  };

  const circumference = 2 * Math.PI * 40;
  const currentRiskProb = selectedCell?.flood_probability_percent ?? 0;
  const currentRiskColor = selectedCell ? RISK_COLORS[selectedCell.risk_level] : '#3b82f6';
  const riskDashOffset = circumference * (1 - currentRiskProb / 100);

  return (
    <div className="flex-1 flex gap-3 h-full overflow-hidden p-2.5 bg-[#040B14]">
      {/* ─── LEFT / CENTER: Map, Timeline & Bottom Operations Center (Scrollable) ─── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 overflow-y-auto pr-1.5 pb-6">
        {/* Map Header Controls */}
        <div className="bg-[#081220] border border-[#1A2C46] rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Compass size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-wide">
                  Sulawesi Spatial Prediction Grid
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                  Forecast: {activeTimelineStep.label}
                </span>
              </div>
            </div>
          </div>

          {/* Filters & Event selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#8A9EB8]">
              <Filter size={13} className="text-blue-400" />
              <span>Risk:</span>
              <select
                value={riskFilter}
                onChange={e => setRiskFilter(e.target.value)}
                className="bg-[#0D1B2E] text-white border border-[#1A2C46] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Levels ({gridData?.total_cells ?? 0})</option>
                <option value="Critical">Critical Only ({activeCriticalCount})</option>
                <option value="High">High Risk ({activeHighRiskCount})</option>
                <option value="Moderate">Moderate</option>
                <option value="Low">Low Risk</option>
              </select>
            </div>

            {gridData?.events && gridData.events.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-[#8A9EB8]">
                <Clock size={13} className="text-cyan-400" />
                <span>Event:</span>
                <select
                  value={selectedEvent}
                  onChange={e => setSelectedEvent(e.target.value)}
                  className="bg-[#0D1B2E] text-white border border-[#1A2C46] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="ALL">Composite (All Dates)</option>
                  {gridData.events.map(ev => (
                    <option key={ev} value={ev}>{ev}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Infrastructure Toggle */}
            <div className="flex items-center gap-1.5 text-xs text-[#8A9EB8] ml-2 pl-2 border-l border-[#1A2C46]">
              <MapIcon size={13} className={showInfra ? "text-green-400" : "text-gray-500"} />
              <button 
                onClick={() => setShowInfra(!showInfra)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg border transition-colors",
                  showInfra ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-[#0D1B2E] text-gray-400 border-[#1A2C46] hover:bg-[#15253e]"
                )}
              >
                {showInfra ? 'Infra: ON' : 'Infra: OFF'}
              </button>
            </div>

            {/* Rainfall Sensitivity Toggle */}
            <div className="flex items-center gap-1.5 text-xs text-[#8A9EB8] ml-2 pl-2 border-l border-[#1A2C46]">
              <Sliders size={13} className={showSensitivity ? "text-purple-400" : "text-gray-500"} />
              <button 
                onClick={() => setShowSensitivity(!showSensitivity)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg border transition-colors",
                  showSensitivity ? "bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold" : "bg-[#0D1B2E] text-gray-400 border-[#1A2C46] hover:bg-[#15253e]"
                )}
              >
                {showSensitivity ? 'Sensitivity: ON' : 'Sensitivity: OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── FORECAST TIMELINE CONTROLLER ─── */}
        <div className="shrink-0">
          <TimelineSlider
            currentStepIndex={currentStepIndex}
            onStepChange={handleTimelineStepChange}
            isPlaying={isPlayingTimeline}
            onTogglePlay={() => setIsPlayingTimeline(!isPlayingTimeline)}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={setPlaybackSpeed}
          />
        </div>

        {/* Interactive Map Container — Locked Zoom to Bottom Right Controls */}
        <div className="min-h-[440px] h-[480px] bg-[#07101D] rounded-xl border border-[#1A2C46] relative overflow-hidden shadow-2xl shrink-0">
          <Map
            ref={mapRef}
            initialViewState={{
              longitude: 120.18,
              latitude: -4.05,
              zoom: 7.6,
            }}
            mapStyle={mapStyle as any}
            attributionControl={false}
            scrollZoom={false}
            doubleClickZoom={false}
            touchZoomRotate={false}
            dragRotate={false}
            boxZoom={false}
            keyboard={false}
            dragPan={true}
            interactiveLayerIds={['flood-points', 'flood-points-glow']}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onClick={onMapClick}
          >
            <FullscreenControl position="top-right" />
            <NavigationControl position="bottom-right" showCompass={false} />

            {/* Selected Zone High-Visibility Target Beacon & Pulse Rings */}
            {selectedZoneGeoJSON && (
              <Source id="selected-zone-beacon-source" type="geojson" data={selectedZoneGeoJSON as any}>
                <Layer
                  id="selected-beacon-pulse"
                  type="circle"
                  paint={{
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 28, 8, 48, 10, 72, 12, 100],
                    'circle-color': '#38bdf8',
                    'circle-opacity': 0.22,
                    'circle-stroke-width': 2.5,
                    'circle-stroke-color': '#38bdf8',
                    'circle-stroke-opacity': 0.95,
                    'circle-blur': 0.3,
                  }}
                />
                <Layer
                  id="selected-beacon-ring"
                  type="circle"
                  paint={{
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 14, 8, 24, 10, 36, 12, 50],
                    'circle-color': '#ffffff',
                    'circle-opacity': 0.4,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-opacity': 1,
                  }}
                />
              </Source>
            )}

            {/* Hovered Zone Translucent Spherical Ripple / Aura Spread */}
            {hoverGeoJSON && (
              <Source id="hover-sphere-source" type="geojson" data={hoverGeoJSON as any}>
                <Layer
                  id="hover-sphere-outer"
                  type="circle"
                  paint={{
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 22, 8, 38, 10, 60, 12, 85],
                    'circle-color': ['get', 'color'],
                    'circle-opacity': 0.35,
                    'circle-blur': 0.45,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': ['get', 'color'],
                    'circle-stroke-opacity': 0.85,
                  }}
                />
                <Layer
                  id="hover-sphere-core"
                  type="circle"
                  paint={{
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 12, 8, 20, 10, 32, 12, 45],
                    'circle-color': ['get', 'color'],
                    'circle-opacity': 0.45,
                    'circle-blur': 0.25,
                  }}
                />
              </Source>
            )}

            {/* ─── REAL OSM ROADS (flood-risk heatmap) ─── */}
            {showInfra && infraData?.roads && (
              <Source id="infra-roads" type="geojson" data={infraData.roads as any}>

                {/* Shadow / glow beneath primary roads for contrast on satellite */}
                <Layer
                  id="roads-primary-shadow"
                  type="line"
                  filter={['==', ['get', 'road_type'], 'primary']}
                  paint={{
                    'line-color': '#000000',
                    'line-width': ['interpolate', ['linear'], ['zoom'], 6, 3, 9, 5, 12, 8],
                    'line-opacity': 0.35,
                    'line-blur': 3,
                  }}
                />

                {/* Secondary roads — coloured by flood_risk */}
                <Layer
                  id="roads-secondary"
                  type="line"
                  filter={['==', ['get', 'road_type'], 'secondary']}
                  paint={{
                    'line-color': [
                      'interpolate', ['linear'], ['get', 'flood_risk'],
                      0.0,  '#10b981',   // green  – safe
                      0.2,  '#34d399',   // light green
                      0.35, '#fbbf24',   // amber  – moderate
                      0.5,  '#f97316',   // orange – high
                      0.75, '#ef4444',   // red    – critical
                      1.0,  '#7f1d1d',   // dark red
                    ],
                    'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 9, 1.5, 12, 2.5],
                    'line-opacity': 0.72,
                  }}
                />

                {/* Primary roads — same flood_risk gradient but thicker */}
                <Layer
                  id="roads-primary"
                  type="line"
                  filter={['==', ['get', 'road_type'], 'primary']}
                  paint={{
                    'line-color': [
                      'interpolate', ['linear'], ['get', 'flood_risk'],
                      0.0,  '#10b981',
                      0.2,  '#34d399',
                      0.35, '#fbbf24',
                      0.5,  '#f97316',
                      0.75, '#ef4444',
                      1.0,  '#7f1d1d',
                    ],
                    'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 9, 3, 12, 5],
                    'line-opacity': 0.9,
                  }}
                />
              </Source>
            )}


            <Source id="sulawesi-points" type="geojson" data={geoJSON as any}>
              {/* Outer halo / glow layer */}
              <Layer
                id="flood-points-glow"
                type="circle"
                paint={{
                  'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 6, 9, 14, 12, 22],
                  'circle-color': showSensitivity
                    ? [
                        'match',
                        ['get', 'rain_sensitivity'],
                        'Flooded at any rain', '#7C3AED',
                        'Extremely sensitive', '#C026D3',
                        'Sensitive', '#EF4444',
                        'Moderate', '#FB923C',
                        'Resilient', '#22C55E',
                        '#22C55E',
                      ]
                    : [
                        'match',
                        ['get', 'risk_level'],
                        'Critical', '#ef4444',
                        'High', '#f97316',
                        'Moderate', '#f59e0b',
                        '#10b981',
                      ],
                  'circle-opacity': 0.35,
                  'circle-blur': 0.6,
                }}
              />
              {/* Core solid point layer */}
              <Layer
                id="flood-points"
                type="circle"
                paint={{
                  'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3.5, 9, 7, 12, 12],
                  'circle-color': showSensitivity
                    ? [
                        'match',
                        ['get', 'rain_sensitivity'],
                        'Flooded at any rain', '#7C3AED',
                        'Extremely sensitive', '#C026D3',
                        'Sensitive', '#EF4444',
                        'Moderate', '#FB923C',
                        'Resilient', '#22C55E',
                        '#22C55E',
                      ]
                    : [
                        'match',
                        ['get', 'risk_level'],
                        'Critical', '#ef4444',
                        'High', '#f97316',
                        'Moderate', '#f59e0b',
                        '#10b981',
                      ],
                  'circle-stroke-width': 1.5,
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-opacity': 0.85,
                  'circle-opacity': 0.95,
                }}
              />
            </Source>

            {/* Hover Tooltip — placed INSIDE Map so it renders in fullscreen too */}
            {hoverInfo && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(hoverInfo.x + 12, window.innerWidth - 280),
                  top: Math.max(hoverInfo.y - 120, 10),
                  pointerEvents: 'none',
                  zIndex: 40,
                }}
                className="bg-[#080F1E]/95 backdrop-blur-md border border-[#1A2C46] rounded-xl p-3 text-white shadow-2xl w-64 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between border-b border-[#1A2C46] pb-1.5">
                  <span className="font-bold text-white font-mono">{hoverInfo.cell.id}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: RISK_COLORS[hoverInfo.cell.risk_level] + '25',
                      color: RISK_COLORS[hoverInfo.cell.risk_level],
                      border: `1px solid ${RISK_COLORS[hoverInfo.cell.risk_level]}60`,
                    }}
                  >
                    {hoverInfo.cell.risk_level} • {hoverInfo.cell.flood_probability_percent}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-[#8A9EB8]">
                  <div>Lat: <span className="text-white font-mono">{hoverInfo.cell.lat.toFixed(3)}°</span></div>
                  <div>Lon: <span className="text-white font-mono">{hoverInfo.cell.lon.toFixed(3)}°</span></div>
                  <div>Elevation: <span className="text-white font-bold">{hoverInfo.cell.elevation} m</span></div>
                  <div>3d Rain: <span className="text-cyan-400 font-bold">{hoverInfo.cell.precip_3d.toFixed(1)} mm</span></div>
                  <div>Slope: <span className="text-white">{hoverInfo.cell.slope.toFixed(1)}°</span></div>
                  <div>TWI: <span className="text-white font-mono">{hoverInfo.cell.TWI.toFixed(1)}</span></div>
                </div>
                <div className="text-[10px] text-blue-400 italic pt-1 border-t border-[#1A2C46]">
                  Click to inspect local SHAP &amp; features
                </div>
              </div>
            )}

            {/* ─── FACILITY MARKERS ─── */}
            {showInfra && infraData?.facilities?.features?.map((f: any) => {
              const { id, name, type, capacity } = f.properties;
              const [lon, lat] = f.geometry.coordinates;
              const isHosp = id.startsWith('HOSP');
              const isShelter = id.startsWith('SHELTER');
              const bgColor = isHosp ? '#ef4444' : isShelter ? '#22c55e' : '#f59e0b';
              const borderColor = isHosp ? '#fca5a5' : isShelter ? '#86efac' : '#fcd34d';
              return (
                <Marker key={id} longitude={lon} latitude={lat} anchor="center">
                  <div className="group relative">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-125 shadow-lg"
                      style={{ background: bgColor + '33', border: `2px solid ${borderColor}`, boxShadow: `0 0 12px ${bgColor}88` }}
                    >
                      {isHosp
                        ? <span style={{ color: borderColor, fontSize: 13, fontWeight: 900 }}>+</span>
                        : isShelter
                          ? <Shield size={12} style={{ color: borderColor }} />
                          : <span style={{ color: borderColor, fontSize: 10, fontWeight: 900 }}>⚡</span>
                      }
                    </div>
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-50 hidden group-hover:block w-52 pointer-events-none">
                      <div className="bg-[#080F1E]/98 backdrop-blur-md border border-[#1A2C46] rounded-xl p-2.5 shadow-2xl text-white text-[10px] space-y-1">
                        <div className="font-bold text-[11px] leading-tight" style={{ color: borderColor }}>{name}</div>
                        <div className="text-[#8A9EB8]">{type}</div>
                        <div className="text-cyan-400 font-mono">{capacity}</div>
                        <div className="text-[9px] text-[#8A9EB8] pt-0.5 border-t border-[#1A2C46]">{id}</div>
                      </div>
                      <div className="w-2 h-2 bg-[#1A2C46] rotate-45 mx-auto -mt-1 border-r border-b border-[#1A2C46]" />
                    </div>
                  </div>
                </Marker>
              );
            })}
          </Map>


          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-[#081220]/90 backdrop-blur-md border border-[#1A2C46] rounded-xl p-3.5 shadow-2xl text-white w-64">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold flex items-center gap-2">
                <Layers size={15} className="text-blue-400" />
                {showSensitivity ? 'Rainfall Sensitivity Scale' : 'Flood Probability Scale'}
              </span>
              <span className="text-xs text-[#8A9EB8] font-mono">{activeTimelineStep.label}</span>
            </div>
            {showSensitivity ? (
              <div className="space-y-1.5 text-xs">
                {Object.entries(TIP_COLORS).map(([catLabel, catColor]) => (
                  <div key={catLabel} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium" style={{ color: catColor }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor, boxShadow: `0 0 6px ${catColor}` }} />
                      {catLabel}
                    </span>
                    <span className="font-mono text-[#8A9EB8] text-xs">
                      {modulatedCells.filter(c => (c.rain_sensitivity ?? 'Resilient') === catLabel).length}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-emerald-400 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" /> Low Risk (&lt;20%)
                  </span>
                  <span className="font-mono text-[#8A9EB8] text-xs">{modulatedCells.filter(c => c.risk_level === 'Low').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-amber-400 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" /> Moderate (20–50%)
                  </span>
                  <span className="font-mono text-[#8A9EB8] text-xs">{modulatedCells.filter(c => c.risk_level === 'Moderate').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-orange-400 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316]" /> High Risk (50–75%)
                  </span>
                  <span className="font-mono text-[#8A9EB8] text-xs">{activeHighRiskCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-red-400 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" /> Critical (&ge;75%)
                  </span>
                  <span className="font-mono text-[#8A9EB8] text-xs">{activeCriticalCount}</span>
                </div>
              </div>
            )}

            {/* Infrastructure legend */}
            {showInfra && infraData && (
              <div className="mt-2 pt-2 border-t border-[#1A2C46] space-y-1.5 text-xs">
                <div className="text-[10px] font-bold text-[#5C85C5] uppercase tracking-widest mb-1">Road Flood Risk</div>
                {/* Gradient bar */}
                <div className="h-2 w-full rounded-full" style={{background: 'linear-gradient(to right, #10b981, #fbbf24, #f97316, #ef4444)'}} />
                <div className="flex justify-between text-[9px] text-[#8A9EB8]">
                  <span>Safe</span><span>Moderate</span><span>High</span><span>Critical</span>
                </div>
                <div className="pt-1 border-t border-[#1A2C46] space-y-1 text-[10px]">
                  <div className="flex items-center gap-2 text-red-300">
                    <span className="w-5 h-5 rounded-full bg-red-500/20 border-2 border-red-300 flex items-center justify-center text-red-200 text-[11px] font-black">+</span>
                    Hospital / Medical
                  </div>
                  <div className="flex items-center gap-2 text-green-300">
                    <span className="w-5 h-5 rounded-full bg-green-500/20 border-2 border-green-300 flex items-center justify-center">
                      <Shield size={9} className="text-green-200" />
                    </span>
                    Shelter / Evac Hub
                  </div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 border-2 border-amber-300 flex items-center justify-center text-amber-200 text-[10px]">⚡</span>
                    Critical Infrastructure
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Selected Highlight Badge on Map */}
          {selectedCell && (
            <div className="absolute top-4 left-4 bg-[#081220]/95 backdrop-blur-md border border-blue-500/50 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3">
              <div className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: currentRiskColor }} />
              <div>
                <div className="text-xs text-[#8A9EB8]">Selected Focus:</div>
                <div className="text-sm font-bold text-white">{selectedCell.location_name}</div>
              </div>
              <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full border', RISK_BG_CLASSES[selectedCell.risk_level])}>
                {selectedCell.risk_level} • {selectedCell.flood_probability_percent}%
              </span>
            </div>
          )}
        </div>

        {/* ─── BOTTOM PANEL: Beautified Operations Center Side-Nav Rail & Workspace ─── */}
        <div className="bg-[#081220] border border-[#1A2C46] rounded-xl p-4 flex gap-4 min-h-[370px] shrink-0 shadow-2xl relative overflow-hidden">
          {/* Subtle Background Atmosphere Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-32 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

          {/* Left Navigation Rail */}
          <div className="w-64 shrink-0 flex flex-col justify-between border-r border-[#1A2C46]/80 pr-4">
            <div className="space-y-3">
              {/* Header Title */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Shield size={15} className="text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Operations Center</span>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              </div>

              {/* Navigation Options */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setBottomSection('briefing')}
                  className={clsx(
                    'p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1 relative group select-none',
                    bottomSection === 'briefing'
                      ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_18px_rgba(59,130,246,0.35)]'
                      : 'bg-[#0D1B2E] border-[#1A2C46] text-[#8A9EB8] hover:text-white hover:bg-[#132742] hover:border-blue-500/40'
                  )}
                >
                  <div className="flex items-center gap-2.5 font-bold text-sm">
                    <Sparkles size={16} className={bottomSection === 'briefing' ? 'text-cyan-200' : 'text-blue-400'} />
                    <span>Mitigation Briefing</span>
                  </div>
                  <span className={clsx('text-xs pl-0.5', bottomSection === 'briefing' ? 'text-blue-100' : 'text-[#5C85C5]')}>
                    AI Protocols & Safety Directives
                  </span>
                </button>

                <button
                  onClick={() => setBottomSection('priority')}
                  className={clsx(
                    'p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1 relative group select-none',
                    bottomSection === 'priority'
                      ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_18px_rgba(59,130,246,0.35)]'
                      : 'bg-[#0D1B2E] border-[#1A2C46] text-[#8A9EB8] hover:text-white hover:bg-[#132742] hover:border-red-500/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-bold text-sm">
                      <Crosshair size={16} className={bottomSection === 'priority' ? 'text-cyan-200' : 'text-red-400'} />
                      <span>Priority Locations</span>
                    </div>
                    <span className={clsx(
                      'text-xs font-mono px-2 py-0.5 rounded-full font-bold transition-transform',
                      bottomSection === 'priority'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    )}>
                      {priorities.length}
                    </span>
                  </div>
                  <span className={clsx('text-xs pl-0.5', bottomSection === 'priority' ? 'text-blue-100' : 'text-[#5C85C5]')}>
                    Ranked Emergency Targets
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Situational Metric Pill */}
            <div className="bg-[#050B14] border border-[#1A2C46] rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#8A9EB8]">
                <span>Forecast Step</span>
                <span className="font-mono font-bold text-cyan-400">{activeTimelineStep.label}</span>
              </div>
              <div className="flex items-center justify-between text-[#8A9EB8]">
                <span>Peak Tide</span>
                <span className="font-mono font-bold text-white">{activeTimelineStep.tideLevel}m</span>
              </div>
              <div className="flex items-center justify-between text-[#8A9EB8]">
                <span>Critical Hazards</span>
                <span className="font-mono font-bold text-red-400">{activeCriticalCount} Sectors</span>
              </div>
            </div>
          </div>

          {/* Full Width Active Workspace Content Pane */}
          <div className="flex-1 min-w-0">
            {bottomSection === 'briefing' ? (
              <BriefingCard
                timelineStep={activeTimelineStep}
                criticalCount={activeCriticalCount}
                highRiskCount={activeHighRiskCount}
                totalSectors={gridData?.total_cells ?? 0}
                maxProbability={gridData?.max_probability ?? 0.88}
                selectedCell={selectedCell}
              />
            ) : (
              <div className="h-full flex flex-col p-1">
                {/* Priority Locations Header */}
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#1A2C46]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400">
                      <Crosshair size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                        Emergency Priority Sectors
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          {priorities.length} High-Risk Zones
                        </span>
                      </h3>
                      <p className="text-xs text-[#8A9EB8]">
                        Click any priority sector card below to lock radar targeting on the Sulawesi map.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 font-mono font-bold flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    {activeCriticalCount} Critical Inundations
                  </span>
                </div>

                {/* Priority Sectors Grid */}
                <div className="grid grid-cols-2 gap-2.5 overflow-y-auto flex-1 pr-1">
                  {priorities.map(p => {
                    const isSelected = selectedCell?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => selectPriority(p)}
                        className={clsx(
                          'p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none relative overflow-hidden group',
                          isSelected
                            ? 'bg-blue-600/25 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-blue-400'
                            : 'bg-[#0D1B2E] border-[#1A2C46] hover:bg-[#132742] hover:border-blue-500/40 text-[#B4C6DF]'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={clsx(
                              'w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 shadow-sm',
                              isSelected
                                ? 'bg-blue-500 text-white font-black'
                                : p.rank === 1
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : 'bg-[#050B14] text-amber-400 border border-[#1A2C46]'
                            )}>
                              #{p.rank}
                            </span>
                            <div>
                              <div className="font-bold text-white text-sm flex items-center gap-2">
                                <span>{p.id}</span>
                                {isSelected ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-black tracking-wide flex items-center gap-1 shadow-sm">
                                    <Target size={11} /> TARGET LOCKED
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-[#5C85C5]">
                                    {p.lat.toFixed(2)}°, {p.lon.toFixed(2)}°
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#8A9EB8] mt-0.5 leading-snug">{p.reason}</div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={clsx(
                              'font-mono font-bold text-base',
                              p.risk_level === 'Critical' ? 'text-red-400' : 'text-orange-400'
                            )}>
                              {p.flood_probability_percent}%
                            </span>
                            <div className="text-[10px] text-[#5C85C5] uppercase font-bold tracking-wider">{p.risk_level}</div>
                          </div>
                        </div>

                        {/* Probability Progress Bar */}
                        <div className="mt-3 w-full bg-[#050B14] rounded-full h-1.5 overflow-hidden border border-[#1A2C46]/60">
                          <div
                            className={clsx(
                              'h-full rounded-full transition-all duration-500',
                              p.risk_level === 'Critical' ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                            )}
                            style={{ width: `${p.flood_probability_percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Digital Twin Inspector ─── */}
      <div className="w-[430px] bg-[#081220] border border-[#1A2C46] rounded-xl flex flex-col shrink-0 shadow-2xl overflow-hidden">
        {/* Panel Header & Navigation Tabs */}
        <div className="p-3.5 border-b border-[#1A2C46] flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-blue-400" />
              <h2 className="text-sm font-bold text-white">Digital Twin Inspector</h2>
            </div>
            <div className={clsx(
              'flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full border font-semibold',
              apiOnline
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                : 'text-red-400 bg-red-500/10 border-red-500/30'
            )}>
              <span className={clsx('w-1.5 h-1.5 rounded-full', apiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
              {apiOnline ? 'AI MODEL ONLINE' : 'AI OFFLINE'}
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="grid grid-cols-4 gap-1 bg-[#050B14] p-1 rounded-lg border border-[#1A2C46] text-xs">
            <button
              onClick={() => setRightTab('details')}
              className={clsx(
                'py-1.5 rounded-md font-medium text-center transition-all',
                rightTab === 'details' ? 'bg-blue-600 text-white font-bold shadow' : 'text-[#8A9EB8] hover:text-white'
              )}
            >
              Location
            </button>
            <button
              onClick={() => setRightTab('shap')}
              className={clsx(
                'py-1.5 rounded-md font-medium text-center transition-all flex items-center justify-center gap-1 text-[11px]',
                rightTab === 'shap' ? 'bg-blue-600 text-white font-bold shadow' : 'text-[#8A9EB8] hover:text-white'
              )}
            >
              <Sparkles size={12} className="text-cyan-300" />
              AI Advisory
            </button>
            <button
              onClick={() => setRightTab('whatif')}
              className={clsx(
                'py-1.5 rounded-md font-medium text-center transition-all',
                rightTab === 'whatif' ? 'bg-blue-600 text-white font-bold shadow' : 'text-[#8A9EB8] hover:text-white'
              )}
            >
              What-If
            </button>
            <button
              onClick={() => setRightTab('performance')}
              className={clsx(
                'py-1.5 rounded-md font-medium text-center transition-all',
                rightTab === 'performance' ? 'bg-blue-600 text-white font-bold shadow' : 'text-[#8A9EB8] hover:text-white'
              )}
            >
              Metrics
            </button>
          </div>
        </div>

        {/* Panel Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: LOCATION DETAILS */}
          {rightTab === 'details' && selectedCell && (
            <div className="space-y-4">
              {/* Risk Gauge Header */}
              <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-4 flex items-center gap-4">
                {/* SVG Circular Probability Gauge */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#1A2C46" strokeWidth="7" />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      fill="none"
                      stroke={currentRiskColor}
                      strokeWidth="7"
                      strokeDasharray={circumference}
                      strokeDashoffset={riskDashOffset}
                      className="transition-all duration-700 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold font-mono" style={{ color: currentRiskColor }}>
                      {selectedCell.flood_probability_percent}%
                    </span>
                    <span className="text-[9px] text-[#8A9EB8] uppercase tracking-wider font-semibold">Flood Risk</span>
                  </div>
                </div>

                {/* Status & Event info */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#5C85C5] font-bold">{selectedCell.id}</span>
                    <span className={clsx('text-xs font-bold px-2.5 py-0.5 rounded-full border', RISK_BG_CLASSES[selectedCell.risk_level])}>
                      {selectedCell.risk_level}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{selectedCell.location_name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 rounded-lg w-fit">
                    <Compass size={13} className="text-purple-400" />
                    <span>Zone: {selectedCell.residing_zone_name || 'Maros Coastal Defense Zone'} ({selectedCell.residing_zone_id || 'ZONE-01'})</span>
                  </div>
                  <div className="text-xs text-[#8A9EB8] flex items-center gap-1.5">
                    <Clock size={13} className="text-cyan-400" />
                    Event Date: <span className="text-white font-mono">{selectedCell.event_id ?? 'Historical Set'}</span>
                  </div>
                </div>
              </div>

              {/* Hydro-Meteorological Features */}
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                  <Droplets size={15} className="text-blue-400" />
                  Hydro-Meteorological Features (Actual Observation)
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-3">
                    <span className="text-xs text-[#8A9EB8]">1-Day Rainfall (mm)</span>
                    <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">{selectedCell.precip_1d.toFixed(1)} mm</div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-3">
                    <span className="text-xs text-[#8A9EB8]">3-Day Cumulative (mm)</span>
                    <div className="text-base font-bold font-mono text-blue-400 mt-0.5">{selectedCell.precip_3d.toFixed(1)} mm</div>
                  </div>
                </div>
                <div className="mt-2.5">
                  <TippingPointCard cell={selectedCell} />
                </div>
              </div>

              {/* Topographical & Catchment Characteristics */}
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                  <Mountain size={15} className="text-amber-400" />
                  Topography & Catchment Parameters
                </h4>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-3">
                    <div className="text-xs text-[#8A9EB8]">Elevation (DEM)</div>
                    <div className="text-sm font-bold text-white mt-0.5">{selectedCell.elevation} m</div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-3">
                    <div className="text-xs text-[#8A9EB8]">Terrain Slope</div>
                    <div className="text-sm font-bold text-white mt-0.5">{selectedCell.slope.toFixed(1)}°</div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-3">
                    <div className="text-xs text-[#8A9EB8]">Topographic Wetness (TWI)</div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">{selectedCell.TWI.toFixed(2)}</div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-3">
                    <div className="text-xs text-[#8A9EB8]">Upstream Area (log)</div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">{selectedCell.upstream_area_log.toFixed(2)}</div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-3 col-span-2">
                    <div className="text-xs text-[#8A9EB8]">Coordinates</div>
                    <div className="text-xs font-mono text-[#5C85C5] font-bold mt-0.5">{selectedCell.lat.toFixed(3)}°, {selectedCell.lon.toFixed(3)}°</div>
                  </div>
                </div>
              </div>

              {/* Action Button to SHAP / LLM Advisory */}
              <button
                onClick={() => setRightTab('shap')}
                className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs"
              >
                <Sparkles size={15} className="text-cyan-400" />
                View AI Flood Advisory & Notice &rarr;
              </button>
            </div>
          )}

          {/* TAB 2: AI ADVISORY & LLM SHAP EXPLANATION */}
          {rightTab === 'shap' && (
            <div className="space-y-4">
              {selectedCell && (
                <div className="flex items-center justify-between pb-1 border-b border-[#1A2C46]/60">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/30">
                      Sector {selectedCell.id}
                    </span>
                    <span className="text-xs text-[#8A9EB8] font-mono">
                      {selectedCell.lat.toFixed(3)}°, {selectedCell.lon.toFixed(3)}°
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (!selectedCell) return;
                      setIsLoadingShap(true);
                      explainFlood({
                        lon: selectedCell.lon,
                        lat: selectedCell.lat,
                        precip_1d: selectedCell.precip_1d,
                        precip_3d: selectedCell.precip_3d,
                        landcover: selectedCell.landcover,
                        elevation: selectedCell.elevation,
                        slope: selectedCell.slope,
                        TWI: selectedCell.TWI,
                        upstream_area_log: selectedCell.upstream_area_log,
                        aspect_sin: selectedCell.aspect_sin,
                        aspect_cos: selectedCell.aspect_cos,
                      })
                        .then(data => {
                          setShapData(data);
                          setIsLoadingShap(false);
                        })
                        .catch(() => setIsLoadingShap(false));
                    }}
                    title="Regenerate Advisory"
                    className="p-1.5 rounded-lg bg-[#0D1B2E] hover:bg-[#132742] border border-[#1A2C46] text-[#8A9EB8] hover:text-white transition flex items-center gap-1.5 text-xs"
                  >
                    <RefreshCw size={13} className={isLoadingShap ? 'animate-spin text-cyan-400' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>
              )}

              {!selectedCell ? (
                <div className="p-8 text-center text-[#8A9EB8] text-xs bg-[#0D1B2E] border border-[#1A2C46] rounded-xl space-y-3">
                  <MapPin size={24} className="mx-auto text-blue-400" />
                  <p className="text-sm font-semibold text-white">No Sector Selected</p>
                  <p className="text-xs text-[#8A9EB8]">Click any observation point on the map or select an Emergency Priority Sector below.</p>
                  {gridData && gridData.cells.length > 0 && (
                    <button
                      onClick={() => setSelectedCell(gridData.cells[0])}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
                    >
                      Inspect Top Hazard Sector ({gridData.cells[0].id})
                    </button>
                  )}
                </div>
              ) : isLoadingShap ? (
                <div className="p-8 text-center text-[#8A9EB8] text-xs flex flex-col items-center gap-3 bg-[#0D1B2E] border border-[#1A2C46] rounded-xl">
                  <RefreshCw size={24} className="animate-spin text-cyan-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Synthesizing Advisory...</p>
                    <p className="text-xs text-[#8A9EB8]">Processing SHAP feature margins & hydrological metrics for {selectedCell.id}</p>
                  </div>
                </div>
              ) : shapData ? (
                <div className="space-y-3.5">
                  {/* Headline Alert Banner */}
                  <div className={clsx(
                    'p-4 rounded-xl border space-y-2 shadow-lg relative overflow-hidden',
                    RISK_BG_CLASSES[shapData.risk_level] || 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  )}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded bg-black/50 border border-current font-mono">
                        {shapData.risk_level.toUpperCase()} RISK
                      </span>
                      <span className="text-xs font-mono font-bold">
                        Risk Probability: {shapData.flood_probability_percent}%
                      </span>
                    </div>
                    <h4 className="text-sm font-bold leading-snug">
                      {shapData.llm_explanation?.headline || `🚨 ${shapData.risk_level.toUpperCase()} FLOOD ALERT: High Inundation Susceptibility`}
                    </h4>
                  </div>

                  {/* Simple Language Notice */}
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-4 space-y-2 shadow-md">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <FileText size={15} className="text-blue-400" />
                      Plain Language Situation Notice
                    </div>
                    <p className="text-xs text-[#CBD5E1] leading-relaxed font-sans">
                      {shapData.llm_explanation?.simple_notice ||
                        `This sector (${selectedCell.id}) is experiencing ${shapData.risk_level.toLowerCase()} flood risk (${shapData.flood_probability_percent}%) due to 3-day rainfall accumulation of ${selectedCell.precip_3d.toFixed(1)}mm and local elevation of ${selectedCell.elevation}m.`}
                    </p>
                  </div>

                  {/* Key Factors Tags */}
                  {shapData.llm_explanation?.key_factors && shapData.llm_explanation.key_factors.length > 0 && (
                    <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-3.5 space-y-2">
                      <span className="text-xs font-bold text-[#8A9EB8] uppercase tracking-wider">Primary Risk Drivers</span>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {shapData.llm_explanation.key_factors.map((kf, idx) => (
                          <span key={idx} className="text-xs px-3 py-1 rounded-lg bg-blue-500/15 text-cyan-300 border border-blue-500/30 font-medium">
                            {kf}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-4 space-y-2.5 shadow-md">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 size={16} />
                      Recommended Response Actions
                    </div>
                    <ul className="space-y-2 text-xs text-[#CBD5E1]">
                      {(shapData.llm_explanation?.recommended_actions && shapData.llm_explanation.recommended_actions.length > 0
                        ? shapData.llm_explanation.recommended_actions
                        : [
                            'Prepare emergency response teams for deployment to low-elevation areas.',
                            'Clear local drainage bottlenecks and inspect storm channels.',
                            'Advise residents in ground-floor structures to prepare Go-Bags.',
                          ]
                      ).map((act, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 bg-[#081220] p-2.5 rounded-lg border border-[#1A2C46]">
                          <span className="text-emerald-400 font-bold text-sm">•</span>
                          <span className="leading-snug">{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Collapsible Technical SHAP Breakdown */}
                  <div className="pt-2">
                    <button
                      onClick={() => setShowTechShap(!showTechShap)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-[#081220] hover:bg-[#0D1B2E] border border-[#1A2C46] rounded-lg text-xs text-[#8A9EB8] hover:text-white transition"
                    >
                      <span className="font-mono text-[11px]">Technical SHAP Feature Attributions</span>
                      {showTechShap ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showTechShap && (
                      <div className="space-y-3 pt-3">
                        <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-[#8A9EB8]">Baseline Margin:</span>
                            <div className="font-mono font-bold text-white">{shapData.base_value}</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#8A9EB8]">Output Margin:</span>
                            <div className="font-mono font-bold text-cyan-400">{shapData.output_margin}</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#8A9EB8]">Predicted Probability:</span>
                            <div className="font-mono font-bold text-red-400">{shapData.flood_probability_percent}%</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {shapData.contributions.map(c => {
                            const isRiskIncrease = c.direction === 'increases_risk';
                            return (
                              <div key={c.feature} className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-2.5 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-white flex items-center gap-1.5">
                                    {isRiskIncrease ? (
                                      <ArrowUpRight size={13} className="text-red-400" />
                                    ) : (
                                      <ArrowDownRight size={13} className="text-emerald-400" />
                                    )}
                                    {c.label}
                                  </span>
                                  <span className={clsx('font-mono font-bold text-xs', isRiskIncrease ? 'text-red-400' : 'text-emerald-400')}>
                                    {c.shap_value > 0 ? `+${c.shap_value}` : c.shap_value}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-[#050B14] rounded-full overflow-hidden">
                                    <div
                                      className={clsx('h-full rounded-full', isRiskIncrease ? 'bg-red-500' : 'bg-emerald-500')}
                                      style={{ width: `${Math.min(c.percentage_impact * 2, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-[#8A9EB8] font-mono">{c.percentage_impact}% impact</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#8A9EB8] p-4 text-center">
                  Select a cell on the map to generate its AI flood advisory.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WHAT-IF SIMULATION (PHYSICALLY MONOTONIC & SOUND) */}
          {rightTab === 'whatif' && selectedCell && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Sliders size={14} className="text-blue-400" />
                  Hydrological What-If Simulator
                </h3>
                <p className="text-[10px] text-[#8A9EB8]">
                  Simulate precipitation surge or flood wall mitigation on <strong className="text-white font-mono">{selectedCell.id}</strong>
                </p>
              </div>

              {/* Sliders */}
              <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-xl p-3.5 space-y-4">
                {/* 1-Day Rain Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-white">1-Day Rainfall (mm)</span>
                    <span className="font-mono text-cyan-400 font-bold">{simRain1d.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="1"
                    value={simRain1d}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setSimRain1d(val);
                      handleRunSimulation(val, simRain3d, simElevAdj);
                    }}
                    className="w-full h-1.5 bg-[#1A2C46] rounded-full appearance-none accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#5C85C5] mt-1">
                    <span>0 mm (Dry)</span>
                    <span>Baseline: {selectedCell.precip_1d.toFixed(1)}mm</span>
                    <span>200 mm</span>
                  </div>
                </div>

                {/* 3-Day Rain Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-white">3-Day Cumulative Rainfall (mm)</span>
                    <span className="font-mono text-blue-400 font-bold">{simRain3d.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="400"
                    step="2"
                    value={simRain3d}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setSimRain3d(val);
                      handleRunSimulation(simRain1d, val, simElevAdj);
                    }}
                    className="w-full h-1.5 bg-[#1A2C46] rounded-full appearance-none accent-blue-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#5C85C5] mt-1">
                    <span>0 mm (Dry)</span>
                    <span>Baseline: {selectedCell.precip_3d.toFixed(1)}mm</span>
                    <span>400 mm</span>
                  </div>
                </div>

                {/* Levee / Elevation Adjustment Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-white">Levee / Terrain Elevation Delta</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {simElevAdj > 0 ? `+${simElevAdj.toFixed(1)}m` : `${simElevAdj.toFixed(1)}m`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="10"
                    step="0.5"
                    value={simElevAdj}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setSimElevAdj(val);
                      handleRunSimulation(simRain1d, simRain3d, val);
                    }}
                    className="w-full h-1.5 bg-[#1A2C46] rounded-full appearance-none accent-emerald-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#5C85C5] mt-1">
                    <span>-5m (Sea Rise)</span>
                    <span>0m (Terrain)</span>
                    <span>+10m (Levee Wall)</span>
                  </div>
                </div>

                {/* Preset quick actions */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setSimRain1d(0);
                      setSimRain3d(0);
                      handleRunSimulation(0, 0, simElevAdj);
                    }}
                    className="text-[10px] bg-[#142842] hover:bg-[#1b3558] text-emerald-300 py-1.5 rounded border border-[#21426d] font-medium"
                  >
                    ☀️ 0mm (Clear/Dry)
                  </button>
                  <button
                    onClick={() => {
                      const r1 = selectedCell.precip_1d + 35;
                      const r3 = selectedCell.precip_3d + 75;
                      setSimRain1d(r1);
                      setSimRain3d(r3);
                      handleRunSimulation(r1, r3, simElevAdj);
                    }}
                    className="text-[10px] bg-[#142842] hover:bg-[#1b3558] text-cyan-300 py-1.5 rounded border border-[#21426d] font-medium"
                  >
                    ⛈️ +75mm Monsoon
                  </button>
                  <button
                    onClick={() => {
                      const r1 = 120;
                      const r3 = 280;
                      setSimRain1d(r1);
                      setSimRain3d(r3);
                      handleRunSimulation(r1, r3, simElevAdj);
                    }}
                    className="text-[10px] bg-[#142842] hover:bg-[#1b3558] text-red-300 py-1.5 rounded border border-[#21426d] font-medium"
                  >
                    🌀 280mm Typhoon
                  </button>
                </div>

                <button
                  onClick={() => handleRunSimulation()}
                  disabled={isSimulating}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition flex items-center justify-center gap-2 text-xs shadow-lg"
                >
                  <RefreshCw size={14} className={isSimulating ? 'animate-spin' : ''} />
                  {isSimulating ? 'Evaluating Hydrological Response...' : 'Recalculate Scenario'}
                </button>
              </div>

              {/* Simulation Result Comparison */}
              {simResult && (
                <div className="bg-[#0D1B2E] border border-blue-500/40 rounded-xl p-3.5 space-y-3 shadow-lg">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-blue-400" />
                    Hydrological Impact Comparison
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-[#081220] p-2.5 rounded-lg border border-[#1A2C46]">
                      <span className="text-[10px] text-[#8A9EB8]">Baseline Probability</span>
                      <div className="text-base font-mono font-bold text-white">
                        {selectedCell.flood_probability_percent}%
                      </div>
                      <span className="text-[9px] text-[#5C85C5]">{selectedCell.risk_level}</span>
                    </div>

                    <div className="bg-[#081220] p-2.5 rounded-lg border border-[#1A2C46]">
                      <span className="text-[10px] text-[#8A9EB8]">Simulated Scenario</span>
                      <div className={clsx('text-base font-mono font-bold', RISK_COLORS[simResult.scenarioRisk] ? `text-[${RISK_COLORS[simResult.scenarioRisk]}]` : 'text-red-400')}>
                        {simResult.scenarioProb}%
                      </div>
                      <span className="text-[9px] font-bold" style={{ color: RISK_COLORS[simResult.scenarioRisk] }}>
                        {simResult.scenarioRisk}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-[#8A9EB8]">Net Risk Delta:</span>
                    <span className={clsx('font-mono font-bold', simResult.deltaPercent > 0 ? 'text-red-400' : simResult.deltaPercent < 0 ? 'text-emerald-400' : 'text-white')}>
                      {simResult.deltaPercent > 0 ? `+${simResult.deltaPercent} percentage points` : `${simResult.deltaPercent} pp`}
                    </span>
                  </div>

                  <p className="text-[10px] text-[#B4C6DF] italic bg-[#081220] p-2 rounded border border-[#1A2C46] leading-tight">
                    {simResult.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MODEL PERFORMANCE & SCIENTIFIC HONESTY */}
          {rightTab === 'performance' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <BarChart3 size={14} className="text-blue-400" />
                  Model Performance & Benchmark
                </h3>
                <p className="text-[10px] text-[#8A9EB8]">
                  Evaluation on spatial-block held-out test split (Sulawesi, Indonesia)
                </p>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-3">
                  <span className="text-[10px] text-[#8A9EB8]">Test ROC-AUC</span>
                  <div className="text-lg font-mono font-black text-emerald-400">
                    {metrics?.metrics?.test?.roc_auc?.toFixed(4) ?? '0.9303'}
                  </div>
                  <span className="text-[9px] text-[#5C85C5]">Discriminative power</span>
                </div>
                <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-3">
                  <span className="text-[10px] text-[#8A9EB8]">Test PR-AUC</span>
                  <div className="text-lg font-mono font-black text-cyan-400">
                    {metrics?.metrics?.test?.pr_auc?.toFixed(4) ?? '0.4509'}
                  </div>
                  <span className="text-[9px] text-[#5C85C5]">Precision-recall under imbalance</span>
                </div>
                <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-3">
                  <span className="text-[10px] text-[#8A9EB8]">Test Recall (@0.5)</span>
                  <div className="text-lg font-mono font-black text-white">
                    {metrics?.metrics?.test?.recall?.toFixed(4) ?? '0.6725'}
                  </div>
                  <span className="text-[9px] text-[#5C85C5]">Hazard capture rate</span>
                </div>
                <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-3">
                  <span className="text-[10px] text-[#8A9EB8]">Dataset Split</span>
                  <div className="text-lg font-mono font-black text-white">400,000</div>
                  <span className="text-[9px] text-[#5C85C5]">MODIS pixel observations</span>
                </div>
              </div>

              {/* Global Feature Importance */}
              <div>
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <Activity size={13} className="text-blue-400" /> Global Feature Importance (Gain)
                </h4>
                <div className="space-y-1.5">
                  {[
                    { feature: 'Elevation (DEM)', value: 0.284 },
                    { feature: '3-Day Precipitation', value: 0.221 },
                    { feature: 'Topographic Wetness (TWI)', value: 0.185 },
                    { feature: '1-Day Precipitation', value: 0.142 },
                    { feature: 'Upstream Catchment Area', value: 0.098 },
                    { feature: 'Terrain Slope', value: 0.070 },
                  ].map(f => (
                    <div key={f.feature} className="bg-[#0D1B2E] p-2 rounded border border-[#1A2C46] text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-white font-medium">{f.feature}</span>
                        <span className="font-mono text-cyan-400 font-bold">{(f.value * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-[#050B14] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${f.value * 100 * 2.5}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}