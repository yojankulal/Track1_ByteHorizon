import { useState } from 'react';
import {
  Sparkles, AlertTriangle, Volume2, VolumeX,
  Copy, Check, LifeBuoy, ZapOff, Droplets, Truck, Stethoscope,
  CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';
import { TimelineStep } from '../timeline/TimelineSlider';
import { GridCell } from '../../lib/api-client';

interface BriefingCardProps {
  timelineStep: TimelineStep;
  criticalCount: number;
  highRiskCount: number;
  totalSectors: number;
  maxProbability: number;
  selectedCell: GridCell | null;
}

export default function BriefingCard({
  timelineStep,
  criticalCount,
  highRiskCount,
  maxProbability,
}: BriefingCardProps) {
  const [role, setRole] = useState<'commander' | 'resident'>('commander');
  const [activeCategory, setActiveCategory] = useState<'all' | 'evacuation' | 'hydraulic' | 'power' | 'health'>('all');
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Generate real-world situational suggestions based on timeline forecast step and risk metrics
  const getSuggestions = () => {
    const isPeak = timelineStep.hourOffset === 6;
    const isPreStorm = timelineStep.hourOffset <= 3;

    if (role === 'commander') {
      return [
        {
          id: 'evac-1',
          category: 'evacuation',
          severity: isPeak ? 'CRITICAL' : 'HIGH',
          icon: LifeBuoy,
          title: 'Targeted Low-Elevation Evacuation Polygons',
          action: `Deploy evacuation buses & NDRF/SDRF teams to sectors with elevation < 15m and TWI > 8.0. Stage high-ground relief camps at locations > 25m DEM. Priority transfer for dialysis & bedridden patients.`,
          status: isPeak ? 'IMMEDIATE DISPATCH' : 'PRE-STAGE',
        },
        {
          id: 'hydr-1',
          category: 'hydraulic',
          severity: 'HIGH',
          icon: Droplets,
          title: 'Tidal Sluice Gate & Dewatering Pump Operation',
          action: isPreStorm
            ? 'Open coastal tidal barrages and gravity outfall gates immediately to maximize urban drainage discharge before the 3.6m Spring High Tide crest.'
            : isPeak
            ? 'Close sea-facing tidal barrages to prevent seawater backflow into municipal river estuaries. Run 500 m³/hr mobile diesel dewatering pumps at critical underpasses.'
            : 'Re-open sluice gates as sea tide recedes below 2.4m to evacuate pooled catchment runoff towards Makassar Strait.',
          status: 'MANDATORY PROTOCOL',
        },
        {
          id: 'power-1',
          category: 'power',
          severity: 'CRITICAL',
          icon: ZapOff,
          title: 'Substation De-energization & Elevated Backup Power',
          action: `Remotely isolate distribution transformers and de-energize 11kV/33kV feeder lines in sectors with > 50% flood probability to prevent fatal electrocutions. Ensure government hospital ICU generators are fueled on elevated platforms.`,
          status: isPeak ? 'EXECUTE NOW' : 'STANDBY LOCKOUT',
        },
        {
          id: 'health-1',
          category: 'health',
          severity: 'HIGH',
          icon: Stethoscope,
          title: 'Potable Water Distribution & Leptospirosis Prophylaxis',
          action: `Issue immediate municipal Boil-Water Advisory. Distribute Halazone / NaDCC chlorine purification tablets. Pre-position anti-venom (for displaced snakes in flooded brush) and Doxycycline capsules against floodwater-borne Leptospirosis.`,
          status: 'STOCKPILE & DISPATCH',
        },
        {
          id: 'trans-1',
          category: 'evacuation',
          severity: 'MODERATE',
          icon: Truck,
          title: 'Barricade Inundated Coastal Highways & Underpasses',
          action: `Erect hard barricades with emergency flashers on coastal trunk roads and low-lying river overpasses. Broadcast alternative high-elevation relief transit routes.`,
          status: 'TRAFFIC CONTROL',
        },
      ];
    } else {
      // Resident & Public Safety Advice
      return [
        {
          id: 'res-1',
          category: 'evacuation',
          severity: 'CRITICAL',
          icon: LifeBuoy,
          title: 'Move to First Floor / Designated Shelter',
          action: isPeak
            ? 'WATER LEVEL RISING: Immediately move to upper floors or evacuation centers. Take "Go-Bag" (documents in waterproof pouch, 3 days of water, medication, flashlight, power bank).'
            : 'Locate your nearest high-ground community shelter (>20m elevation). Charge all mobile devices and store 5 liters of drinking water per person.',
          status: 'LIFE SAFETY',
        },
        {
          id: 'res-2',
          category: 'power',
          severity: 'CRITICAL',
          icon: ZapOff,
          title: 'Turn Off Main Electrical Breaker & Gas Valve',
          action: 'If water begins entering your home, shut off the main electrical breaker box and LP gas cylinder valve before water reaches outlet sockets to prevent electrocution and fires.',
          status: 'HOME SAFETY',
        },
        {
          id: 'res-3',
          category: 'hydraulic',
          severity: 'HIGH',
          icon: AlertTriangle,
          title: 'Turn Around, Don’t Drown — Never Walk or Drive in Water',
          action: 'Just 15 cm (6 inches) of moving water can knock down an adult; 30 cm can float and sweep away a car. Avoid walking through dark murky floodwaters concealing open manholes and live cables.',
          status: 'STRICT WARNING',
        },
        {
          id: 'res-4',
          category: 'health',
          severity: 'HIGH',
          icon: Droplets,
          title: 'Drink ONLY Boiled / Purified Water & Wear Boots',
          action: 'Do not drink tap or well water which may be contaminated with sewage or chemical runoff. Wear sturdy boots to prevent wound infections and snake bites in submerged yards.',
          status: 'HEALTH ADVISORY',
        },
      ];
    }
  };

  const suggestions = getSuggestions();
  const filteredSuggestions = activeCategory === 'all'
    ? suggestions
    : suggestions.filter(s => s.category === activeCategory);

  // Audio Speech Synthesis for AI Briefing
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToSpeak = `FloodTwin AI Emergency Briefing for ${timelineStep.label}. Weather status: ${timelineStep.weatherSummary}. Rainfall rate ${timelineStep.rainRate} millimeters per hour. Projected tide ${timelineStep.tideLevel} meters. There are ${criticalCount} sectors at critical flood risk. Key directive: ${suggestions[0]?.action}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Copy SitRep to clipboard
  const handleCopy = () => {
    const sitRep = `=== FLOODTWIN AI EMERGENCY SITREP ===
Timestamp: ${timelineStep.timeDisplay} (${timelineStep.label})
Hazard Status: ${timelineStep.severity} Hazard (${timelineStep.weatherSummary})
Rain Rate: ${timelineStep.rainRate} mm/h | Tidal Height: ${timelineStep.tideLevel} m (+${timelineStep.surgeHeight}m surge)
Critical Sectors: ${criticalCount} | High-Risk Sectors: ${highRiskCount} (Peak Probability: ${(maxProbability * 100).toFixed(1)}%)

OPERATIONAL DIRECTIVES:
${suggestions.map((s, i) => `${i + 1}. [${s.severity}] ${s.title}: ${s.action}`).join('\n')}

Emergency Helpline: 112 / Coastal Disaster Command Center
Generated by FloodTwin Coastal AI Digital Twin`;

    navigator.clipboard.writeText(sitRep);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-[#081220] border border-blue-500/40 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-2xl h-full">
      {/* Decorative Gradient Accent */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 via-cyan-400 to-red-500" />

      {/* Header: Title, Grounding Badge, Role Toggle & Audio */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-blue-400">
              <Sparkles size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                FloodTwin AI Decision Briefing
                <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
                  {timelineStep.label}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Role Switcher */}
            <div className="bg-[#050B14] border border-[#1A2C46] rounded-lg p-0.5 flex text-[10px]">
              <button
                onClick={() => setRole('commander')}
                className={clsx(
                  'px-2.5 py-0.5 rounded font-medium transition',
                  role === 'commander' ? 'bg-blue-600 text-white font-bold shadow' : 'text-[#8A9EB8] hover:text-white'
                )}
              >
                Commander
              </button>
              <button
                onClick={() => setRole('resident')}
                className={clsx(
                  'px-2.5 py-0.5 rounded font-medium transition',
                  role === 'resident' ? 'bg-emerald-600 text-white font-bold shadow' : 'text-[#8A9EB8] hover:text-white'
                )}
              >
                Resident
              </button>
            </div>

            {/* Audio announcement */}
            <button
              onClick={handleToggleSpeech}
              title={isSpeaking ? 'Stop Audio Broadcast' : 'Listen to Voice Briefing'}
              className={clsx(
                'p-1.5 rounded-lg border text-xs transition flex items-center gap-1',
                isSpeaking
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                  : 'bg-[#0D1B2E] border-[#1A2C46] text-[#8A9EB8] hover:text-white'
              )}
            >
              {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>

            {/* Copy SitRep */}
            <button
              onClick={handleCopy}
              title="Copy Complete Operational SitRep"
              className="p-1.5 rounded-lg bg-[#0D1B2E] hover:bg-[#132742] border border-[#1A2C46] text-[#8A9EB8] hover:text-white transition flex items-center gap-1 text-[10px]"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'SitRep'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Executive Situation Summary */}
        <div className="bg-[#050B14] border border-[#1A2C46] rounded-lg p-2.5 text-xs text-[#B4C6DF] leading-relaxed">
          <p>
            {timelineStep.hourOffset === 6 ? (
              <>
                <strong className="text-red-400 font-bold">⚠️ CRITICAL SURGE ALERT: </strong>
                High Tide of <strong className="text-white font-mono">3.6m</strong> and <strong className="text-cyan-400 font-mono">78 mm/h</strong> rainfall creating severe backflow in coastal channels. <strong className="text-red-400 font-mono">{criticalCount} sectors</strong> at critical hazard. Execute immediate evacuations.
              </>
            ) : timelineStep.hourOffset <= 3 ? (
              <>
                <strong className="text-amber-400 font-bold">🌊 PRE-STORM WINDOW: </strong>
                Approaching squall lines ({timelineStep.rainRate} mm/h). Low-lying coastal sectors require preemptive sluice drainage & shelter preparation before peak surge.
              </>
            ) : (
              <>
                <strong className="text-blue-400 font-bold">ℹ️ DRAINAGE & RECOVERY PHASE: </strong>
                Rainfall tapering ({timelineStep.rainRate} mm/h). Water levels slowly receding. Prioritize disease prevention, safe drinking water, and infrastructure clearing.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Action Categories Tabs */}
      <div className="flex items-center gap-1 my-1.5 overflow-x-auto text-[10px]">
        {[
          { key: 'all', label: 'All Directives' },
          { key: 'evacuation', label: 'Rescue & Shelters' },
          { key: 'hydraulic', label: 'Sluice & Pumps' },
          { key: 'power', label: 'Power & Grid' },
          { key: 'health', label: 'Water & Health' },
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key as any)}
            className={clsx(
              'px-2 py-0.5 rounded font-medium shrink-0 transition',
              activeCategory === cat.key
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 font-bold'
                : 'text-[#8A9EB8] hover:text-white bg-[#0D1B2E] border border-[#1A2C46]'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Actionable Real-World Directives List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-52">
        {filteredSuggestions.map((s) => {
          const Icon = s.icon;
          const isDone = !!checkedItems[s.id];
          return (
            <div
              key={s.id}
              onClick={() => toggleCheck(s.id)}
              className={clsx(
                'p-2 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 text-xs select-none',
                isDone
                  ? 'bg-[#050B14]/60 border-emerald-500/30 opacity-70'
                  : 'bg-[#0D1B2E] border-[#1A2C46] hover:bg-[#132742]'
              )}
            >
              <div className={clsx('mt-0.5 shrink-0', isDone ? 'text-emerald-400' : 'text-blue-400')}>
                {isDone ? <CheckCircle2 size={15} /> : <Icon size={15} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={clsx('font-bold text-[11px]', isDone ? 'line-through text-[#8A9EB8]' : 'text-white')}>
                    {s.title}
                  </span>
                  <span className={clsx(
                    'text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border shrink-0',
                    s.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                    s.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                    'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  )}>
                    {s.status}
                  </span>
                </div>
                <p className="text-[10px] text-[#B4C6DF] mt-0.5 leading-snug">
                  {s.action}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-2 mt-1 border-t border-[#1A2C46] flex items-center justify-between text-[10px] text-[#5C85C5]">
        <span>Standard Operating Protocol: NDMA & Coastal Flood Directive</span>
        <span>Helpline: <strong>112 (Disaster Ops)</strong></span>
      </div>
    </div>
  );
}
