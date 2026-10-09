import { useState } from 'react';
import {
  Sparkles, AlertTriangle, Volume2, VolumeX,
  Copy, Check, LifeBuoy, ZapOff, Droplets, Truck, Stethoscope,
  CheckCircle2, Shield, Users, Radio, CheckCheck
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
  const [ttsLang, setTtsLang] = useState<'en' | 'id'>('en');
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

  const completedCount = suggestions.filter(s => !!checkedItems[s.id]).length;

  // Audio Speech Synthesis for AI Briefing (Supports English & Bahasa Indonesia)
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const weatherMapID: Record<string, string> = {
        'Approaching Convective Band': 'Pita Konvektif Mendekat',
        'Heavy Squall Landfall': 'Pendaratan Badai Kencang',
        'Monsoon Torrential Deluge': 'Hujan Lebat Muson',
        'Sustained Catchment Runoff': 'Limpasan Daerah Aliran Sungai',
        'Intermittent Rain Bands': 'Pita Hujan Terputus-putus',
        'Scattered Showers': 'Hujan Lokal Tersebar',
        'Clearing Skies': 'Cuaca Cerah Berawan',
      };

      const keyDirectiveIndo = suggestions[0]?.id === 'evac-1'
        ? 'Kirim bus evakuasi ke sektor elevasi rendah di bawah 15 meter. Siapkan posko pengungsian di dataran tinggi di atas 25 meter.'
        : suggestions[0]?.id === 'res-1'
        ? 'Segera pindah ke dataran tinggi atau tempat pengungsian terdekat membawa Tas Siaga Bencana.'
        : suggestions[0]?.action;

      const textToSpeak = ttsLang === 'id'
        ? `Laporan Mitigasi Banjir untuk ${timelineStep.label}. Status cuaca: ${weatherMapID[timelineStep.weatherSummary] || timelineStep.weatherSummary}. Curah hujan ${timelineStep.rainRate} milimeter per jam. Pasang laut ${timelineStep.tideLevel} meter. Terdapat ${criticalCount} sektor pada risiko banjir kritis. Arahan utama: ${keyDirectiveIndo}`
        : `Flood Mitigation Briefing for ${timelineStep.label}. Weather status: ${timelineStep.weatherSummary}. Rainfall rate ${timelineStep.rainRate} millimeters per hour. Projected tide ${timelineStep.tideLevel} meters. There are ${criticalCount} sectors at critical flood risk. Key directive: ${suggestions[0]?.action}`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = ttsLang === 'id' ? 'id-ID' : 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Automatically select Bahasa Indonesia voice if available
      if (ttsLang === 'id') {
        const voices = window.speechSynthesis.getVoices();
        const idVoice = voices.find(v => v.lang.toLowerCase().includes('id') || v.name.toLowerCase().includes('indonesia'));
        if (idVoice) {
          utterance.voice = idVoice;
        }
      }

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
    <div className="bg-[#081220] border border-[#1A2C46] rounded-xl p-4 flex flex-col justify-between relative overflow-hidden shadow-2xl h-full space-y-3">
      {/* Decorative Gradient Accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 via-cyan-400 to-indigo-600" />

      {/* Header: Title, Grounding Badge, Role Toggle & Audio */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Flood Mitigation Briefing
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/15 text-cyan-300 border border-blue-500/30 font-mono font-bold">
                  {timelineStep.label}
                </span>
              </div>
              <p className="text-xs text-[#8A9EB8] mt-0.5">
                Real-time operational directives synced to hydrological forecast timeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Role Switcher */}
            <div className="bg-[#050B14] border border-[#1A2C46] rounded-lg p-0.5 flex text-xs">
              <button
                onClick={() => setRole('commander')}
                className={clsx(
                  'px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5',
                  role === 'commander'
                    ? 'bg-blue-600 text-white font-bold shadow-md'
                    : 'text-[#8A9EB8] hover:text-white'
                )}
              >
                <Shield size={13} />
                <span>Commander</span>
              </button>
              <button
                onClick={() => setRole('resident')}
                className={clsx(
                  'px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5',
                  role === 'resident'
                    ? 'bg-emerald-600 text-white font-bold shadow-md'
                    : 'text-[#8A9EB8] hover:text-white'
                )}
              >
                <Users size={13} />
                <span>Public Safety</span>
              </button>
            </div>

            {/* TTS Language Switcher */}
            <div className="bg-[#050B14] border border-[#1A2C46] rounded-lg p-0.5 flex text-xs">
              <button
                onClick={() => setTtsLang('en')}
                title="Voice Briefing in English"
                className={clsx(
                  'px-2 py-1 rounded font-bold transition text-[11px]',
                  ttsLang === 'en'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#8A9EB8] hover:text-white'
                )}
              >
                EN
              </button>
              <button
                onClick={() => setTtsLang('id')}
                title="Voice Briefing in Bahasa Indonesia"
                className={clsx(
                  'px-2 py-1 rounded font-bold transition text-[11px] flex items-center gap-1',
                  ttsLang === 'id'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-[#8A9EB8] hover:text-white'
                )}
              >
                <span>🇮🇩</span>
                <span>ID</span>
              </button>
            </div>

            {/* Audio broadcast */}
            <button
              onClick={handleToggleSpeech}
              title={isSpeaking ? 'Stop Voice Broadcast' : `Listen to Voice Briefing (${ttsLang === 'id' ? 'Bahasa Indonesia' : 'English'})`}
              className={clsx(
                'p-2 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5',
                isSpeaking
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse ring-1 ring-red-400/50'
                  : 'bg-[#0D1B2E] border-[#1A2C46] text-[#8A9EB8] hover:text-white hover:bg-[#132742]'
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

        {/* Dynamic Executive Situation Summary Banner */}
        <div className="bg-[#050B14] border border-[#1A2C46] rounded-xl p-3 text-xs sm:text-sm text-[#CBD5E1] leading-relaxed relative">
          <div className="flex items-start gap-2.5">
            <Radio size={16} className="text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              {timelineStep.hourOffset === 6 ? (
                <>
                  <strong className="text-red-400 font-bold">CRITICAL PEAK SURGE: </strong>
                  High Tide of <strong className="text-white font-mono font-bold">3.6m</strong> combined with <strong className="text-cyan-400 font-mono font-bold">78 mm/h</strong> rainfall is triggering severe channel backflow. <strong className="text-red-400 font-mono font-bold">{criticalCount} sectors</strong> are under immediate hazard. Execute priority evacuations now.
                </>
              ) : timelineStep.hourOffset <= 3 ? (
                <>
                  <strong className="text-amber-400 font-bold">PRE-STORM DRAINAGE WINDOW: </strong>
                  Approaching squall lines (<strong className="text-white font-mono">{timelineStep.rainRate} mm/h</strong>). Low-lying coastal sectors require preemptive tidal gate sluice drainage and high-ground shelter preparation before peak surge.
                </>
              ) : (
                <>
                  <strong className="text-blue-400 font-bold">RECESSION & RECOVERY PHASE: </strong>
                  Rainfall rate tapering to <strong className="text-white font-mono">{timelineStep.rainRate} mm/h</strong>. Runoff is slowly receding. Prioritize drinking water sanitation, debris clearing, and infrastructure safety inspections.
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Categories Tabs & Progress Indicator */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs py-0.5 border-b border-[#1A2C46]/50">
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { key: 'all', label: 'All Directives', count: suggestions.length },
            { key: 'evacuation', label: 'Evacuation & Shelters', count: suggestions.filter(s => s.category === 'evacuation').length },
            { key: 'hydraulic', label: 'Sluice & Pumps', count: suggestions.filter(s => s.category === 'hydraulic').length },
            { key: 'power', label: 'Power & Grid', count: suggestions.filter(s => s.category === 'power').length },
            { key: 'health', label: 'Water & Health', count: suggestions.filter(s => s.category === 'health').length },
          ].map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key as any)}
              className={clsx(
                'px-2.5 py-1 rounded-lg font-medium shrink-0 transition text-xs flex items-center gap-1.5',
                activeCategory === cat.key
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-[#8A9EB8] hover:text-white bg-[#0D1B2E] border border-[#1A2C46] hover:bg-[#132742]'
              )}
            >
              <span>{cat.label}</span>
              <span className={clsx(
                'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                activeCategory === cat.key ? 'bg-white/20 text-white' : 'bg-black/30 text-[#8A9EB8]'
              )}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Completion tracker */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-[#8A9EB8] shrink-0 pl-2">
          <CheckCheck size={14} className={completedCount > 0 ? 'text-emerald-400' : 'text-[#8A9EB8]'} />
          <span>{completedCount} / {suggestions.length} Checked</span>
        </div>
      </div>

      {/* Actionable Directives List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-52">
        {filteredSuggestions.map((s) => {
          const Icon = s.icon;
          const isDone = !!checkedItems[s.id];
          return (
            <div
              key={s.id}
              onClick={() => toggleCheck(s.id)}
              className={clsx(
                'p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none group',
                isDone
                  ? 'bg-[#050B14]/70 border-emerald-500/30 opacity-75'
                  : 'bg-[#0D1B2E] border-[#1A2C46] hover:bg-[#132742] hover:border-blue-500/40'
              )}
            >
              <div className={clsx(
                'mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25'
              )}>
                {isDone ? <CheckCircle2 size={16} /> : <Icon size={16} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={clsx('font-bold text-sm', isDone ? 'line-through text-[#8A9EB8]' : 'text-white')}>
                    {s.title}
                  </span>
                  <span className={clsx(
                    'text-[10px] font-mono px-2 py-0.5 rounded font-bold border shrink-0',
                    s.severity === 'CRITICAL' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                    s.severity === 'HIGH' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                    'bg-blue-500/15 text-blue-400 border-blue-500/30'
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
      <div className="pt-2 border-t border-[#1A2C46] flex items-center justify-between text-xs text-[#5C85C5]">
        <span className="flex items-center gap-1.5">
          <Shield size={13} className="text-blue-400" />
          Standard Operating Protocol: Coastal Flood Directive
        </span>
        <span>Emergency Ops Helpline: <strong className="text-white font-mono">112</strong></span>
      </div>
    </div>
  );
}
