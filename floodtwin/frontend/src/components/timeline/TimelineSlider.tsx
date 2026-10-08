import { useEffect } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Clock,
  CloudRain, Waves, Wind
} from 'lucide-react';
import clsx from 'clsx';

export interface TimelineStep {
  id: string;
  hourOffset: number;
  label: string;
  timeDisplay: string;
  weatherSummary: string;
  rainRate: number; // mm/h
  precip3dDelta: number; // mm accumulated addition
  tideLevel: number; // meters
  surgeHeight: number; // meters
  riskMultiplier: number; // risk scaling factor
  cycloneDistanceKm: number;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  summary: string;
}

export const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: 't-0',
    hourOffset: 0,
    label: 'Now',
    timeDisplay: 'Oct 08, 22:45',
    weatherSummary: 'Approaching Convective Band',
    rainRate: 18.5,
    precip3dDelta: 0,
    tideLevel: 2.8,
    surgeHeight: 0.4,
    riskMultiplier: 1.0,
    cycloneDistanceKm: 320,
    severity: 'Moderate',
    summary: 'Active cyclone outer spiral bands generating moderate coastal rainfall and 2.8m rising tide.',
  },
  {
    id: 't-3',
    hourOffset: 3,
    label: '+3 Hours',
    timeDisplay: 'Oct 09, 01:45',
    weatherSummary: 'Heavy Squall Landfall',
    rainRate: 42.0,
    precip3dDelta: 35,
    tideLevel: 3.2,
    surgeHeight: 0.8,
    riskMultiplier: 1.3,
    cycloneDistanceKm: 240,
    severity: 'High',
    summary: 'Squall line makes direct coastal landfall. Low-elevation natural drainage bottlenecks begin pooling water.',
  },
  {
    id: 't-6',
    hourOffset: 6,
    label: '+6h Peak Surge',
    timeDisplay: 'Oct 09, 04:45',
    weatherSummary: 'Monsoon Torrential Deluge',
    rainRate: 78.0,
    precip3dDelta: 85,
    tideLevel: 3.6,
    surgeHeight: 1.4,
    riskMultiplier: 1.75,
    cycloneDistanceKm: 180,
    severity: 'Critical',
    summary: 'PEAK HAZARD: Coincidence of 3.6m Spring High Tide crest with 78mm/h cloudburst. Estuary backflow and basin overflow.',
  },
  {
    id: 't-12',
    hourOffset: 12,
    label: '+12 Hours',
    timeDisplay: 'Oct 09, 10:45',
    weatherSummary: 'Sustained Catchment Runoff',
    rainRate: 32.0,
    precip3dDelta: 110,
    tideLevel: 2.9,
    surgeHeight: 0.9,
    riskMultiplier: 1.45,
    cycloneDistanceKm: 260,
    severity: 'High',
    summary: 'Heavy runoff from upstream mountain catchments discharges through lowland river deltas.',
  },
  {
    id: 't-24',
    hourOffset: 24,
    label: '+24 Hours',
    timeDisplay: 'Oct 09, 22:45',
    weatherSummary: 'Intermittent Rain Bands',
    rainRate: 12.0,
    precip3dDelta: 125,
    tideLevel: 2.4,
    surgeHeight: 0.3,
    riskMultiplier: 0.95,
    cycloneDistanceKm: 420,
    severity: 'Moderate',
    summary: 'Precipitation subsiding. Floodwaters begin slow natural discharge towards Makassar Strait.',
  },
  {
    id: 't-48',
    hourOffset: 48,
    label: '+48 Hours',
    timeDisplay: 'Oct 10, 22:45',
    weatherSummary: 'Scattered Showers',
    rainRate: 4.0,
    precip3dDelta: 130,
    tideLevel: 2.1,
    surgeHeight: 0.1,
    riskMultiplier: 0.6,
    cycloneDistanceKm: 650,
    severity: 'Low',
    summary: 'Secondary drainage phase. Major transport arterial corridors draining and reopening.',
  },
  {
    id: 't-72',
    hourOffset: 72,
    label: '+72 Hours',
    timeDisplay: 'Oct 11, 22:45',
    weatherSummary: 'Clearing Skies',
    rainRate: 0.0,
    precip3dDelta: 130,
    tideLevel: 1.8,
    surgeHeight: 0.0,
    riskMultiplier: 0.35,
    cycloneDistanceKm: 900,
    severity: 'Low',
    summary: 'Weather normalized. Residual pooling confined to agricultural depressions and low-permeability soils.',
  },
];

