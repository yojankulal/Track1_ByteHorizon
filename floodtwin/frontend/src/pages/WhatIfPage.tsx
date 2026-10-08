import React, { useState } from 'react';
import { FlaskConical, RefreshCw, Sliders, ArrowRight, AlertTriangle, TrendingUp } from 'lucide-react';

const BASE_ZONES = [
  { id: 'Z1', name: 'Bengre Sandpit',         baseRisk: 92, severity: 4 },
  { id: 'Z2', name: 'Panambur Port Area',     baseRisk: 86, severity: 4 },
  { id: 'Z3', name: 'Bunder (Old Port)',      baseRisk: 78, severity: 4 },
  { id: 'Z4', name: 'Ullal & Someshwara',    baseRisk: 65, severity: 3 },
  { id: 'Z5', name: 'Netravati River Banks',  baseRisk: 58, severity: 3 },
  { id: 'Z6', name: 'Surathkal Coastal Belt', baseRisk: 42, severity: 2 },
  { id: 'Z7', name: 'Kulai & Hosabettu',     baseRisk: 25, severity: 1 },
];

const severityLabel = ['', 'Minor', 'Moderate', 'Severe', 'Critical'];
const severityColor = ['', 'text-yellow-400', 'text-orange-400', 'text-red-400', 'text-fuchsia-400'];
const severityBg    = ['', 'bg-yellow-500/20 border-yellow-500/40', 'bg-orange-500/20 border-orange-500/40', 'bg-red-500/20 border-red-500/40', 'bg-fuchsia-600/20 border-fuchsia-500/40'];
const severityBar   = ['', 'bg-yellow-400', 'bg-orange-400', 'bg-red-400', 'bg-fuchsia-500'];

function calcNewRisk(base: number, rainfall: number, tide: number, seaWall: number): number {
  const delta = (rainfall - 50) * 0.18 + (tide - 1.5) * 8 - seaWall * 0.4;
  return Math.min(99, Math.max(5, Math.round(base + delta)));
}
function calcSeverity(risk: number) {
  if (risk >= 80) return 4;
  if (risk >= 60) return 3;
  if (risk >= 35) return 2;
  return 1;
}

export default function WhatIfPage() {
  const [rainfall, setRainfall] = useState(50);
  const [tide, setTide] = useState(1.5);
  const [seaWall, setSeaWall] = useState(50);
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<null | typeof BASE_ZONES>(null);

  const handleRecalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setResults(BASE_ZONES.map(z => ({
        ...z,
        newRisk: calcNewRisk(z.baseRisk, rainfall, tide, seaWall),
        newSeverity: calcSeverity(calcNewRisk(z.baseRisk, rainfall, tide, seaWall)),
      })) as any);
      setIsCalculating(false);
    }, 1200);
  };

  return (
    <div className="w-full p-6 overflow-y-auto flex gap-6">
      {/* Controls Panel */}
      <div className="w-80 shrink-0">
        <div className="flex items-center gap-3 mb-6">
          <FlaskConical size={22} className="text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">What-If Simulator</h1>
            <p className="text-xs text-[#8A9EB8]">Adjust parameters & recalculate</p>
          </div>
        </div>

        <div className="bg-[#0A1628] border border-[#1A2C46] rounded-xl p-5 space-y-6">
          {/* Rainfall Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-white flex items-center gap-2"><Sliders size={14} className="text-blue-400" /> Rainfall (mm/hr)</span>
              <span className="font-mono text-blue-400 font-bold">{rainfall}</span>
            </div>
            <input type="range" min="0" max="200" step="5" value={rainfall}
              onChange={e => setRainfall(Number(e.target.value))}
              className="w-full h-2 bg-[#1A2C46] rounded-full appearance-none accent-blue-500" />
            <div className="flex justify-between text-[10px] text-[#5C85C5] mt-1"><span>0</span><span>200 mm/hr</span></div>
          </div>

          {/* Tide Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-white flex items-center gap-2"><Sliders size={14} className="text-cyan-400" /> Tide Anomaly (m)</span>
              <span className="font-mono text-cyan-400 font-bold">+{tide.toFixed(1)}</span>
            </div>
            <input type="range" min="0" max="3" step="0.1" value={tide}
              onChange={e => setTide(Number(e.target.value))}
              className="w-full h-2 bg-[#1A2C46] rounded-full appearance-none accent-cyan-500" />
            <div className="flex justify-between text-[10px] text-[#5C85C5] mt-1"><span>0 m</span><span>+3 m</span></div>
          </div>

          {/* Sea Wall Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-white flex items-center gap-2"><Sliders size={14} className="text-emerald-400" /> Sea Wall Integrity (%)</span>
              <span className="font-mono text-emerald-400 font-bold">{seaWall}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={seaWall}
              onChange={e => setSeaWall(Number(e.target.value))}
              className="w-full h-2 bg-[#1A2C46] rounded-full appearance-none accent-emerald-500" />
            <div className="flex justify-between text-[10px] text-[#5C85C5] mt-1"><span>0% (failed)</span><span>100% (intact)</span></div>
          </div>

          <button
            onClick={handleRecalculate}
            disabled={isCalculating}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          >
            <RefreshCw size={16} className={isCalculating ? 'animate-spin' : ''} />
            {isCalculating ? 'Recalculating...' : 'Run Simulation'}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp size={22} className="text-blue-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Simulation Impact</h2>
            <p className="text-xs text-[#8A9EB8]">Risk changes vs. current baseline</p>
          </div>
        </div>

        {!results ? (
          <div className="bg-[#0A1628] border border-dashed border-[#1A2C46] rounded-xl p-16 text-center">
            <FlaskConical size={32} className="text-[#3A5276] mx-auto mb-3" />
            <p className="text-[#5C85C5] text-sm">Adjust parameters on the left and click <strong className="text-white">Run Simulation</strong> to see how flood risk changes across all zones.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(results as any[]).sort((a: any, b: any) => b.newRisk - a.newRisk).map((z: any) => {
              const delta = z.newRisk - z.baseRisk;
              const sBase = z.severity;
              const sNew  = z.newSeverity;
              const changed = sNew !== sBase || Math.abs(delta) >= 3;
              return (
                <div key={z.id} className={`bg-[#0A1628] border rounded-xl p-4 flex items-center gap-4 transition-colors ${changed ? 'border-[#1A2C46] hover:bg-[#112136]' : 'border-[#1A2C46] opacity-70'}`}>
                  <div className="w-32 shrink-0">
                    <div className="font-bold text-sm text-white">{z.name}</div>
                    <div className="text-[10px] text-[#5C85C5] font-mono">{z.id}</div>
                  </div>

                  <div className="flex items-center gap-3 flex-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${severityBg[sBase]} ${severityColor[sBase]}`}>
                      {severityLabel[sBase]}
                    </span>
                    <ArrowRight size={14} className="text-[#3A5276] shrink-0" />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${severityBg[sNew]} ${severityColor[sNew]}`}>
                      {severityLabel[sNew]}
                    </span>
                  </div>

                  {/* Risk bar */}
                  <div className="w-40">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8A9EB8]">{z.baseRisk}%</span>
                      <span className={`font-mono font-bold ${severityColor[sNew]}`}>{z.newRisk}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1A2C46] rounded-full overflow-hidden">
                      <div className={`h-full ${severityBar[sNew]}`} style={{ width: `${z.newRisk}%` }} />
                    </div>
                  </div>

                  <div className={`ml-auto text-sm font-mono font-bold w-16 text-right ${delta > 0 ? 'text-red-400' : delta < 0 ? 'text-emerald-400' : 'text-[#5C85C5]'}`}>
                    {delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
