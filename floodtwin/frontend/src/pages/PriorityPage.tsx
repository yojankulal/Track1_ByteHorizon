import { useState, useEffect } from 'react';
import { Activity, Compass, Map, ShieldAlert } from 'lucide-react';
import { fetchPriorityZones, ResponseZone } from '../lib/api-client';
import clsx from 'clsx';

export default function PriorityPage() {
  const [zones, setZones] = useState<ResponseZone[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchPriorityZones(10)
      .then(data => {
        setZones(data);
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
              Sulawesi Regional Sectors — Ranked by Multi-Factor Priority Score
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
          <div className="col-span-3">Zone & Sectors</div>
          <div className="col-span-2">Priority Score</div>
          <div className="col-span-3">Factor Breakdown</div>
          <div className="col-span-3">Reason</div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#8A9EB8] text-xs">
            Loading real-time priority ranking from Sulawesi model dataset...
          </div>
        ) : (
          <div className="divide-y divide-[#1A2C46]">
            {zones.map((z, idx) => {
              return (
                <div
                  key={z.zone_id}
                  className="grid grid-cols-12 px-5 py-3.5 hover:bg-[#0D1B2E] transition-colors items-center text-xs"
                >
                  {/* Rank */}
                  <div className="col-span-1 text-center font-mono font-black text-base" style={{ color: idx < 3 ? '#ef4444' : '#8A9EB8' }}>
                    #{z.rank}
                  </div>

                  {/* Zone info */}
                  <div className="col-span-3">
                    <div className="font-bold text-white text-sm">{z.name}</div>
                    <div className="text-[11px] font-mono text-[#5C85C5] flex items-center gap-1 mt-1">
                      <Map size={11} /> {z.sector_count} Sectors • <Compass size={11}/> {z.centroid[1].toFixed(3)}°S, {z.centroid[0].toFixed(3)}°E
                    </div>
                    <div className={clsx('text-[10px] mt-1 font-bold', z.rank_delta > 0 ? 'text-emerald-400' : z.rank_delta < 0 ? 'text-red-400' : 'text-[#8A9EB8]')}>
                      {z.rank_delta_label}
                    </div>
                  </div>

                  {/* Priority Score */}
                  <div className="col-span-2 pr-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8A9EB8]">Priority</span>
                      <span className="font-mono font-bold text-blue-400">{z.priority_percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1A2C46] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${z.priority_percent}%` }} />
                    </div>
                  </div>

                  {/* Factor Breakdown Bar */}
                  <div className="col-span-3 pr-6">
                    <div className="flex justify-between text-[10px] text-[#5C85C5] mb-1">
                      <span>Prob</span>
                      <span>Exp</span>
                      <span>Acc</span>
                      <span>Crit</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-[#1A2C46]">
                      <div className="bg-sky-500" style={{ width: `${z.factor_breakdown.probability}%` }} title="Probability (40%)" />
                      <div className="bg-orange-500" style={{ width: `${z.factor_breakdown.exposure}%` }} title="Exposure (25%)" />
                      <div className="bg-purple-500" style={{ width: `${z.factor_breakdown.accessibility}%` }} title="Accessibility (20%)" />
                      <div className="bg-red-500" style={{ width: `${z.factor_breakdown.criticality}%` }} title="Criticality (15%)" />
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="col-span-3 text-xs text-[#B4C6DF] leading-relaxed flex items-start gap-2">
                    <ShieldAlert size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>{z.reason}</span>
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
