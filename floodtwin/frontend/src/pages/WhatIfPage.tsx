import { useState, useEffect } from 'react';
import {
  FlaskConical, RefreshCw, ArrowRight,
  TrendingUp, Mountain, Droplets,
  Sparkles, FileText, CheckCircle2
} from 'lucide-react';
import {
  fetchGrid, explainFlood, simulateScenario, computePhysicalHydrologicalSimulation,
  GridCell, LocalShapResponse
} from '../lib/api-client';
import clsx from 'clsx';

const RISK_COLORS: Record<string, string> = {
  Low: 'text-emerald-400',
  Moderate: 'text-amber-400',
  High: 'text-orange-400',
  Critical: 'text-red-400',
};

const RISK_BG: Record<string, string> = {
  Low: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
  Moderate: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
  High: 'bg-orange-500/20 border-orange-500/40 text-orange-400',
  Critical: 'bg-red-500/20 border-red-500/40 text-red-400',
};

export default function WhatIfPage() {
  const [sectors, setSectors] = useState<GridCell[]>([]);
  const [selectedSector, setSelectedSector] = useState<GridCell | null>(null);

  // Simulation inputs
  const [rain1d, setRain1d] = useState<number>(30);
  const [rain3d, setRain3d] = useState<number>(80);
  const [elevAdj, setElevAdj] = useState<number>(0);

  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<{
    scenarioProb: number;
    scenarioRisk: 'Low' | 'Moderate' | 'High' | 'Critical';
    baselineProb: number;
    baselineRisk: string;
    delta: number;
    explanation: string;
    shap?: LocalShapResponse;
  } | null>(null);

  useEffect(() => {
    fetchGrid(200)
      .then(data => {
        if (data.cells.length > 0) {
          setSectors(data.cells);
          setSelectedSector(data.cells[0]);
          setRain1d(data.cells[0].precip_1d);
          setRain3d(data.cells[0].precip_3d);
        }
      })
      .catch(console.error);
  }, []);

  const handleSelectSector = (sec: GridCell) => {
    setSelectedSector(sec);
    setRain1d(sec.precip_1d);
    setRain3d(sec.precip_3d);
    setElevAdj(0);
    setSimulationResult(null);
  };

  const handleRunSimulation = async (r1d = rain1d, r3d = rain3d, eAdj = elevAdj) => {
    if (!selectedSector) return;
    setIsCalculating(true);

    try {
      // First compute client-side physical hydrological simulation for instant monotonicity
      const clientRes = computePhysicalHydrologicalSimulation(
        selectedSector,
        r1d,
        r3d,
        eAdj
      );

      // Fetch SHAP for contextual explanation
      let shapRes: LocalShapResponse | undefined = undefined;
      try {
        shapRes = await explainFlood({
          lon: selectedSector.lon,
          lat: selectedSector.lat,
          precip_1d: r1d,
          precip_3d: r3d,
          landcover: selectedSector.landcover,
          elevation: Math.max(1, selectedSector.elevation + eAdj),
          slope: selectedSector.slope,
          TWI: selectedSector.TWI,
          upstream_area_log: selectedSector.upstream_area_log,
          aspect_sin: selectedSector.aspect_sin,
          aspect_cos: selectedSector.aspect_cos,
        });
      } catch {}

      // Try server simulation endpoint
      try {
        const serverRes = await simulateScenario({
          baseline_features: {
            lon: selectedSector.lon,
            lat: selectedSector.lat,
            precip_1d: selectedSector.precip_1d,
            precip_3d: selectedSector.precip_3d,
            landcover: selectedSector.landcover,
            elevation: selectedSector.elevation,
            slope: selectedSector.slope,
            TWI: selectedSector.TWI,
            upstream_area_log: selectedSector.upstream_area_log,
            aspect_sin: selectedSector.aspect_sin,
            aspect_cos: selectedSector.aspect_cos,
          },
          sim_precip_1d: r1d,
          sim_precip_3d: r3d,
          sim_elevation_adj: eAdj,
        });

        setSimulationResult({
          scenarioProb: serverRes.scenario_probability_percent,
          scenarioRisk: serverRes.scenario_risk_level,
          baselineProb: selectedSector.flood_probability_percent,
          baselineRisk: selectedSector.risk_level,
          delta: serverRes.delta_percentage_points,
          explanation: serverRes.explanation,
          shap: shapRes,
        });
      } catch {
        setSimulationResult({
          scenarioProb: clientRes.scenarioProb,
          scenarioRisk: clientRes.scenarioRisk,
          baselineProb: selectedSector.flood_probability_percent,
          baselineRisk: selectedSector.risk_level,
          delta: clientRes.deltaPercent,
          explanation: clientRes.explanation,
          shap: shapRes,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="w-full p-6 overflow-y-auto flex gap-6 bg-[#040B14]">
      {/* Controls Column */}
      <div className="w-96 shrink-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <FlaskConical size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">What-If Flood Simulator</h1>
            <p className="text-xs text-[#8A9EB8]">Hydrological Scenario Modeling on Real Sulawesi Sectors</p>
          </div>
        </div>

        <div className="bg-[#081220] border border-[#1A2C46] rounded-xl p-5 space-y-5 shadow-xl">
          {/* Sector Selector */}
          <div>
            <label className="text-xs font-semibold text-white block mb-1.5 flex items-center justify-between">
              <span>Select Target Sector:</span>
              <span className="text-[10px] text-blue-400">{sectors.length} sectors</span>
            </label>
            <select
              value={selectedSector?.id ?? ''}
              onChange={e => {
                const found = sectors.find(s => s.id === e.target.value);
                if (found) handleSelectSector(found);
              }}
              className="w-full bg-[#0D1B2E] border border-[#1A2C46] text-white text-xs rounded-lg p-2 focus:outline-none focus:border-blue-500 font-mono"
            >
              {sectors.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id} • Lat: {s.lat.toFixed(2)}°, Lon: {s.lon.toFixed(2)}° ({s.risk_level})
                </option>
              ))}
            </select>
          </div>

          {/* 1-Day Rain Slider */}
          <div>
            <div className="flex justify-between mb-1 text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Droplets size={13} className="text-cyan-400" /> 1-Day Storm Intensity
              </span>
              <span className="font-mono text-cyan-400 font-bold">{rain1d.toFixed(1)} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="250"
              step="1"
              value={rain1d}
              onChange={e => {
                const v = Number(e.target.value);
                setRain1d(v);
                handleRunSimulation(v, rain3d, elevAdj);
              }}
              className="w-full h-2 bg-[#1A2C46] rounded-full appearance-none accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#5C85C5] mt-1">
              <span>0 mm (Dry)</span>
              <span>250 mm</span>
            </div>
          </div>

          {/* 3-Day Rain Slider */}
          <div>
            <div className="flex justify-between mb-1 text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Droplets size={13} className="text-blue-400" /> 3-Day Monsoon Accumulation
              </span>
              <span className="font-mono text-blue-400 font-bold">{rain3d.toFixed(1)} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="2"
              value={rain3d}
              onChange={e => {
                const v = Number(e.target.value);
                setRain3d(v);
                handleRunSimulation(rain1d, v, elevAdj);
              }}
              className="w-full h-2 bg-[#1A2C46] rounded-full appearance-none accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#5C85C5] mt-1">
              <span>0 mm (Dry)</span>
              <span>500 mm</span>
            </div>
          </div>

          {/* Elevation modifier (Simulating sea level rise or levee elevation) */}
          <div>
            <div className="flex justify-between mb-1 text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Mountain size={13} className="text-amber-400" /> Elevation Adjustment (Levee / Sea Rise)
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {elevAdj >= 0 ? `+${elevAdj}` : elevAdj} m
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              value={elevAdj}
              onChange={e => {
                const v = Number(e.target.value);
                setElevAdj(v);
                handleRunSimulation(rain1d, rain3d, v);
              }}
              className="w-full h-2 bg-[#1A2C46] rounded-full appearance-none accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#5C85C5] mt-1">
              <span>-10m (Subsidence)</span>
              <span>+10m (Levee)</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-[#1A2C46] space-y-1.5">
            <span className="text-[10px] text-[#8A9EB8] uppercase tracking-wider font-semibold block">
              Simulation Presets:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  setRain1d(0);
                  setRain3d(0);
                  setElevAdj(0);
                  handleRunSimulation(0, 0, 0);
                }}
                className="text-[10px] bg-[#0D1B2E] hover:bg-[#142842] text-emerald-300 py-1.5 px-2 rounded-lg border border-[#1A2C46] text-center font-medium"
              >
                ☀️ 0mm Dry
              </button>
              <button
                onClick={() => {
                  setRain1d(75);
                  setRain3d(180);
                  setElevAdj(0);
                  handleRunSimulation(75, 180, 0);
                }}
                className="text-[10px] bg-[#0D1B2E] hover:bg-[#142842] text-cyan-300 py-1.5 px-2 rounded-lg border border-[#1A2C46] text-center font-medium"
              >
                ⛈ Monsoon
              </button>
              <button
                onClick={() => {
                  setRain1d(130);
                  setRain3d(320);
                  setElevAdj(-2);
                  handleRunSimulation(130, 320, -2);
                }}
                className="text-[10px] bg-[#0D1B2E] hover:bg-[#142842] text-red-300 py-1.5 px-2 rounded-lg border border-[#1A2C46] text-center font-medium"
              >
                🌊 Typhoon
              </button>
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={() => handleRunSimulation()}
            disabled={isCalculating || !selectedSector}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            <RefreshCw size={16} className={isCalculating ? 'animate-spin' : ''} />
            {isCalculating ? 'Computing Hydrological Physics...' : 'Run Scenario Simulation'}
          </button>
        </div>
      </div>

      {/* Results Column */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <TrendingUp size={22} className="text-blue-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Scenario Impact & Hydrological Response</h2>
            <p className="text-xs text-[#8A9EB8]">Predicted Probability Shift vs. Baseline Dataset Observation</p>
          </div>
        </div>

        {!simulationResult ? (
          <div className="bg-[#081220] border border-dashed border-[#1A2C46] rounded-xl p-16 text-center space-y-3">
            <FlaskConical size={36} className="text-[#3A5276] mx-auto" />
            <p className="text-white font-bold text-sm">Awaiting Simulation Parameters</p>
            <p className="text-[#8A9EB8] text-xs max-w-md mx-auto">
              Select a Sulawesi sector from the left panel, adjust precipitation or topographic modifiers, and click <strong>Run Scenario Simulation</strong> to evaluate the digital twin response.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Impact Banner */}
            <div className="bg-[#081220] border border-[#1A2C46] rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-[#5C85C5]">{selectedSector?.id}</span>
                  <h3 className="text-base font-bold text-white">{selectedSector?.location_name}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('px-3 py-1 rounded-full text-xs font-bold border', RISK_BG[simulationResult.baselineRisk])}>
                    Baseline: {simulationResult.baselineRisk}
                  </span>
                  <ArrowRight size={16} className="text-[#5C85C5]" />
                  <span className={clsx('px-3 py-1 rounded-full text-xs font-bold border', RISK_BG[simulationResult.scenarioRisk])}>
                    Scenario: {simulationResult.scenarioRisk}
                  </span>
                </div>
              </div>

              {/* Progress comparison */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#0D1B2E] p-3 rounded-xl border border-[#1A2C46]">
                  <span className="text-[10px] text-[#8A9EB8]">Baseline Flood Probability</span>
                  <div className="text-xl font-mono font-bold text-white mt-1">
                    {simulationResult.baselineProb}%
                  </div>
                </div>

                <div className="bg-[#0D1B2E] p-3 rounded-xl border border-[#1A2C46]">
                  <span className="text-[10px] text-[#8A9EB8]">Scenario Flood Probability</span>
                  <div className={clsx('text-xl font-mono font-bold mt-1', RISK_COLORS[simulationResult.scenarioRisk])}>
                    {simulationResult.scenarioProb}%
                  </div>
                </div>

                <div className="bg-[#0D1B2E] p-3 rounded-xl border border-[#1A2C46]">
                  <span className="text-[10px] text-[#8A9EB8]">Net Risk Shift</span>
                  <div className={clsx('text-xl font-mono font-bold mt-1', simulationResult.delta > 0 ? 'text-red-400' : simulationResult.delta < 0 ? 'text-emerald-400' : 'text-white')}>
                    {simulationResult.delta > 0 ? `+${simulationResult.delta} pp` : `${simulationResult.delta} pp`}
                  </div>
                </div>
              </div>

              <div className="bg-[#050B14] p-3 rounded-lg border border-[#1A2C46] text-xs text-[#B4C6DF]">
                <strong className="text-white">Hydrological Summary: </strong>
                {simulationResult.explanation}
              </div>
            </div>

            {/* Scenario SHAP & LLM Notice */}
            {simulationResult.shap && (
              <div className="bg-[#081220] border border-[#1A2C46] rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles size={14} className="text-cyan-400" />
                    Gemini AI Advisory & Notice
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-cyan-300 border border-blue-500/30 font-mono">
                    {simulationResult.shap.llm_explanation?.model_used || 'Gemini LLM'}
                  </span>
                </div>

                {simulationResult.shap.llm_explanation && (
                  <div className="space-y-3">
                    <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-3 space-y-1.5">
                      <h5 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <FileText size={13} />
                        {simulationResult.shap.llm_explanation.headline}
                      </h5>
                      <p className="text-xs text-[#C8D6E5] leading-relaxed">
                        {simulationResult.shap.llm_explanation.simple_notice}
                      </p>
                    </div>

                    {simulationResult.shap.llm_explanation.recommended_actions?.length > 0 && (
                      <div className="bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-3 space-y-1.5">
                        <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={13} />
                          Recommended Safety Actions
                        </div>
                        <ul className="text-xs text-[#C8D6E5] space-y-1">
                          {simulationResult.shap.llm_explanation.recommended_actions.map((act, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-emerald-400">•</span>
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
