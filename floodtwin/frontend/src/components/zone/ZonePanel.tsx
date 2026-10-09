import React from 'react';
import { Clock, TrendingUp, AlertTriangle, Waves, Sparkles, Activity } from 'lucide-react';
import type { TemporalForecastResponse } from '../../lib/api-client';

interface Props {
  forecast: TemporalForecastResponse | null;
  loading: boolean;
}

export const ZonePanel: React.FC<Props> = ({ forecast, loading }) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-[#1A2C46] bg-[#081220] p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-blue-400">
          <Activity size={15} className="animate-spin text-cyan-400" />
          <span>Running Chronos-T5 Zero-Shot Inference...</span>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return null;
  }

  const {
    onset_hour,
    onset_str,
    onset_range,
    onset_status,
    peak_str,
    peak_range,
    peak_probability_percent,
    hourly_series,
  } = forecast;

  const hasOnset = onset_hour !== null;

  // Chart Dimensions & Points
  const maxProb = 100;
  const svgWidth = 360;
  const svgHeight = 90;
  const paddingX = 15;
  const paddingY = 10;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  // Build SVG Path for Median Line and Quantile Band
  const points = hourly_series.map((pt, i) => {
    const x = paddingX + (i / Math.max(1, hourly_series.length - 1)) * chartW;
    const yMedian = paddingY + chartH - (pt.probability_percent / maxProb) * chartH;
    const yQ10 = paddingY + chartH - (pt.q10_probability_percent / maxProb) * chartH;
    const yQ90 = paddingY + chartH - (pt.q90_probability_percent / maxProb) * chartH;
    return { x, yMedian, yQ10, yQ90, ...pt };
  });

  const medianLinePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yMedian.toFixed(1)}`)
    .join(' ');

  // Quantile Area Polygon (Top line forward, bottom line reverse)
  const q90Forward = points.map((p) => `${p.x.toFixed(1)},${p.yQ90.toFixed(1)}`).join(' ');
  const q10Backward = [...points].reverse().map((p) => `${p.x.toFixed(1)},${p.yQ10.toFixed(1)}`).join(' ');
  const quantileAreaPath = `M ${q90Forward} L ${q10Backward} Z`;

  // 50% Threshold line Y
  const thresholdY = paddingY + chartH - (50 / maxProb) * chartH;

  return (
    <div className="rounded-xl border border-[#1A2C46] bg-[#081220] p-3.5 space-y-3 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1A2C46]/80 pb-2">
        <div className="flex items-center gap-1.5">
          <Clock size={15} className="text-cyan-400" />
          <h4 className="text-xs font-bold text-white tracking-wide">
            Flood Timing & Trajectory (Chronos-T5)
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center gap-1">
          <Sparkles size={11} className="text-cyan-400" />
          Zero-Shot
        </span>
      </div>

      {/* Onset and Peak Cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* Onset Card */}
        <div className="bg-[#050B14] border border-[#1A2C46] rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#8A9EB8] font-medium flex items-center gap-1">
              <AlertTriangle size={12} className={hasOnset ? 'text-amber-400' : 'text-emerald-400'} />
              Onset Time
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                hasOnset
                  ? onset_status === 'Imminent'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {onset_status}
            </span>
          </div>

          <div className="mt-1 font-mono text-base font-bold text-white">
            {onset_str}
          </div>

          <div className="mt-1 text-[10px] text-[#8A9EB8] font-mono">
            Uncertainty: <span className="text-cyan-300 font-semibold">{onset_range}</span>
          </div>
        </div>

        {/* Peak Card */}
        <div className="bg-[#050B14] border border-[#1A2C46] rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#8A9EB8] font-medium flex items-center gap-1">
              <TrendingUp size={12} className="text-rose-400" />
              Peak Surge
            </span>
            <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded">
              {peak_probability_percent}% Risk
            </span>
          </div>

          <div className="mt-1 font-mono text-base font-bold text-white">
            {peak_str}
          </div>

          <div className="mt-1 text-[10px] text-[#8A9EB8] font-mono">
            Uncertainty: <span className="text-rose-300 font-semibold">{peak_range}</span>
          </div>
        </div>
      </div>

      {/* 24-Hour Forecast Chart */}
      <div className="bg-[#050B14] border border-[#1A2C46] rounded-lg p-2.5">
        <div className="flex items-center justify-between text-[11px] text-[#8A9EB8] mb-1">
          <span className="flex items-center gap-1.5 font-medium text-white">
            <Waves size={13} className="text-blue-400" />
            24-Hour Probability Trajectory & Quantile Band
          </span>
          <span className="text-[10px] font-mono text-cyan-400">p10 — p90 CI</span>
        </div>

        {/* SVG Sparkline / Area Chart */}
        <div className="relative w-full h-[90px] flex items-center justify-center overflow-hidden">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full">
            {/* 50% Threshold guideline */}
            <line
              x1={paddingX}
              y1={thresholdY}
              x2={svgWidth - paddingX}
              y2={thresholdY}
              stroke="#EF4444"
              strokeDasharray="3 3"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
            <text
              x={svgWidth - paddingX - 4}
              y={thresholdY - 3}
              fill="#EF4444"
              fontSize="8"
              textAnchor="end"
              className="font-mono font-semibold"
            >
              50% Flood Threshold
            </text>

            {/* p10 - p90 Quantile Uncertainty Band */}
            <path d={quantileAreaPath} fill="#22D3EE" fillOpacity="0.12" />

            {/* Median Trend Line */}
            <path
              d={medianLinePath}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Key Marker Dots (Onset & Peak) */}
            {points.map((p, idx) => {
              if (p.is_peak) {
                return (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.yMedian} r="4" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="1.5" />
                    <text x={p.x} y={p.yMedian - 7} fill="#F43F5E" fontSize="8" textAnchor="middle" fontWeight="bold">
                      Peak ({p.probability_percent}%)
                    </text>
                  </g>
                );
              }
              if (p.is_onset) {
                return (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.yMedian} r="3.5" fill="#FBBF24" stroke="#FFFFFF" strokeWidth="1" />
                    <text x={p.x} y={p.yMedian - 6} fill="#FBBF24" fontSize="8" textAnchor="middle" fontWeight="bold">
                      Onset
                    </text>
                  </g>
                );
              }
              return null;
            })}
          </svg>
        </div>

        {/* X-axis Timeline labels */}
        <div className="flex justify-between text-[9px] font-mono text-[#5C85C5] mt-1 px-1">
          <span>Now (t=0)</span>
          <span>+6h</span>
          <span>+12h</span>
          <span>+18h</span>
          <span>+24h</span>
        </div>
      </div>
    </div>
  );
};
