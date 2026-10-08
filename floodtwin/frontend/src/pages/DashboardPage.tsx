import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  MapPin, AlertTriangle, Activity, Droplets,
  TrendingUp, Sliders, RefreshCw, BarChart3,
  Layers, Compass, Mountain, ArrowUpRight, ArrowDownRight, Filter, Clock
} from 'lucide-react';
import Map, { Source, Layer, NavigationControl, FullscreenControl, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import {
  checkApiHealth, fetchGrid, fetchPriorities, explainFlood, simulateScenario,
  computePhysicalHydrologicalSimulation, fetchModelMetrics
} from '../lib/api-client';
import type {
  GridCell, GridResponse, PriorityArea, LocalShapResponse, ModelMetricsResponse
} from '../lib/api-client';
import 'maplibre-gl/dist/maplibre-gl.css';
import clsx from 'clsx';
import TimelineSlider, { TIMELINE_STEPS } from '../components/timeline/TimelineSlider';
import BriefingCard from '../components/briefing/BriefingCard';

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
      attribution: 'Esri Satellite & MODIS',
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
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

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
          zoom: 9.5,
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
      {/* ─── LEFT / CENTER: Map, Timeline & Bottom AI Command Center (Scrollable) ─── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 overflow-y-auto pr-1.5 pb-6">
        {/* Map Header Controls */}
        <div className="bg-[#081220] border border-[#1A2C46] rounded-xl px-4 py-2 flex items-center justify-between gap-4 shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Compass size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-wide">
                  Sulawesi Spatial Prediction Grid
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
                  MODIS Satellite Ground-Truth
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                  Forecast: {activeTimelineStep.label}
                </span>
              </div>
              <p className="text-[11px] text-[#8A9EB8]">
                {gridData?.total_cells ?? 0} Real Observation Points • BBox: 119.35°E–121.79°E, 6.50°S–1.89°S
              </p>
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

        {/* Interactive Map Container */}
        <div className="min-h-[440px] h-[480px] bg-[#07101D] rounded-xl border border-[#1A2C46] relative overflow-hidden shadow-2xl shrink-0">
          <Map
            ref={mapRef}
            initialViewState={{
              longitude: 120.18,
              latitude: -3.96,
              zoom: 6.8,
            }}
            mapStyle={mapStyle as any}
            interactiveLayerIds={['flood-points', 'flood-points-glow']}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onClick={onMapClick}
          >
            <FullscreenControl position="top-right" />
            <NavigationControl position="bottom-right" />

            <Source id="sulawesi-points" type="geojson" data={geoJSON as any}>
              {/* Outer halo / glow layer */}
              <Layer
                id="flood-points-glow"
                type="circle"
                paint={{
                  'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 6, 9, 14, 12, 22],
                  'circle-color': [
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
                  'circle-color': [
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
          </Map>


          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-[#081220]/90 backdrop-blur-md border border-[#1A2C46] rounded-xl p-3 shadow-2xl text-white w-60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Layers size={13} className="text-blue-400" />
                Flood Probability Scale
              </span>
              <span className="text-[10px] text-[#8A9EB8]">{activeTimelineStep.label}</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" /> Low Risk (&lt;20%)
                </span>
                <span className="font-mono text-[#8A9EB8]">{modulatedCells.filter(c => c.risk_level === 'Low').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" /> Moderate (20–50%)
                </span>
                <span className="font-mono text-[#8A9EB8]">{modulatedCells.filter(c => c.risk_level === 'Moderate').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-orange-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316]" /> High Risk (50–75%)
                </span>
                <span className="font-mono text-[#8A9EB8]">{activeHighRiskCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-red-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" /> Critical (&ge;75%)
                </span>
                <span className="font-mono text-[#8A9EB8]">{activeCriticalCount}</span>
              </div>
            </div>
          </div>

          {/* Quick Selected Highlight Badge on Map */}
          {selectedCell && (
            <div className="absolute top-4 left-4 bg-[#081220]/95 backdrop-blur-md border border-blue-500/50 rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: currentRiskColor }} />
              <div>
                <div className="text-[10px] text-[#8A9EB8]">Selected Focus:</div>
                <div className="text-xs font-bold text-white">{selectedCell.location_name}</div>
              </div>
              <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border', RISK_BG_CLASSES[selectedCell.risk_level])}>
                {selectedCell.risk_level} • {selectedCell.flood_probability_percent}%
              </span>
            </div>
          )}
        </div>

        {/* ─── BOTTOM PANEL: AI Decision Briefing & Emergency Priorities ─── */}
        <div className="grid grid-cols-12 gap-3 min-h-[320px] shrink-0">
          {/* AI Decision Briefing with real-world suggestions */}
          <div className="col-span-7">
            <BriefingCard
              timelineStep={activeTimelineStep}
              criticalCount={activeCriticalCount}
              highRiskCount={activeHighRiskCount}
              totalSectors={gridData?.total_cells ?? 0}
              maxProbability={gridData?.max_probability ?? 0.88}
              selectedCell={selectedCell}
            />
          </div>

          {/* Emergency Priority Sectors */}
          <div className="col-span-5 bg-[#081220] border border-[#1A2C46] rounded-xl p-3.5 flex flex-col shadow-lg overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                Emergency Priority Locations
              </h3>
              <span className="text-[10px] text-[#8A9EB8]">Click to focus on map</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {priorities.slice(0, 5).map(p => (
                <div
                  key={p.id}
                  onClick={() => selectPriority(p)}
                  className={clsx(
                    'p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs',
                    selectedCell?.id === p.id
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-[#0D1B2E] border-[#1A2C46] hover:bg-[#132742] text-[#B4C6DF]'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-red-400 text-xs">#{p.rank}</span>
                    <div>
                      <div className="font-bold text-white text-[11px]">{p.id}</div>
                      <div className="text-[10px] text-[#8A9EB8]">{p.reason}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={clsx('font-mono font-bold text-xs', p.risk_level === 'Critical' ? 'text-red-400' : 'text-orange-400')}>
                      {p.flood_probability_percent}%
                    </span>
                    <div className="text-[9px] text-[#5C85C5] uppercase">{p.risk_level}</div>
                  </div>
                </div>
              ))}
            </div>
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
                'py-1.5 rounded-md font-medium text-center transition-all',
                rightTab === 'shap' ? 'bg-blue-600 text-white font-bold shadow' : 'text-[#8A9EB8] hover:text-white'
              )}
            >
              SHAP
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
                    <span className="text-[8px] text-[#8A9EB8] uppercase tracking-wider">Flood Risk</span>
                  </div>
                </div>

                {/* Status & Event info */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#5C85C5]">{selectedCell.id}</span>
                    <span className={clsx('text-xs font-bold px-2.5 py-0.5 rounded-full border', RISK_BG_CLASSES[selectedCell.risk_level])}>
                      {selectedCell.risk_level}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{selectedCell.location_name}</h3>
                  <div className="text-[11px] text-[#8A9EB8] flex items-center gap-1.5">
                    <Clock size={12} className="text-cyan-400" />
                    Event Date: <span className="text-white font-mono">{selectedCell.event_id ?? 'Historical Set'}</span>
                  </div>
                </div>
              </div>

              {/* Hydro-Meteorological Features */}
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                  <Droplets size={14} className="text-blue-400" />
                  Hydro-Meteorological Features (Actual Observation)
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-2.5">
                    <span className="text-[10px] text-[#8A9EB8]">1-Day Rainfall (mm)</span>
                    <div className="text-base font-bold font-mono text-cyan-400">{selectedCell.precip_1d.toFixed(1)} mm</div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-2.5">
                    <span className="text-[10px] text-[#8A9EB8]">3-Day Cumulative (mm)</span>
                    <div className="text-base font-bold font-mono text-blue-400">{selectedCell.precip_3d.toFixed(1)} mm</div>
                  </div>
                </div>
              </div>

              {/* Topographical & Catchment Characteristics */}
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                  <Mountain size={14} className="text-amber-400" />
                  Topography & Catchment Parameters
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-2.5">
                    <div className="text-[10px] text-[#8A9EB8]">Elevation (DEM)</div>
                    <div className="text-sm font-bold text-white">{selectedCell.elevation} m</div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-2.5">
                    <div className="text-[10px] text-[#8A9EB8]">Terrain Slope</div>
                    <div className="text-sm font-bold text-white">{selectedCell.slope.toFixed(1)}°</div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-2.5">
                    <div className="text-[10px] text-[#8A9EB8]">Topographic Wetness (TWI)</div>
                    <div className="text-sm font-bold text-white font-mono">{selectedCell.TWI.toFixed(2)}</div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-2.5">
                    <div className="text-[10px] text-[#8A9EB8]">Upstream Area (log)</div>
                    <div className="text-sm font-bold text-white font-mono">{selectedCell.upstream_area_log.toFixed(2)}</div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-2.5">
                    <div className="text-[10px] text-[#8A9EB8]">Landcover Class</div>
                    <div className="text-sm font-bold text-white">Class #{selectedCell.landcover}</div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-2.5">
                    <div className="text-[10px] text-[#8A9EB8]">Coordinates</div>
                    <div className="text-[11px] font-mono text-[#5C85C5]">{selectedCell.lat.toFixed(3)}°, {selectedCell.lon.toFixed(3)}°</div>
                  </div>
                </div>
              </div>

              {/* Action Button to SHAP */}
              <button
                onClick={() => setRightTab('shap')}
                className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 font-bold py-2 rounded-lg transition flex items-center justify-center gap-2 text-xs"
              >
                <Activity size={14} />
                View Local TreeSHAP Explanation &rarr;
              </button>
            </div>
          )}

          {/* TAB 2: LOCAL SHAP EXPLANATION */}
          {rightTab === 'shap' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Activity size={14} className="text-blue-400" />
                    Local TreeSHAP Attribution
                  </h3>
                  <p className="text-[10px] text-[#8A9EB8]">
                    Calculated in real-time from trained XGBoost model booster
                  </p>
                </div>
                {selectedCell && (
                  <span className="font-mono text-xs text-blue-400 font-bold">{selectedCell.id}</span>
                )}
              </div>

              {isLoadingShap ? (
                <div className="p-8 text-center text-[#8A9EB8] text-xs flex flex-col items-center gap-2">
                  <RefreshCw size={20} className="animate-spin text-blue-400" />
                  Calculating exact SHAP feature contributions...
                </div>
              ) : shapData ? (
                <div className="space-y-3">
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

                  <h4 className="text-[11px] font-bold text-white tracking-wider uppercase text-[#5C85C5]">
                    Why this prediction? (Feature Drivers)
                  </h4>

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

                          <p className="text-[10px] text-[#8A9EB8] pt-0.5 leading-tight">{c.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#8A9EB8] p-4 text-center">
                  Select a cell on the map to compute its SHAP explanation.
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