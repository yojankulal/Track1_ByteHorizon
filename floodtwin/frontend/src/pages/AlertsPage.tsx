import React from 'react';
import { AlertTriangle, Clock, Waves, Wind, Droplets } from 'lucide-react';

const alerts = [
  { id: 'Z1', zone: 'Bengre Sandpit',         risk: 92, severity: 4, onset: '2:00 PM', peak: '3:30 PM', description: 'Complete isolation; extreme risk to life. Immediate evacuation required.' },
  { id: 'Z2', zone: 'Panambur Port Area',     risk: 86, severity: 4, onset: '3:20 PM', peak: '4:35 PM', description: 'Port operations threatened; hazardous material storage at risk.' },
  { id: 'Z3', zone: 'Bunder (Old Port)',      risk: 78, severity: 4, onset: '4:00 PM', peak: '5:30 PM', description: 'Wholesale market flooded; fishing vessels in danger.' },
  { id: 'Z4', zone: 'Ullal & Someshwara',    risk: 65, severity: 3, onset: '4:15 PM', peak: '5:00 PM', description: 'Severe coastal erosion and residential ground-floor flooding.' },
  { id: 'Z5', zone: 'Netravati River Banks',  risk: 58, severity: 3, onset: '5:00 PM', peak: '6:45 PM', description: 'Backwater flooding spreading into low-lying homes.' },
  { id: 'Z6', zone: 'Surathkal Coastal Belt', risk: 42, severity: 2, onset: '5:30 PM', peak: '6:15 PM', description: 'Access roads flooded; minor coastal erosion near campus.' },
];

const severityMap: Record<number, { label: string; color: string; border: string; barColor: string; glowColor: string }> = {
  1: { label: 'Minor',    color: 'text-yellow-400',  border: 'border-yellow-500/40',   barColor: 'bg-yellow-400',  glowColor: 'shadow-yellow-500/20' },
  2: { label: 'Moderate', color: 'text-orange-400',  border: 'border-orange-500/40',   barColor: 'bg-orange-400',  glowColor: 'shadow-orange-500/20' },
  3: { label: 'Severe',   color: 'text-red-400',     border: 'border-red-500/50',      barColor: 'bg-red-400',     glowColor: 'shadow-red-500/20' },
  4: { label: 'Critical', color: 'text-fuchsia-400', border: 'border-fuchsia-500/60',  barColor: 'bg-fuchsia-500', glowColor: 'shadow-fuchsia-500/20' },
};

export default function AlertsPage() {
  return (
    <div className="w-full p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle size={24} className="text-orange-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Active Flood Alerts</h1>
          <p className="text-xs text-[#8A9EB8]">Mangaluru Coastal Region — {alerts.length} zones under watch</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          {alerts.filter(a => a.severity === 4).length} Critical
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map(alert => {
          const s = severityMap[alert.severity];
          return (
            <div
              key={alert.id}
              className={`bg-[#0A1628] border ${s.border} rounded-xl p-5 hover:bg-[#112136] transition-colors cursor-pointer`}
            >
              <div className="flex gap-4">
                {/* Left accent bar */}
                <div className={`w-1 rounded-full shrink-0 ${s.barColor}`} />

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.border} ${s.color} bg-white/5`}>
                      {s.label}
                    </span>
                    <h3 className="text-base font-bold text-white">{alert.zone}</h3>
                    <span className="text-sm font-mono text-[#8A9EB8] ml-auto bg-[#081220] px-2 py-0.5 rounded border border-[#1A2C46]">
                      Risk: <span className={`font-bold ${s.color}`}>{alert.risk}%</span>
                    </span>
                  </div>

                  {/* Risk bar */}
                  <div className="h-1.5 bg-[#1A2C46] rounded-full overflow-hidden mb-3">
                    <div className={`h-full ${s.barColor} transition-all duration-700`} style={{ width: `${alert.risk}%` }} />
                  </div>

                  <p className="text-sm text-[#8A9EB8] mb-4">{alert.description}</p>

                  {/* Timeline chips */}
                  <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-[#081220] border border-[#1A2C46] rounded-lg px-3 py-2">
                      <Clock size={13} className="text-[#5C85C5]" />
                      <div>
                        <div className="text-[10px] text-[#5C85C5] uppercase">Onset</div>
                        <div className="font-mono text-sm font-bold text-white">{alert.onset}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-[#081220] border border-[#1A2C46] rounded-lg px-3 py-2">
                      <Clock size={13} className="text-[#5C85C5]" />
                      <div>
                        <div className="text-[10px] text-[#5C85C5] uppercase">Peak</div>
                        <div className="font-mono text-sm font-bold text-white">{alert.peak}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Main Drivers */}
                <div className="w-44 shrink-0 border-l border-[#1A2C46] pl-4 flex flex-col justify-center gap-3">
                  <div className="text-[10px] text-[#5C85C5] uppercase font-semibold tracking-wider mb-1">Main Drivers</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#8A9EB8]"><Droplets size={11} /> Rainfall</span>
                      <span className="font-mono text-red-400 font-bold">+42%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#8A9EB8]"><Waves size={11} /> Tide</span>
                      <span className="font-mono text-red-400 font-bold">+28%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#8A9EB8]"><Wind size={11} /> Surge</span>
                      <span className="font-mono text-orange-400 font-bold">+17%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
