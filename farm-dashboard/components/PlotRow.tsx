"use client";

import { COLORS, urgencyColor } from "@/constants/colors";
import { STRESS_THRESHOLD } from "@/constants/thresholds";

export type PlotRowData = {
  plot_id: string;
  label: string;
  urgency_score: number;
  plant_stress_index: number;
  oneliner: string;
  action_delay_days?: number;
  action_taken?: number;
  alert_flag?: number;
  alert_type?: string;
  farm_name?: string;
  crop?: string;
};

type Props = {
  plot: PlotRowData;
  onSelect: () => void;
};

export function PlotRow({ plot, onSelect }: Props) {
  const stress = plot.plant_stress_index;
  const delay = plot.action_delay_days ?? 0;
  const hasAlert = plot.alert_flag === 1;
  const actionTaken = plot.action_taken === 1;
  const overThreshold = stress > STRESS_THRESHOLD;
  const urgColor = urgencyColor(plot.urgency_score);

  // One badge tells the full story — no contradictions
  const statusBadge = !hasAlert
    ? null
    : !actionTaken
      ? { label: "⚠ no response", bg: "#FEE2E2", fg: "#B91C1C" }
      : delay === 0
        ? { label: "✓ same day", bg: "#DCFCE7", fg: "#15803D" }
        : delay === 1
          ? { label: "✓ responded (1d late)", bg: "#FEF3C7", fg: "#92400E" }
          : { label: `✓ responded (${delay}d late)`, bg: "#FEF3C7", fg: "#92400E" };

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col gap-2 border-b border-sage-100 px-4 py-4 text-left transition hover:bg-sage-50"
    >
      {/* Row 1: plot name + single status badge */}
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium text-sage-900 leading-snug">{plot.label}</span>
        {statusBadge && (
          <span
            className="flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{ backgroundColor: statusBadge.bg, color: statusBadge.fg }}
          >
            {statusBadge.label}
          </span>
        )}
      </div>

      {/* Row 2: one-liner description */}
      <p className="text-sm text-sage-700">{plot.oneliner}</p>

      {/* Row 3: stress bar with threshold tick */}
      <div className="flex items-center gap-3 mt-0.5">
        <div className="relative h-2 flex-1 rounded-full bg-sage-100">
          {/* Fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${Math.min(stress * 100, 100)}%`,
              backgroundColor: overThreshold ? COLORS.critical : urgColor,
            }}
          />
          {/* Threshold tick at 60% */}
          <div
            className="absolute rounded-sm bg-amber-400"
            style={{
              left: `${STRESS_THRESHOLD * 100}%`,
              top: "-3px",
              width: "2px",
              height: "14px",
              transform: "translateX(-50%)",
            }}
          />
        </div>

        {/* Stress % — red if over threshold */}
        <span
          className="flex-shrink-0 text-xs font-medium"
          style={{ color: overThreshold ? COLORS.critical : COLORS.textMuted }}
        >
          {(stress * 100).toFixed(0)}% stress
        </span>
      </div>
    </button>
  );
}
