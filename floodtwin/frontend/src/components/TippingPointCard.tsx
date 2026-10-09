import React from 'react';

export const TIP_COLORS: Record<string, string> = {
  'Flooded at any rain': '#7C3AED',
  'Extremely sensitive': '#C026D3',
  'Sensitive': '#EF4444',
  'Moderate': '#FB923C',
  'Resilient': '#22C55E',
};

interface Props {
  cell: {
    precip_3d: number;
    tipping_mm?: number | null;
    tipping_margin_mm?: number | null;
    rain_sensitivity?: string;
  };
}

/** Shows how much 3-day rain it takes for the model to call this sector flooded. */
export const TippingPointCard: React.FC<Props> = ({ cell }) => {
  const label = cell.rain_sensitivity ?? 'Resilient';
  const color = TIP_COLORS[label] ?? '#22C55E';
  const tip = cell.tipping_mm;
  const margin = cell.tipping_margin_mm;

  let line: string;
  if (label === 'Flooded at any rain') {
    line = 'Chronically low-lying: flagged flooded even with no rain.';
  } else if (tip == null) {
    line = 'Model does not flag this sector below 300 mm of 3-day rain.';
  } else if ((margin ?? 0) > 0) {
    line = `${cell.precip_3d.toFixed(0)} mm fell · tipping point ${tip} mm · ${margin} mm past it`;
  } else {
    line = `${cell.precip_3d.toFixed(0)} mm fell · tipping point ${tip} mm · ${Math.abs(margin ?? 0)} mm of margin left`;
  }

  return (
    <div className="rounded-lg border border-[#1E2D45] bg-[#0B1424] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8A9EB8]">Rainfall sensitivity (model-estimated)</span>
        <span className="rounded px-2 py-0.5 text-xs font-semibold"
              style={{ color, border: `1px solid ${color}`, background: `${color}22` }}>
          {label}
        </span>
      </div>
      <p className="mt-2 font-mono text-sm text-white">{line}</p>
    </div>
  );
};
