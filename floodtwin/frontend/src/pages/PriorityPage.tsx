import React from 'react';
import { Activity, Users, Building2, Truck, GraduationCap, Anchor, ShoppingBag, AlertTriangle, ShieldAlert } from 'lucide-react';

const zones = [
  { id: 'Z1', name: 'Bengre Sandpit',         risk: 92, severity: 4, reason: 'River and sea merging over sandpit; evacuation routes severed.', pop: '2.5k', facilities: ['School'] },
  { id: 'Z2', name: 'Panambur Port Area',     risk: 86, severity: 4, reason: 'High tide + surge overwhelming breakwaters; chemical storage at risk.', pop: '1.2k', facilities: ['Port', 'Industrial'] },
  { id: 'Z3', name: 'Bunder (Old Port)',      risk: 78, severity: 4, reason: 'Estuary backflow causing severe waterlogging in dense commercial zones.', pop: '6.8k', facilities: ['Market', 'Fishing Harbour'] },
  { id: 'Z4', name: 'Ullal & Someshwara',    risk: 65, severity: 3, reason: 'Wave overtopping sea walls; ground-floor flooding in coastal homes.', pop: '5.4k', facilities: ['Hospital', 'Shelter'] },
  { id: 'Z5', name: 'Netravati River Banks',  risk: 58, severity: 3, reason: 'River discharge meeting high tide, causing backwater inundation.', pop: '3.2k', facilities: ['Shelter'] },
  { id: 'Z6', name: 'Surathkal Coastal Belt', risk: 42, severity: 2, reason: 'Poor drainage combined with moderate surge affecting campus access.', pop: '4.1k', facilities: ['University'] },
  { id: 'Z7', name: 'Kulai & Hosabettu',     risk: 25, severity: 1, reason: 'Minor pooling due to blocked storm drains during heavy rainfall.', pop: '2.8k', facilities: [] },
];

const severityMap: Record<number, { label: string; color: string; bg: string; bar: string }> = {
  1: { label: 'Minor',    color: 'text-yellow-400',  bg: 'bg-yellow-500/20 border-yellow-500/40',   bar: 'bg-yellow-400' },
  2: { label: 'Moderate', color: 'text-orange-400',  bg: 'bg-orange-500/20 border-orange-500/40',   bar: 'bg-orange-400' },
  3: { label: 'Severe',   color: 'text-red-400',     bg: 'bg-red-500/20 border-red-500/40',          bar: 'bg-red-400' },
  4: { label: 'Critical', color: 'text-fuchsia-400', bg: 'bg-fuchsia-600/20 border-fuchsia-500/40',  bar: 'bg-fuchsia-500' },
};

const FacilityIcon = ({ name }: { name: string }) => {
  const map: Record<string, React.ReactNode> = {
    'Hospital':        <Building2 size={13} className="text-red-400" title="Hospital" />,
    'Port':            <Anchor size={13} className="text-blue-400" title="Port" />,
    'Industrial':      <Truck size={13} className="text-orange-400" title="Industrial" />,
    'Market':          <ShoppingBag size={13} className="text-yellow-400" title="Market" />,
    'Fishing Harbour': <Anchor size={13} className="text-cyan-400" title="Fishing Harbour" />,
    'Shelter':         <ShieldAlert size={13} className="text-green-400" title="Shelter" />,
    'University':      <GraduationCap size={13} className="text-purple-400" title="University" />,
    'School':          <GraduationCap size={13} className="text-indigo-400" title="School" />,
  };
  return <span title={name}>{map[name] ?? null}</span>;
};

export default function PriorityPage() {
  const sorted = [...zones].sort((a, b) => b.risk - a.risk);

  return (
    <div className="w-full p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Activity size={24} className="text-blue-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Emergency Priority Ranking</h1>
          <p className="text-xs text-[#8A9EB8]">Mangaluru Coastal Zones — sorted by flood risk</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live Assessment
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0A1628] rounded-xl border border-[#1A2C46] overflow-hidden">
        {/* Column Headers */}
        <div className="grid grid-cols-12 px-5 py-3 bg-[#081220] border-b border-[#1A2C46] text-[11px] font-semibold text-[#5C85C5] uppercase tracking-wider">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-3">Zone</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-2">Risk Level</div>
          <div className="col-span-3">Critical Context</div>
          <div className="col-span-1 text-right">Assets</div>
        </div>

        {sorted.map((z, idx) => {
          const s = severityMap[z.severity];
          return (
            <div
              key={z.id}
              className="grid grid-cols-12 px-5 py-4 border-b border-[#1A2C46] hover:bg-[#112136] transition-colors items-center"
            >
              {/* Rank */}
              <div className="col-span-1 text-center">
                <span className={`font-mono text-xl font-black ${idx < 3 ? s.color : 'text-[#3A5276]'}`}>
                  {idx + 1}
                </span>
              </div>

              {/* Zone name */}
              <div className="col-span-3">
                <div className="font-bold text-white text-sm">{z.name}</div>
                <div className="text-[11px] text-[#5C85C5] font-mono">{z.id}</div>
              </div>

              {/* Severity badge */}
              <div className="col-span-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.color}`}>
                  <AlertTriangle size={10} />
                  {s.label}
                </span>
              </div>

              {/* Risk bar */}
              <div className="col-span-2 pr-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#8A9EB8]">Risk</span>
                  <span className={`font-mono font-bold ${s.color}`}>{z.risk}%</span>
                </div>
                <div className="h-1.5 bg-[#1A2C46] rounded-full overflow-hidden">
                  <div className={`h-full ${s.bar} transition-all duration-500`} style={{ width: `${z.risk}%` }} />
                </div>
              </div>

              {/* Reason */}
              <div className="col-span-3 text-xs text-[#8A9EB8] pr-4 leading-relaxed">{z.reason}</div>

              {/* Assets */}
              <div className="col-span-1 flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1 text-xs text-[#8A9EB8] bg-[#112136] px-2 py-0.5 rounded border border-[#1A2C46]">
                  <Users size={11} /> {z.pop}
                </div>
                <div className="flex gap-1">
                  {z.facilities.map(f => <FacilityIcon key={f} name={f} />)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-[#8A9EB8]">
        <span className="font-semibold text-white">Severity:</span>
        {Object.entries(severityMap).reverse().map(([k, v]) => (
          <span key={k} className={`flex items-center gap-1.5 ${v.color}`}>
            <span className={`w-2 h-2 rounded-full ${v.bar}`} />
            {v.label}
          </span>
        ))}
      </div>
    </div>
  );
}
