import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fetchGrid, GridCell } from '../lib/api-client';
import clsx from 'clsx';

const RISK_MAP: Record<string, { label: string; color: string; border: string; bar: string }> = {
  Critical: { label: 'CRITICAL HAZARD', color: 'text-red-400', border: 'border-red-500/50', bar: 'bg-red-500' },
  High: { label: 'HIGH RISK WATCH', color: 'text-orange-400', border: 'border-orange-500/50', bar: 'bg-orange-500' },
  Moderate: { label: 'MODERATE ADVISORY', color: 'text-amber-400', border: 'border-amber-500/50', bar: 'bg-amber-500' },
  Low: { label: 'LOW MONITOR', color: 'text-emerald-400', border: 'border-emerald-500/50', bar: 'bg-emerald-500' },
};

export default function AlertsPage() {
  const [alertCells, setAlertCells] = useState<GridCell[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchGrid(1200)
      .then(data => {
        // Filter critical and high risk sectors
        const highRisk = data.cells
          .filter(c => c.risk_level === 'Critical' || c.risk_level === 'High')
          .sort((a, b) => b.flood_probability - a.flood_probability);
        setAlertCells(highRisk);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="w-full p-6 overflow-y-auto bg-[#040B14] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Active Flood Early Warnings</h1>
            <p className="text-xs text-[#8A9EB8]">
              Sulawesi Digital Twin Monitoring Grid — Sectors exceeding alert threshold (&ge;50% probability)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-lg font-mono">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          {alertCells.length} Elevated Hazards Detected
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#081220] border border-[#1A2C46] rounded-xl p-12 text-center text-xs text-[#8A9EB8]">
          Scanning 1,200 Sulawesi spatial sectors with XGBoost model...
        </div>
      ) : alertCells.length === 0 ? (
        <div className="bg-[#081220] border border-[#1A2C46] rounded-xl p-12 text-center space-y-2">
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
          <p className="text-white font-bold text-sm">No Active Critical Flood Hazards</p>
          <p className="text-xs text-[#8A9EB8]">All spatial sectors currently fall within nominal baseline parameters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertCells.map(c => {
            const r = RISK_MAP[c.risk_level] ?? RISK_MAP.High;
            return (
              <div
                key={c.id}
                className={clsx(
                  'bg-[#081220] border rounded-xl p-5 hover:bg-[#0D1B2E] transition-all shadow-xl',
                  r.border
                )}
              >
                <div className="flex gap-4 items-start">
                  {/* Left accent bar */}
                  <div className={clsx('w-1.5 self-stretch rounded-full shrink-0', r.bar)} />

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-bold border', r.border, r.color, 'bg-white/5')}>
                          {r.label}
                        </span>
                        <h3 className="text-base font-bold text-white">{c.location_name}</h3>
                        <span className="text-xs font-mono text-[#5C85C5]">({c.id})</span>
                      </div>

                      <div className="text-sm font-mono text-[#8A9EB8] bg-[#050B14] px-3 py-1 rounded-lg border border-[#1A2C46]">
                        Flood Probability: <span className={clsx('font-bold', r.color)}>{c.flood_probability_percent}%</span>
                      </div>
                    </div>

                    {/* Risk progress bar */}
                    <div className="h-1.5 bg-[#1A2C46] rounded-full overflow-hidden">
                      <div className={clsx('h-full', r.bar)} style={{ width: `${c.flood_probability_percent}%` }} />
                    </div>

                    {/* Scientific details */}
                    <div className="grid grid-cols-4 gap-2 pt-1 text-xs">
                      <div className="bg-[#050B14] p-2 rounded-lg border border-[#1A2C46]">
                        <span className="text-[10px] text-[#8A9EB8]">Elevation</span>
                        <div className="text-sm font-bold text-white font-mono">{c.elevation} m</div>
                      </div>
                      <div className="bg-[#050B14] p-2 rounded-lg border border-[#1A2C46]">
                        <span className="text-[10px] text-[#8A9EB8]">3-Day Precipitation</span>
                        <div className="text-sm font-bold text-cyan-400 font-mono">{c.precip_3d.toFixed(1)} mm</div>
                      </div>
                      <div className="bg-[#050B14] p-2 rounded-lg border border-[#1A2C46]">
                        <span className="text-[10px] text-[#8A9EB8]">Terrain Slope</span>
                        <div className="text-sm font-bold text-white font-mono">{c.slope.toFixed(1)}°</div>
                      </div>
                      <div className="bg-[#050B14] p-2 rounded-lg border border-[#1A2C46]">
                        <span className="text-[10px] text-[#8A9EB8]">Wetness Index (TWI)</span>
                        <div className="text-sm font-bold text-amber-400 font-mono">{c.TWI.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