interface TimelineSliderProps {
  currentStepIndex: number;
  onStepChange: (index: number, step: TimelineStep) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed?: number;
  onChangeSpeed?: (speed: number) => void;
}

export default function TimelineSlider({
  currentStepIndex,
  onStepChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed = 1,
  onChangeSpeed,
}: TimelineSliderProps) {
  const currentStep = TIMELINE_STEPS[currentStepIndex] || TIMELINE_STEPS[0];

  // Auto-advance loop when playing
  useEffect(() => {
    if (!isPlaying) return;
    const intervalTime = 3000 / playbackSpeed;
    const timer = setInterval(() => {
      onStepChange(
        (currentStepIndex + 1) % TIMELINE_STEPS.length,
        TIMELINE_STEPS[(currentStepIndex + 1) % TIMELINE_STEPS.length]
      );
    }, intervalTime);
    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, playbackSpeed, onStepChange]);

  const handlePrev = () => {
    const prev = (currentStepIndex - 1 + TIMELINE_STEPS.length) % TIMELINE_STEPS.length;
    onStepChange(prev, TIMELINE_STEPS[prev]);
  };

  const handleNext = () => {
    const next = (currentStepIndex + 1) % TIMELINE_STEPS.length;
    onStepChange(next, TIMELINE_STEPS[next]);
  };

  const SEVERITY_BADGE = {
    Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    Moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    High: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    Critical: 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse',
  };

  return (
    <div className="bg-[#081220]/95 backdrop-blur-md border border-[#1A2C46] rounded-xl p-3 shadow-2xl space-y-2">
      {/* Top Header: Timeline Title & Key Forecast Indicators */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Clock size={16} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">
              Forecast Timeline
            </span>
            <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border', SEVERITY_BADGE[currentStep.severity])}>
              {currentStep.severity.toUpperCase()} HAZARD
            </span>
          </div>
        </div>

        {/* Live Forecast Telemetry Pills */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-[#0D1B2E] border border-[#1A2C46] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <CloudRain size={13} className="text-cyan-400" />
            <span className="text-[10px] text-[#8A9EB8]">Rain:</span>
            <span className="font-mono font-bold text-white">{currentStep.rainRate} mm/h</span>
          </div>

          <div className="bg-[#0D1B2E] border border-[#1A2C46] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <Waves size={13} className="text-blue-400" />
            <span className="text-[10px] text-[#8A9EB8]">Tide:</span>
            <span className="font-mono font-bold text-white">{currentStep.tideLevel}m</span>
          </div>

          <div className="bg-[#0D1B2E] border border-[#1A2C46] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <Wind size={13} className="text-orange-400" />
            <span className="text-[10px] text-[#8A9EB8]">Cyclone:</span>
            <span className="font-mono font-bold text-orange-400">{currentStep.cycloneDistanceKm} km W</span>
          </div>
        </div>
      </div>

      {/* Scrubber Track & Step Buttons */}
      <div className="space-y-1.5">
        {/* Step Buttons Row */}
        <div className="grid grid-cols-7 gap-1">
          {TIMELINE_STEPS.map((step, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isPeak = step.id === 't-6';
            return (
              <button
                key={step.id}
                onClick={() => onStepChange(idx, step)}
                className={clsx(
                  'py-1.5 px-1 rounded-lg border text-center transition-all flex flex-col items-center justify-center relative',
                  isCurrent
                    ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] font-bold'
                    : isPeak
                    ? 'bg-red-950/40 border-red-500/40 text-red-300 hover:bg-red-900/40'
                    : 'bg-[#0D1B2E] border-[#1A2C46] text-[#8A9EB8] hover:text-white hover:bg-[#132742]'
                )}
              >
                <div className="text-[11px] font-mono leading-tight">{step.label}</div>
                <div className="text-[9px] opacity-75 font-sans truncate">{step.rainRate}mm/h</div>
                {isPeak && !isCurrent && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* Continuous Interactive Scrubber Slider */}
        <div className="relative flex items-center pt-1 pb-0.5">
          <style>{`
            .timeline-range::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59,130,246,0.25), 0 0 10px rgba(59,130,246,0.5);
              border: 2px solid #93c5fd;
              cursor: pointer;
              transition: box-shadow 0.15s, transform 0.15s;
            }
            .timeline-range::-webkit-slider-thumb:hover {
              box-shadow: 0 0 0 5px rgba(59,130,246,0.35), 0 0 16px rgba(59,130,246,0.6);
              transform: scale(1.15);
            }
            .timeline-range::-moz-range-thumb {
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59,130,246,0.25);
              border: 2px solid #93c5fd;
              cursor: pointer;
            }
            .timeline-range::-webkit-slider-runnable-track {
              height: 6px;
              border-radius: 999px;
              background: linear-gradient(
                to right,
                #3b82f6 0%,
                #3b82f6 var(--pct, 0%),
                #1A2C46 var(--pct, 0%),
                #1A2C46 100%
              );
              border: 1px solid #243554;
            }
            .timeline-range::-moz-range-track {
              height: 6px;
              border-radius: 999px;
              background: #1A2C46;
              border: 1px solid #243554;
            }
            .timeline-range::-moz-range-progress {
              height: 6px;
              border-radius: 999px;
              background: #3b82f6;
            }
          `}</style>
          <input
            type="range"
            min="0"
            max={TIMELINE_STEPS.length - 1}
            step="1"
            value={currentStepIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              onStepChange(idx, TIMELINE_STEPS[idx]);
            }}
            className="timeline-range w-full appearance-none cursor-pointer bg-transparent"
            style={{
              '--pct': `${(currentStepIndex / (TIMELINE_STEPS.length - 1)) * 100}%`,
            } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Bottom Bar: Playback Controls & Briefing Context */}
      <div className="flex items-center justify-between pt-1 border-t border-[#1A2C46]/60 text-xs">
        {/* Play / Step Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            title="Previous Step"
            className="p-1.5 rounded-lg bg-[#0D1B2E] hover:bg-[#132742] border border-[#1A2C46] text-[#8A9EB8] hover:text-white transition"
          >
            <SkipBack size={13} />
          </button>

          <button
            onClick={onTogglePlay}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition text-xs shadow-md',
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
            )}
          >
            {isPlaying ? (
              <>
                <Pause size={13} /> Pause Simulation
              </>
            ) : (
              <>
                <Play size={13} /> Run Forecast Playback
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            title="Next Step"
            className="p-1.5 rounded-lg bg-[#0D1B2E] hover:bg-[#132742] border border-[#1A2C46] text-[#8A9EB8] hover:text-white transition"
          >
            <SkipForward size={13} />
          </button>

          {onChangeSpeed && (
            <div className="flex items-center gap-1 ml-2 bg-[#0D1B2E] border border-[#1A2C46] rounded-lg p-0.5 text-[10px]">
              {[1, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => onChangeSpeed(speed)}
                  className={clsx(
                    'px-2 py-0.5 rounded font-mono',
                    playbackSpeed === speed ? 'bg-blue-600 text-white font-bold' : 'text-[#8A9EB8] hover:text-white'
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Narrative forecast preview */}
        <div className="text-[11px] text-[#B4C6DF] truncate max-w-lg hidden md:block italic">
          "{currentStep.summary}"
        </div>
      </div>
    </div>
  );
}
