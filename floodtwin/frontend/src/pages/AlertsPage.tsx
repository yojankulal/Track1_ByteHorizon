import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Info, ShieldAlert, TrendingDown, TrendingUp, Minus, Send, Loader2 } from 'lucide-react';
import { fetchAlertIncidents, AlertIncident, dispatchIncidentAlert } from '../lib/api-client';
import clsx from 'clsx';

export default function AlertsPage() {
  const [incidents, setIncidents] = useState<AlertIncident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const handleDispatch = async (incident: AlertIncident) => {
    setDispatchingId(incident.incident_id);
    try {
      const res = await dispatchIncidentAlert(incident);
      if (res.errors && res.errors.length > 0) {
        alert("Dispatch partially failed: " + res.errors.join(", "));
      } else {
        alert("Alert dispatched successfully via Telegram!\n\nMessage:\n" + res.dispatched_text);
      }
    } catch (error: any) {
      alert("Failed to dispatch alert: " + error.message);
    } finally {
      setDispatchingId(null);
    }
  };

  useEffect(() => {
    fetchAlertIncidents()
      .then(data => {
        setIncidents(data);
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
            <h1 className="text-xl font-bold text-white">Active Flood Incidents</h1>
            <p className="text-xs text-[#8A9EB8]">
              Clustered spatial flood hazards with early warning indicators
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-lg font-mono">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          {incidents.length} Active Incidents
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#081220] border border-[#1A2C46] rounded-xl p-12 text-center text-xs text-[#8A9EB8]">
          Clustering flooded sectors into incidents...
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-[#081220] border border-[#1A2C46] rounded-xl p-12 text-center space-y-2">
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
          <p className="text-white font-bold text-sm">No Active Critical Flood Hazards</p>
          <p className="text-xs text-[#8A9EB8]">All spatial sectors currently fall within nominal baseline parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents.map(incident => {
            const isEscalated = incident.state === "Escalated";
            const isCleared = incident.state === "Cleared";
            const colorClass = isEscalated ? "text-red-400" : isCleared ? "text-emerald-400" : "text-orange-400";
            const borderClass = isEscalated ? "border-red-500/50" : isCleared ? "border-emerald-500/50" : "border-orange-500/50";
            const bgClass = isEscalated ? "bg-red-500" : isCleared ? "bg-emerald-500" : "bg-orange-500";
            const lightBgClass = isEscalated ? "bg-red-500/10" : isCleared ? "bg-emerald-500/10" : "bg-orange-500/10";
            
            return (
              <div
                key={incident.incident_id}
                className={clsx(
                  'bg-[#081220] border rounded-xl p-5 hover:bg-[#0D1B2E] transition-all shadow-xl flex gap-4 items-start',
                  borderClass
                )}
              >
                {/* Left accent bar */}
                <div className={clsx('w-1.5 self-stretch rounded-full shrink-0', bgClass)} />

                <div className="flex-1 space-y-4">
                  {/* Title & Status */}
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold border uppercase', borderClass, colorClass, lightBgClass)}>
                          {incident.state}
                        </span>
                        <span className={clsx('text-[10px] font-bold flex items-center gap-1', colorClass)}>
                          {incident.trend.includes('▲') ? <TrendingUp size={12}/> : incident.trend.includes('▼') ? <TrendingDown size={12}/> : <Minus size={12}/>}
                          {incident.trend.replace(/[▲▼▶]\s*/, '')}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white leading-tight">{incident.name}</h3>
                      <p className="text-xs text-[#5C85C5] mt-1">{incident.sector_count} sectors affected</p>
                    </div>

                    <div className="text-right">
                      <div className={clsx('text-lg font-mono font-bold', colorClass)}>
                        {incident.peak_probability_percent}%
                      </div>
                      <div className="text-[10px] text-[#8A9EB8]">Peak Risk</div>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="grid grid-cols-2 gap-3 bg-[#050B14] p-3 rounded-lg border border-[#1A2C46]">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8A9EB8] mb-1">
                        <Clock size={12} className="text-cyan-400"/> Onset
                      </div>
                      <div className="text-sm font-bold text-white">{incident.onset}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8A9EB8] mb-1">
                        <AlertTriangle size={12} className="text-orange-400"/> Peak Time
                      </div>
                      <div className="text-sm font-bold text-white">{incident.peak}</div>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-[#1A2C46]">
                      <div className="text-xs text-[#B4C6DF] flex items-center justify-between">
                        <span>Timer:</span>
                        <span className="font-mono text-cyan-400 font-bold">{incident.countdown}</span>
                      </div>
                    </div>
                  </div>

                  {/* Drivers */}
                  <div>
                    <div className="text-[10px] font-bold text-[#5C85C5] uppercase mb-1.5 flex items-center gap-1">
                      <Info size={12} /> Top Drivers
                    </div>
                    <ul className="space-y-1">
                      {incident.top_drivers.map((driver, i) => (
                        <li key={i} className="text-xs text-[#B4C6DF] flex items-start gap-1.5 leading-snug">
                          <span className="text-cyan-400 mt-0.5">•</span> {driver}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Line */}
                  <div className={clsx("p-3 rounded-lg border flex items-start gap-2", lightBgClass, borderClass)}>
                    <ShieldAlert size={16} className={clsx("shrink-0 mt-0.5", colorClass)} />
                    <p className="text-xs font-medium text-white leading-relaxed">
                      {incident.action_line}
                    </p>
                  </div>
                  
                  {/* Dispatch Button */}
                  <button
                    onClick={() => handleDispatch(incident)}
                    disabled={dispatchingId === incident.incident_id}
                    className={clsx(
                      "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                      dispatchingId === incident.incident_id
                        ? "bg-blue-600/50 text-blue-200 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    )}
                  >
                    {dispatchingId === incident.incident_id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Synthesizing & Sending AI Advisory...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Dispatch Alerts
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
