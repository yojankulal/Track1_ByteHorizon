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
          <div className="col-span-3">Sector & Contributing Zones</div>
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
                      <Map size={11} /> {z.sector_count} Contributing Zones • <Compass size={11}/> {z.centroid[1].toFixed(3)}°S, {z.centroid[0].toFixed(3)}°E
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
                    <div className="flex justify-between text-[10px] font-semibold text-[#8A9EB8] mb-1 tracking-tight">
                      <span className="text-sky-400" title="Inundation Risk (40% Weight): Machine learning forecast model prediction of surface water hazard from terrain topography & rainfall">Risk (40%)</span>
                      <span className="text-amber-400" title="Asset Exposure (25% Weight): Land cover vulnerability assessing urban settlements and agricultural cropland at risk">Exposure (25%)</span>
                      <span className="text-purple-400" title="Road Isolation (20% Weight): Access cut-off risk from surrounding flooded zones within 2km radius">Isolation (20%)</span>
                      <span className="text-rose-400" title="Lifeline Threat (15% Weight): Proximity threat to referral hospitals, trauma centers & disaster hubs">Lifeline (15%)</span>
                    </div>
                    {(() => {
                      const fb = z.factor_breakdown || {};
                      const probPct = typeof fb.probability === 'object' ? fb.probability.pct_of_total : (fb.probability || 25);
                      const expPct = typeof fb.exposure === 'object' ? fb.exposure.pct_of_total : (fb.exposure || 25);
                      const accPct = typeof fb.accessibility === 'object' ? fb.accessibility.pct_of_total : (fb.accessibility || 25);
                      const critPct = typeof fb.criticality === 'object' ? fb.criticality.pct_of_total : (fb.criticality || 25);

                      const probDesc = typeof fb.probability === 'object' ? fb.probability.description : "Inundation Risk (40%): XGBoost hazard forecast";
                      const expDesc = typeof fb.exposure === 'object' ? fb.exposure.description : "Asset Exposure (25%): Populated & agricultural land density";
                      const accDesc = typeof fb.accessibility === 'object' ? fb.accessibility.description : "Road Isolation (20%): 2km emergency access cut-off risk";
                      const critDesc = typeof fb.criticality === 'object' ? fb.criticality.description : "Lifeline Threat (15%): Proximity to regional hospitals & evac bases";

                      return (
                        <div className="flex h-2.5 rounded-full overflow-hidden bg-[#1A2C46] gap-0.5 p-0.5">
                          <div className="bg-sky-500 rounded-l" style={{ width: `${probPct}%` }} title={probDesc} />
                          <div className="bg-amber-500" style={{ width: `${expPct}%` }} title={expDesc} />
                          <div className="bg-purple-500" style={{ width: `${accPct}%` }} title={accDesc} />
                          <div className="bg-rose-500 rounded-r" style={{ width: `${critPct}%` }} title={critDesc} />
                        </div>
                      );
                    })()}
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
