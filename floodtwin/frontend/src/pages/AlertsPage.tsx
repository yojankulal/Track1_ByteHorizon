import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Send, Loader2, MapPin } from 'lucide-react';
import { fetchGrid, GridCell, dispatchIncidentAlert, AlertIncident } from '../lib/api-client';
import clsx from 'clsx';

const RISK_MAP: Record<string, { label: string; color: string; border: string; bar: string; lightBg: string }> = {
  Critical: {
    label: 'CRITICAL HAZARD',
    color: 'text-red-400',
    border: 'border-red-500/50',
    bar: 'bg-red-500',
    lightBg: 'bg-red-500/10',
  },
  High: {
    label: 'HIGH RISK WATCH',
    color: 'text-orange-400',
    border: 'border-orange-500/50',
    bar: 'bg-orange-500',
    lightBg: 'bg-orange-500/10',
  },
};

export default function AlertsPage() {
  const [alertZones, setAlertZones] = useState<GridCell[]>([]);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'Critical' | 'High'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  useEffect(() => {
    fetchGrid(1200)
      .then(data => {
        // Filter critical and high risk zones (SUL-...)
        const highRisk = data.cells
          .filter(c => c.risk_level === 'Critical' || c.risk_level === 'High')
          .sort((a, b) => b.flood_probability - a.flood_probability);
        setAlertZones(highRisk);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleDispatch = async (cell: GridCell) => {
    setDispatchingId(cell.id);
    const sectorName = cell.residing_zone_name || 'Regional Response Sector';
    const incidentPayload: AlertIncident = {
      incident_id: cell.id,
      name: `Zone ${cell.id} (${sectorName})`,
      headline: `Zone ${cell.id}, risk ${cell.flood_probability_percent}% in ${sectorName}`,
      sector_count: 1,
      peak_probability: cell.flood_probability,
      peak_probability_percent: cell.flood_probability_percent,
      avg_probability_percent: cell.flood_probability_percent,
      onset: cell.risk_level === 'Critical' ? '+1h 00m (Imminent)' : '+2h 30m',
      peak: cell.risk_level === 'Critical' ? '+6h 00m (High Tide)' : '+7h 00m',
      top_drivers: [
        `Low elevation: ${cell.elevation}m ASL`,
        `3-Day Rain: ${cell.precip_3d.toFixed(1)}mm`,
        `Topographic Wetness Index (TWI): ${cell.TWI.toFixed(2)}`,
        `Contributing zone to ${sectorName}`
      ],
      action_line: cell.risk_level === 'Critical'
        ? `Issue immediate evacuation advisory for Zone ${cell.id} in ${sectorName}; activate dewatering pumps.`
        : `Inspect drainage culverts and road access routes for Zone ${cell.id} in ${sectorName}.`,
      state: cell.risk_level === 'Critical' ? 'Escalated' : 'New',
      trend: '▲ Intensifying',
      countdown: cell.risk_level === 'Critical' ? 'Peak Surge in 2h 15m' : 'Impact in 3h 40m',
      centroid: [cell.lon, cell.lat],
      bbox: [cell.lon, cell.lat, cell.lon, cell.lat],
      sector_ids: [cell.id],
    };

    try {
      const res = await dispatchIncidentAlert(incidentPayload);
      if (res.errors && res.errors.length > 0) {
        alert(`Dispatch partially completed: ${res.errors.join(', ')}`);
      } else {
        alert(`Emergency alert dispatched successfully for Zone ${cell.id} via Telegram!\n\nMessage:\n${res.dispatched_text}`);
      }
    } catch (error: any) {
      alert(`Failed to dispatch alert for Zone ${cell.id}: ${error.message}`);
    } finally {
      setDispatchingId(null);
    }
  };

  const filteredZones = alertZones.filter(z => {
    if (filterLevel === 'ALL') return true;
    return z.risk_level === filterLevel;
  });

  const criticalCount = alertZones.filter(z => z.risk_level === 'Critical').length;
  const highRiskCount = alertZones.filter(z => z.risk_level === 'High').length;

  return (
    <div className="w-full p-6 overflow-y-auto bg-[#040B14] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-sm">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Active Flood Alerts</h1>
            <p className="text-xs text-[#8A9EB8]">
              Sulawesi Digital Twin Monitoring Grid — High-hazard zones exceeding alert threshold (&ge;50% probability)
            </p>
          </div>
        </div>

        {/* Filter Controls & Hazard Counter */}
        <div className="flex items-center gap-3">
          <div className="bg-[#081220] border border-[#1A2C46] rounded-lg p-0.5 flex text-xs">
            <button
              onClick={() => setFilterLevel('ALL')}
              className={clsx(
                'px-3 py-1 rounded-md font-semibold transition',
                filterLevel === 'ALL' ? 'bg-blue-600 text-white font-bold' : 'text-[#8A9EB8] hover:text-white'
              )}
            >
              All ({alertZones.length})
            </button>
            <button
              onClick={() => setFilterLevel('Critical')}
              className={clsx(
                'px-3 py-1 rounded-md font-semibold transition',
                filterLevel === 'Critical' ? 'bg-red-600 text-white font-bold' : 'text-[#8A9EB8] hover:text-white'
              )}
            >
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setFilterLevel('High')}
              className={clsx(
                'px-3 py-1 rounded-md font-semibold transition',
                filterLevel === 'High' ? 'bg-orange-600 text-white font-bold' : 'text-[#8A9EB8] hover:text-white'
              )}
            >
              High Risk ({highRiskCount})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-lg font-mono">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            {filteredZones.length} Active Elevated Zones
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#081220] border border-[#1A2C46] rounded-xl p-12 text-center text-xs text-[#8A9EB8]">
          Scanning Sulawesi digital twin observation zones with XGBoost model...
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="bg-[#081220] border border-[#1A2C46] rounded-xl p-12 text-center space-y-2">
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
          <p className="text-white font-bold text-sm">No Active Critical Flood Hazards</p>
          <p className="text-xs text-[#8A9EB8]">All spatial observation zones currently fall within nominal baseline parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredZones.map((c, idx) => {
            const r = RISK_MAP[c.risk_level] ?? RISK_MAP.High;
            const sectorName = c.residing_zone_name || 'Regional Response Sector';
            const isCritical = c.risk_level === 'Critical';

            return (
              <div
                key={c.id}
                className={clsx(
                  'bg-[#081220] border rounded-xl p-5 hover:bg-[#0D1B2E] transition-all shadow-xl flex gap-4 items-start',
                  r.border
                )}
              >
                {/* Left accent bar */}
                <div className={clsx('w-1.5 self-stretch rounded-full shrink-0', r.bar)} />

                <div className="flex-1 space-y-3.5">
                  {/* Title & Status */}
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx('w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-xs', isCritical ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-orange-500/20 text-orange-400 border border-orange-500/40')}>
                          #{idx + 1}
                        </span>
                        <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold border uppercase', r.border, r.color, r.lightBg)}>
                          {r.label}
                        </span>
                        <span className="text-[10px] font-mono text-[#8A9EB8] flex items-center gap-1">
                          <MapPin size={11} className="text-cyan-400" /> {c.lat.toFixed(2)}°, {c.lon.toFixed(2)}°
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white leading-tight">
                        Zone {c.id}
                      </h3>

                      {/* Explicitly showing the hierarchy: zone contributes to sector */}
                      <p className="text-xs text-cyan-400 font-semibold mt-1 flex items-center gap-1">
                        Contributing to: <span className="text-white underline decoration-cyan-500/50 underline-offset-2">{sectorName}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className={clsx('text-xl font-mono font-bold', r.color)}>
                        {c.flood_probability_percent}%
                      </div>
                      <div className="text-[10px] text-[#8A9EB8] uppercase font-bold tracking-wider">{c.risk_level} Risk</div>
                    </div>
                  </div>

                  {/* Risk Progress Bar */}
                  <div className="h-1.5 bg-[#1A2C46] rounded-full overflow-hidden">
                    <div className={clsx('h-full', r.bar)} style={{ width: `${c.flood_probability_percent}%` }} />
                  </div>

                  {/* Hydrological Indicators */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="bg-[#050B14] p-2 rounded-lg border border-[#1A2C46]">
                      <span className="text-[10px] text-[#8A9EB8] block">Elevation</span>
                      <div className="text-sm font-bold text-white font-mono mt-0.5">{c.elevation} m</div>
                    </div>
                    <div className="bg-[#050B14] p-2 rounded-lg border border-[#1A2C46]">
                      <span className="text-[10px] text-[#8A9EB8] block">3-Day Rain</span>
                      <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">{c.precip_3d.toFixed(1)} mm</div>
                    </div>
                    <div className="bg-[#050B14] p-2 rounded-lg border border-[#1A2C46]">
                      <span className="text-[10px] text-[#8A9EB8] block">Slope</span>
                      <div className="text-sm font-bold text-white font-mono mt-0.5">{c.slope.toFixed(1)}°</div>
                    </div>
                    <div className="bg-[#050B14] p-2 rounded-lg border border-[#1A2C46]">
                      <span className="text-[10px] text-[#8A9EB8] block">Wetness (TWI)</span>
                      <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">{c.TWI.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Operational Action Directive */}
                  <div className={clsx('p-3 rounded-lg border flex items-start gap-2', r.lightBg, r.border)}>
                    <ShieldAlert size={16} className={clsx('shrink-0 mt-0.5', r.color)} />
                    <p className="text-xs font-medium text-white leading-relaxed">
                      {isCritical
                        ? `Issue Level-3 evacuation advisory for Zone ${c.id} in ${sectorName}. Pre-stage dewatering pumps at low-elevation points.`
                        : `Maintain active monitoring for Zone ${c.id} in ${sectorName}. Inspect runoff culverts and secondary road access.`}
                    </p>
                  </div>

                  {/* One-click Dispatch Button */}
                  <button
                    onClick={() => handleDispatch(c)}
                    disabled={dispatchingId === c.id}
                    className={clsx(
                      'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      dispatchingId === c.id
                        ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                    )}
                  >
                    {dispatchingId === c.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Synthesizing &amp; Sending AI Advisory...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Dispatch Alert to Responders
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
