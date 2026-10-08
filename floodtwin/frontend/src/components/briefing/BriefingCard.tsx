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
          title: 'Targeted Evacuation Polygons',
          action: 'Deploy evacuation buses to sectors <15m elevation. Stage relief camps on high ground >25m.',
          status: isPeak ? 'IMMEDIATE DISPATCH' : 'PRE-STAGE',
        },
        {
          id: 'hydr-1',
          category: 'hydraulic',
          severity: 'HIGH',
          icon: Droplets,
          title: 'Sluice Gates & Dewatering Pumps',
          action: isPreStorm
            ? 'Open tidal sluice barrages now to maximize drainage before high tide.'
            : isPeak
            ? 'Close sea barrages against backflow; activate 500 m³/h diesel dewatering pumps.'
            : 'Re-open sluices as sea tide drops below 2.4m to evacuate pooled runoff.',
          status: 'MANDATORY PROTOCOL',
        },
        {
          id: 'power-1',
          category: 'power',
          severity: 'CRITICAL',
          icon: ZapOff,
          title: 'Substation De-energization',
          action: 'De-energize 11kV/33kV power feeders in >50% hazard sectors; verify hospital ICU generator fuel.',
          status: isPeak ? 'EXECUTE NOW' : 'STANDBY LOCKOUT',
        },
        {
          id: 'health-1',
          category: 'health',
          severity: 'HIGH',
          icon: Stethoscope,
          title: 'Potable Water & Medical Stockpile',
          action: 'Issue municipal Boil-Water advisory, distribute chlorine tablets, and pre-position anti-venom & doxycycline.',
          status: 'STOCKPILE & DISPATCH',
        },
        {
          id: 'trans-1',
          category: 'evacuation',
          severity: 'MODERATE',
          icon: Truck,
          title: 'Barricade Inundated Trunk Roads',
          action: 'Erect barricades on coastal highways and direct traffic to elevated detour routes.',
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
          title: 'Move to High Ground / Shelter',
          action: isPeak
            ? 'Move to upper floors or nearest shelter immediately with your Go-Bag (documents, medication, flashlight).'
            : 'Locate nearest high-ground shelter (>20m). Charge devices and store 5L drinking water per person.',
          status: 'LIFE SAFETY',
        },
        {
          id: 'res-2',
          category: 'power',
          severity: 'CRITICAL',
          icon: ZapOff,
          title: 'Shut Off Power Breaker & Gas',
          action: 'Turn off the main electrical breaker and LP gas valve before water reaches outlet sockets.',
          status: 'HOME SAFETY',
        },
        {
          id: 'res-3',
          category: 'hydraulic',
          severity: 'HIGH',
          icon: AlertTriangle,
          title: 'Never Walk or Drive in Floodwater',
          action: '15cm of moving water knocks down an adult; 30cm sweeps away a car. Avoid murky waters and live cables.',
          status: 'STRICT WARNING',
        },
        {
          id: 'res-4',
          category: 'health',
          severity: 'HIGH',
          icon: Droplets,
          title: 'Drink ONLY Boiled / Bottled Water',
          action: 'Drink only boiled or bottled water and wear boots to avoid submerged wound infections and snake bites.',
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
      const textToSpeak = `Flood Mitigation Briefing for ${timelineStep.label}. Weather status: ${timelineStep.weatherSummary}. Rainfall rate ${timelineStep.rainRate} millimeters per hour. Projected tide ${timelineStep.tideLevel} meters. There are ${criticalCount} sectors at critical flood risk. Key directive: ${suggestions[0]?.action}`;
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
    const sitRep = `=== FLOOD MITIGATION BRIEFING ===
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
    <div className="bg-[#081220] border border-blue-500/40 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden shadow-2xl h-full">
      {/* Decorative Gradient Accent */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 via-cyan-400 to-red-500" />

      {/* Header: Title, Grounding Badge, Role Toggle & Audio */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                Flood Mitigation Briefing
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono font-bold">
                  {timelineStep.label}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Role Switcher */}
            <div className="bg-[#050B14] border border-[#1A2C46] rounded-lg p-0.5 flex text-xs">
              <button
                onClick={() => setRole('commander')}
                className={clsx(
                  'px-3 py-1 rounded-md font-semibold transition',
                  role === 'commander' ? 'bg-blue-600 text-white font-bold shadow' : 'text-[#8A9EB8] hover:text-white'
                )}
              >
                Commander
              </button>
              <button
                onClick={() => setRole('resident')}
                className={clsx(
                  'px-3 py-1 rounded-md font-semibold transition',
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
                'p-2 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5',
                isSpeaking
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                  : 'bg-[#0D1B2E] border-[#1A2C46] text-[#8A9EB8] hover:text-white'
              )}
            >
              {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Copy SitRep */}
            <button
              onClick={handleCopy}
              title="Copy Complete Operational SitRep"
              className="px-2.5 py-1.5 rounded-lg bg-[#0D1B2E] hover:bg-[#132742] border border-[#1A2C46] text-[#8A9EB8] hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'SitRep'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Executive Situation Summary */}
        <div className="bg-[#050B14] border border-[#1A2C46] rounded-xl p-3 text-sm text-[#CBD5E1] leading-relaxed">
          <p>
            {timelineStep.hourOffset === 6 ? (
              <>
                <strong className="text-red-400 font-bold">⚠️ CRITICAL SURGE ALERT: </strong>
                High Tide of <strong className="text-white font-mono font-bold">3.6m</strong> and <strong className="text-cyan-400 font-mono font-bold">78 mm/h</strong> rainfall creating severe backflow in coastal channels. <strong className="text-red-400 font-mono font-bold">{criticalCount} sectors</strong> at critical hazard. Execute immediate evacuations.
              </>
            ) : timelineStep.hourOffset <= 3 ? (
              <>
                <strong className="text-amber-400 font-bold">🌊 PRE-STORM WINDOW: </strong>
                Approaching squall lines (<strong className="text-white font-mono">{timelineStep.rainRate} mm/h</strong>). Low-lying coastal sectors require preemptive sluice drainage & shelter preparation before peak surge.
              </>
            ) : (
              <>
                <strong className="text-blue-400 font-bold">ℹ️ DRAINAGE & RECOVERY PHASE: </strong>
                Rainfall tapering (<strong className="text-white font-mono">{timelineStep.rainRate} mm/h</strong>). Water levels slowly receding. Prioritize disease prevention, safe drinking water, and infrastructure clearing.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Action Categories Tabs */}
      <div className="flex items-center gap-1.5 my-2 overflow-x-auto text-xs">
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
              'px-3 py-1 rounded-lg font-medium shrink-0 transition text-xs',
              activeCategory === cat.key
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'text-[#8A9EB8] hover:text-white bg-[#0D1B2E] border border-[#1A2C46]'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Actionable Real-World Directives List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-56">
        {filteredSuggestions.map((s) => {
          const Icon = s.icon;
          const isDone = !!checkedItems[s.id];
          return (
            <div
              key={s.id}
              onClick={() => toggleCheck(s.id)}
              className={clsx(
                'p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none',
                isDone
                  ? 'bg-[#050B14]/60 border-emerald-500/30 opacity-70'
                  : 'bg-[#0D1B2E] border-[#1A2C46] hover:bg-[#132742]'
              )}
            >
              <div className={clsx('mt-0.5 shrink-0', isDone ? 'text-emerald-400' : 'text-blue-400')}>
                {isDone ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={clsx('font-bold text-sm', isDone ? 'line-through text-[#8A9EB8]' : 'text-white')}>
                    {s.title}
                  </span>
                  <span className={clsx(
                    'text-[10px] font-mono px-2 py-0.5 rounded font-bold border shrink-0',
                    s.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                    s.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                    'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  )}>
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-[#CBD5E1] mt-1 leading-normal">
                  {s.action}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-2.5 mt-2 border-t border-[#1A2C46] flex items-center justify-between text-xs text-[#5C85C5]">
        <span>Standard Operating Protocol: NDMA & Coastal Flood Directive</span>
        <span>Helpline: <strong className="text-white">112 (Disaster Ops)</strong></span>
      </div>
    </div>
  );
}
