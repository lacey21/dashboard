"use client";

import { useState } from "react";
import { useData } from "@/hooks/useData";
import { PlotRow } from "@/components/PlotRow";
import type { PlotRowData } from "@/components/PlotRow";
import { PlotDrawer } from "@/components/PlotDrawer";
import { COLORS } from "@/constants/colors";
import type { StressModel } from "@/components/StressOutcomeSimulator";

type AlertData = {
  weeks: string[];
  defaultWeek: string;
  weeklyStats: Record<string, {
    highStressEvents: number;
    highStressDelta: number;
    responseRate: number;
    responseRateDelta: number;
    avgResponseDays: number;
    avgResponseDaysDelta: number;
  }>;
  plotRankings: Record<string, PlotRowData[]>;
  plotDetails: Record<string, { simulatorValues?: Record<string, number>; [key: string]: unknown }>;
  responseOverTime: { week: string; response_rate: number }[];
  alertTypeBreakdown: { alert_type: string; count: number; resolution_rate: number }[];
  healthTrend: { week: string; avg_stress: number }[];
  previouslyAtRisk: {
    label: string;
    lastWeekStress: number;
    thisWeekStress: number;
    actionTaken: boolean;
  }[];
  stressModel: StressModel;
};

type FilterMode = "all" | "critical" | "highStress" | "noResponse";

