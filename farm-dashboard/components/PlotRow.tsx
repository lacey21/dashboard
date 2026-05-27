"use client";

import { urgencyColor } from "@/constants/colors";

export type PlotRowData = {
  plot_id: string;
  label: string;
  urgency_score: number;
  plant_stress_index: number;
  oneliner: string;
  action_delay_days?: number;
};

type Props = {
  plot: PlotRowData;
  onSelect: () => void;
};

export function PlotRow({ plot, onSelect }: Props) {
  const color = urgencyColor(plot.urgency_score);
  const badge =
    plot.urgency_score > 0.7 ? "Critical" : plot.urgency_score >= 0.4 ? "Watch" : "OK";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col gap-2 border-b border-sage-100 px-4 py-4 text-left transition hover:bg-sage-50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {badge}
        </span>
        <span className="font-medium text-sage-900">{plot.label}</span>
      </div>
      <p className="text-sm text-sage-700">{plot.oneliner}</p>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-sage-100">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(plot.plant_stress_index * 100, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <span className="text-xs text-sage-600">
          Stress {(plot.plant_stress_index * 100).toFixed(0)}%
        </span>
        {plot.action_delay_days !== undefined && plot.action_delay_days > 0 && (
          <span className="text-xs text-sage-600">
            · {plot.action_delay_days}d since action
          </span>
        )}
      </div>
    </button>
  );
}
