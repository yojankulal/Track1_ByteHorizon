import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Compass } from 'lucide-react';
import { fetchPriorities, PriorityArea } from '../lib/api-client';
import clsx from 'clsx';

const RISK_MAP: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  Low: { label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40', bar: 'bg-emerald-500' },
  Moderate: { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40', bar: 'bg-amber-500' },
  High: { label: 'High Risk', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40', bar: 'bg-orange-500' },
  Critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40', bar: 'bg-red-500' },
};

export default function PriorityPage() {
  const [priorities, setPriorities] = useState<PriorityArea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchPriorities(20)
      .then(data => {
        setPriorities(data);
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
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Emergency Priority Ranking</h1>
            <p className="text-xs text-[#8A9EB8]">
              Sulawesi Regional Sectors — Ranked by Model-Predicted Inundation Probability
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live XGBoost Model Assessment
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-[#081220] rounded-xl border border-[#1A2C46] overflow-hidden shadow-2xl">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-5 py-3 bg-[#050B14] border-b border-[#1A2C46] text-[11px] font-bold text-[#5C85C5] uppercase tracking-wider">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-3">Sector ID & Location</div>
          <div className="col-span-2">Risk Classification</div>
          <div className="col-span-2">Flood Probability</div>
          <div className="col-span-3">Hydro-Topographic Driver Context</div>
          <div className="col-span-1 text-right">Elevation</div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#8A9EB8] text-xs">
            Loading real-time priority ranking from Sulawesi model dataset...
          </div>
        ) : (
          <div className="divide-y divide-[#1A2C46]">
            {priorities.map((p, idx) => {
              const r = RISK_MAP[p.risk_level] ?? RISK_MAP.Low;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-12 px-5 py-3.5 hover:bg-[#0D1B2E] transition-colors items-center text-xs"
                >
                  {/* Rank */}
                  <div className="col-span-1 text-center font-mono font-black text-base" style={{ color: idx < 3 ? '#ef4444' : '#8A9EB8' }}>
                    #{p.rank}
                  </div>

                  {/* Sector info */}
                  <div className="col-span-3">
                    <div className="font-bold text-white text-sm">{p.id}</div>
                    <div className="text-[11px] font-mono text-[#5C85C5] flex items-center gap-1">
                      <Compass size={11} /> {p.lat.toFixed(3)}°S, {p.lon.toFixed(3)}°E
                    </div>
                  </div>

                  {/* Severity Badge */}
                  <div className="col-span-2">
                    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border', r.bg, r.color)}>
                      <AlertTriangle size={11} />
                      {r.label}
                    </span>
                  </div>

                  {/* Probability Bar */}
                  <div className="col-span-2 pr-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8A9EB8]">Probability</span>
                      <span className={clsx('font-mono font-bold', r.color)}>{p.flood_probability_percent}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1A2C46] rounded-full overflow-hidden">
                      <div className={clsx('h-full', r.bar)} style={{ width: `${p.flood_probability_percent}%` }} />
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="col-span-3 text-xs text-[#B4C6DF] pr-2 leading-relaxed">
                    {p.reason}
                  </div>

                  {/* Elevation & Rain */}
                  <div className="col-span-1 text-right">
                    <div className="font-mono font-bold text-white">{p.elevation} m</div>
                    <div className="text-[10px] text-cyan-400 font-mono">{p.precip_3d.toFixed(0)}mm rain</div>
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