export default function AlertTriagePage({ embedded = false }: { embedded?: boolean }) {
  const { data, loading } = useData<AlertData>("alert_triage.json");
  const [week, setWeek] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const activeWeek = week ?? data?.defaultWeek ?? "";
  const stats = data?.weeklyStats[activeWeek];
  const plots = data?.plotRankings[activeWeek] ?? [];
  const detail = selectedKey ? data?.plotDetails[selectedKey] : null;

  const urgentCount = plots.filter((p) => p.urgency_score > 0.7).length;
  const highStressPlotCount = plots.filter((p) => p.plant_stress_index > 0.6).length;
  const noResponseCount = plots.filter((p) => p.alert_flag === 1 && p.action_taken === 0).length;

  const activeWeekIdx = data ? data.weeks.indexOf(activeWeek) : -1;
  const prevWeekKey = activeWeekIdx > 0 ? data!.weeks[activeWeekIdx - 1] : null;
  const prevPlots = prevWeekKey ? (data?.plotRankings[prevWeekKey] ?? []) : plots;
  const prevUrgentCount = prevPlots.filter((p) => p.urgency_score > 0.7).length;

  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  // Apply active filter
  const filteredPlots = (() => {
    switch (filterMode) {
      case "critical":
        return plots.filter((p) => p.urgency_score > 0.7);
      case "highStress":
        return [...plots]
          .filter((p) => p.plant_stress_index > 0.6)
          .sort((a, b) => b.plant_stress_index - a.plant_stress_index);
      case "noResponse":
        return plots.filter((p) => p.alert_flag === 1 && p.action_taken === 0);
      default:
        return plots;
    }
  })();

  const visiblePlots = showAll ? filteredPlots : filteredPlots.slice(0, 10);

  const handleWeekChange = (w: string) => {
    setWeek(w);
    setShowAll(false);
    setFilterMode("all");
  };

  const toggleFilter = (mode: FilterMode) => {
    setFilterMode((prev) => (prev === mode ? "all" : mode));
    setShowAll(false);
  };

  if (loading || !data) {
    return <p className={embedded ? "py-4 text-sage-700" : "p-8 text-sage-700"}>Loading alert triage…</p>;
  }

  const Wrapper = embedded ? "div" : "main";
  const wrapClass = embedded ? "" : "mx-auto max-w-5xl px-6 py-8";

  // Plot list header text varies by active filter
  const listHeader = (() => {
    if (filterMode === "critical") {
      return (
        <p className="text-sm text-sage-900">
          <span className="font-semibold" style={{ color: COLORS.critical }}>
            Showing {filteredPlots.length} critical plot{filteredPlots.length !== 1 ? "s" : ""}.
          </span>{" "}
          These have urgency scores above 0.7 — start here.
        </p>
      );
    }
    if (filterMode === "highStress") {
      return (
        <p className="text-sm text-sage-900">
          <span className="font-semibold" style={{ color: COLORS.warning }}>
            {filteredPlots.length} plot{filteredPlots.length !== 1 ? "s" : ""} over the 60% stress threshold.
          </span>{" "}
          Sorted highest stress first.
        </p>
      );
    }
    if (filterMode === "noResponse") {
      return (
        <p className="text-sm text-sage-900">
          <span className="font-semibold" style={{ color: COLORS.critical }}>
            {filteredPlots.length} plot{filteredPlots.length !== 1 ? "s" : ""} with alerts and no crew action recorded.
          </span>{" "}
          These have gone the longest without attention.
        </p>
      );
    }
    // Default
    return urgentCount > 0 ? (
      <p className="text-sm text-sage-900">
        <span className="font-semibold" style={{ color: COLORS.critical }}>
          {urgentCount} plot{urgentCount !== 1 ? "s" : ""} need immediate attention.
        </span>{" "}
        Sorted by urgency — start at the top. Tap any row for timeline, alerts, and stress simulator.
      </p>
    ) : (
      <p className="text-sm text-sage-900">
        <span className="font-medium">No critical plots this week.</span>{" "}
        <span className="text-sage-600">
          {plots.filter((p) => p.urgency_score >= 0.4).length} plots are on watch.
          Focus on any marked <span className="font-medium text-red-700">⏱ no response</span> — those have gone the longest without action.
        </span>
      </p>
    );
  })();

  return (
    <Wrapper className={wrapClass}>
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={embedded ? "text-xl font-bold text-sage-900" : "text-2xl font-bold text-sage-900"}>
            It&apos;s {dayName}. You have limited crew.
          </h2>
          <p className="mt-0.5 text-sage-600">Here&apos;s where to send them first.</p>
        </div>
        <select
          className="rounded border border-sage-300 bg-white px-3 py-2 text-sm text-sage-900"
          value={activeWeek}
          onChange={(e) => handleWeekChange(e.target.value)}
        >
          {data.weeks.map((w) => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
      </div>

      {/* Compact KPI banner */}
      {stats && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-sage-200 bg-white px-5 py-3 text-sm shadow-sm">
          <Stat
            value={urgentCount}
            label="plots critical"
            valueColor={urgentCount > 0 ? COLORS.critical : COLORS.healthy}
            delta={urgentCount - prevUrgentCount}
            invertDelta
            tooltip="Plots where urgency score exceeds 0.7 — a combination of high stress, an active alert, and slow response time. These need crew today."
            tooltipPlots={plots.filter((p) => p.urgency_score > 0.7).slice(0, 4)}
            onClick={urgentCount > 0 ? () => toggleFilter("critical") : undefined}
            isActive={filterMode === "critical"}
          />
          <Divider />
          <Stat
            value={stats.highStressEvents}
            label="high-stress events"
            valueColor={stats.highStressDelta > 0 ? COLORS.warning : undefined}
            delta={stats.highStressDelta}
            invertDelta
            tooltip={`Plot-days this week where the stress index crossed 60% — the danger threshold. ${stats.highStressDelta > 0 ? `Up ${stats.highStressDelta} vs last week.` : stats.highStressDelta < 0 ? `Down ${Math.abs(stats.highStressDelta)} vs last week — improving.` : "Unchanged vs last week."} Hover rows below to see which plots are affected.`}
            tooltipPlots={plots.filter((p) => p.plant_stress_index > 0.6).slice(0, 4)}
            onClick={highStressPlotCount > 0 ? () => toggleFilter("highStress") : undefined}
            isActive={filterMode === "highStress"}
          />
          <Divider />
          <Stat
            value={`${stats.responseRate}%`}
            label="responded"
            hint="≥80% is good"
            valueColor={
              stats.responseRate < 60
                ? COLORS.critical
                : stats.responseRate < 80
                  ? COLORS.warning
                  : COLORS.healthy
            }
            delta={stats.responseRateDelta}
            tooltip="Percentage of alert days this week where a crew action was recorded. Below 80% means alerts are being missed or ignored. A dropping response rate often predicts yield loss later in the season."
          />
          <Divider />
          <Stat
            value={`${stats.avgResponseDays}d`}
            label="avg delay"
            hint="target <1d"
            valueColor={
              stats.avgResponseDays > 2
                ? COLORS.critical
                : stats.avgResponseDays > 1
                  ? COLORS.warning
                  : COLORS.healthy
            }
            delta={stats.avgResponseDaysDelta}
            invertDelta
            tooltip="Average days between an alert firing and a crew action being taken. Under 1 day keeps stress from compounding. Over 2 days is associated with measurable yield impact — prioritise plots marked 'no response' in the list below."
          />
        </div>
      )}

      {/* Filter chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <FilterChip active={filterMode === "all"} onClick={() => toggleFilter("all")}>
          All plots
        </FilterChip>
        {urgentCount > 0 && (
          <FilterChip active={filterMode === "critical"} onClick={() => toggleFilter("critical")} color="red">
            🔴 Critical ({urgentCount})
          </FilterChip>
        )}
        {highStressPlotCount > 0 && (
          <FilterChip active={filterMode === "highStress"} onClick={() => toggleFilter("highStress")} color="amber">
            🌡 High stress ({highStressPlotCount})
          </FilterChip>
        )}
        {noResponseCount > 0 && (
          <FilterChip active={filterMode === "noResponse"} onClick={() => toggleFilter("noResponse")} color="red">
            ⚠ No response ({noResponseCount})
          </FilterChip>
        )}
        {filterMode !== "all" && (
          <span className="ml-auto text-xs text-sage-400">
            {filteredPlots.length} of {plots.length} plots · <button
              type="button"
              className="underline hover:text-sage-700"
              onClick={() => setFilterMode("all")}
            >clear filter</button>
          </span>
        )}
      </div>

      {/* Plot list */}
      <div className="mt-3 rounded-lg border border-sage-200 bg-white shadow-sm">
        <div className="border-b border-sage-100 px-4 py-3">
          {listHeader}
        </div>

        {filteredPlots.length === 0 ? (
          <p className="px-4 py-6 text-sm text-sage-500 text-center">No plots match this filter for the selected week.</p>
        ) : (
          visiblePlots.map((plot) => (
            <PlotRow
              key={plot.plot_id}
              plot={plot}
              onSelect={() => setSelectedKey(`${plot.plot_id}|${activeWeek}`)}
            />
          ))
        )}

        {filteredPlots.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-full border-t border-sage-100 py-3 text-sm text-sage-600 hover:bg-sage-50 hover:text-sage-900"
          >
            {showAll
              ? `Show top 10 only ↑`
              : `Show all ${filteredPlots.length} ${filterMode !== "all" ? "filtered " : ""}plots ↓`}
          </button>
        )}
      </div>

      <PlotDrawer
        detail={detail as Parameters<typeof PlotDrawer>[0]["detail"]}
        onClose={() => setSelectedKey(null)}
        model={data.stressModel}
      />
    </Wrapper>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
  return <span className="text-sage-300">·</span>;
}

function FilterChip({
  children,
  active,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: "red" | "amber";
}) {
  const base = "rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer select-none";
  if (active) {
    const activeColor =
      color === "red"
        ? "border-red-300 bg-red-50 text-red-700"
        : color === "amber"
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-sage-400 bg-sage-100 text-sage-900";
    return (
      <button type="button" onClick={onClick} className={`${base} ${activeColor}`}>
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} border-sage-200 bg-white text-sage-600 hover:border-sage-300 hover:text-sage-900`}
    >
      {children}
    </button>
  );
}

function Stat({
  value,
  label,
  hint,
  valueColor,
  delta,
  invertDelta,
  tooltip,
  tooltipPlots,
  onClick,
  isActive,
}: {
  value: string | number;
  label: string;
  hint?: string;
  valueColor?: string;
  delta?: number;
  invertDelta?: boolean;
  tooltip?: string;
  tooltipPlots?: PlotRowData[];
  onClick?: () => void;
  isActive?: boolean;
}) {
  const isGood = delta === undefined ? true : invertDelta ? delta <= 0 : delta >= 0;
  const deltaColor = isGood ? COLORS.healthy : COLORS.critical;
  const isClickable = !!onClick;

  return (
    <span
      className={`group relative flex flex-col gap-0.5 ${isClickable ? "cursor-pointer" : "cursor-help"} ${isActive ? "rounded px-2 py-0.5 -mx-2 -my-0.5 bg-sage-100 ring-1 ring-sage-300" : ""}`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); } : undefined}
    >
      <span className="flex items-baseline gap-1.5">
        <strong className="text-base" style={valueColor ? { color: valueColor } : undefined}>{value}</strong>
        <span className="text-sage-600">{label}</span>
        {isClickable && !isActive && (
          <span className="text-sage-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">↓ filter</span>
        )}
        {isActive && (
          <span className="text-sage-500 text-xs">✕</span>
        )}
        {delta !== undefined && delta !== 0 && (
          <span className="text-xs" style={{ color: deltaColor }}>
            {delta > 0 ? "▲" : "▼"}{Math.abs(delta)}
          </span>
        )}
      </span>
      {hint && <span className="text-xs text-sage-400">{hint}</span>}

      {/* Hover tooltip — only when not clickable active */}
      {tooltip && (
        <div className="pointer-events-none invisible group-hover:visible absolute left-0 top-full mt-2 z-30 w-72 rounded-lg border border-sage-200 bg-white p-3 text-xs text-sage-700 shadow-xl">
          {isClickable && (
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-sage-400">
              {isActive ? "Click to clear filter" : "Click to filter list"}
            </p>
          )}
          <p className="leading-relaxed">{tooltip}</p>
          {tooltipPlots && tooltipPlots.length > 0 && (
            <div className="mt-2 border-t border-sage-100 pt-2 space-y-1">
              <p className="text-sage-400 uppercase tracking-wide font-semibold text-[10px]">Affected plots</p>
              {tooltipPlots.map((p) => (
                <div key={p.plot_id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-sage-700">{p.label}</span>
                  <span className="flex-shrink-0 font-semibold" style={{ color: COLORS.critical }}>
                    {(p.plant_stress_index * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </span>
  );
}
