import React from 'react';
import { Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import type { TemporalForecastResponse } from '../../lib/api-client';

interface Props {
  forecast: TemporalForecastResponse;
  onSelect?: () => void;
}

export const ZoneCard: React.FC<Props> = ({ forecast, onSelect }) => {
  const { onset_str, peak_str, peak_probability_percent, onset_status } = forecast;

  return (
    <div
      onClick={onSelect}
      className="p-3 bg-[#0B1424] border border-[#1E2D45] rounded-xl hover:border-cyan-500/50 transition cursor-pointer space-y-2"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-white">{forecast.location_name}</span>
        <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded flex items-center gap-1">
          <Clock size={10} className="text-cyan-400" />
          Chronos-T5
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#050B14] p-2 rounded-lg border border-[#1A2C46]">
          <div className="text-[10px] text-[#8A9EB8] flex items-center gap-1">
            <AlertTriangle size={11} className="text-amber-400" />
            Onset: {onset_status}
          </div>
          <div className="font-mono font-bold text-white mt-0.5">{onset_str}</div>
        </div>

        <div className="bg-[#050B14] p-2 rounded-lg border border-[#1A2C46]">
          <div className="text-[10px] text-[#8A9EB8] flex items-center gap-1">
            <TrendingUp size={11} className="text-rose-400" />
            Peak: {peak_probability_percent}%
          </div>
          <div className="font-mono font-bold text-white mt-0.5">{peak_str}</div>
        </div>
      </div>
    </div>
  );
};
