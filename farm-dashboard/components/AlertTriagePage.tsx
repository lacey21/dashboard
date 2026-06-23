"use client";

import { useEffect, useState } from "react";
import { useData } from "@/hooks/useData";
import { useFarm } from "@/contexts/FarmContext";
import { PlotRow } from "@/components/PlotRow";
import type { PlotRowData } from "@/components/PlotRow";
import { PlotDrawer } from "@/components/PlotDrawer";
import { CrewDispatch } from "@/components/CrewDispatch";
import { CropFilterBanner } from "@/components/CropFilterBanner";
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

/** Sidebar deep links (useCases figures) → plot list filters */
const HASH_TO_FILTER: Record<string, FilterMode> = {
  critical: "critical",
  "high-stress": "highStress",
};

function syncAlertTriageFromHash(
  setFilterMode: (mode: FilterMode) => void,
  setShowAll: (show: boolean) => void,
) {
  const id = window.location.hash.replace(/^#/, "");
  if (!id) return;

  const filter = HASH_TO_FILTER[id];
  if (filter) {
    setFilterMode(filter);
    setShowAll(false);
  }

  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export default function AlertTriagePage({ embedded = false }: { embedded?: boolean }) {
  const { data, loading } = useData<AlertData>("alert_triage.json");
  const { farm: globalFarm, farms: globalFarms, cropFilter } = useFarm();
  const [week, setWeek] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [harvestFilter, setHarvestFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"urgency" | "crop">("urgency");

  // Sync global scope selector → local harvest filter during render (React's
  // "adjust state when a prop changes" pattern). Greenhouse/plot scopes aren't in
  // the flat farm list and their data is already scope-filtered, so they fall
  // back to "all" (show every plot in the loaded, already-narrowed data).
  const scopeSyncKey = `${globalFarm}|${globalFarms.length}`;
  const [syncedScope, setSyncedScope] = useState(scopeSyncKey);
  if (syncedScope !== scopeSyncKey) {
    setSyncedScope(scopeSyncKey);
    const match = globalFarms.find((f) => f.id === globalFarm);
    setHarvestFilter(match && globalFarm !== "all" ? match.name : "all");
  }

  // Sidebar deep links (#critical, #high-stress, etc.)
  useEffect(() => {
    if (!data) return;

    const onHashChange = () => syncAlertTriageFromHash(setFilterMode, setShowAll);
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [data]);

  const activeWeek = week ?? data?.defaultWeek ?? "";
  const allWeekPlots = data?.plotRankings[activeWeek] ?? [];
  const detail = selectedKey ? data?.plotDetails[selectedKey] : null;

  // Harvest-filtered pool — everything downstream uses this
  const farmFiltered = harvestFilter === "all"
    ? allWeekPlots
    : allWeekPlots.filter((p) => p.farm_name === harvestFilter);

  // Crop filter is either/or with farm — applied on top of harvest filter
  const plots = cropFilter
    ? farmFiltered.filter((p) => p.crop === cropFilter)
    : farmFiltered;

  // Counts from the harvest-filtered pool
  const urgentCount = plots.filter((p) => p.urgency_score > 0.7).length;
  const highStressPlotCount = plots.filter((p) => p.plant_stress_index > 0.6).length;
  const noResponseCount = plots.filter((p) => p.alert_flag === 1 && p.action_taken === 0).length;

  // Derive KPI stats from filtered pool (so cards stay accurate per harvest)
  const alertPlots = plots.filter((p) => p.alert_flag === 1);
  const respondedPlots = alertPlots.filter((p) => p.action_taken === 1);
  const derivedResponseRate = alertPlots.length > 0
    ? Math.round((respondedPlots.length / alertPlots.length) * 1000) / 10
    : 0;
  const derivedAvgDelay = respondedPlots.length > 0
    ? Math.round((respondedPlots.reduce((s, p) => s + (p.action_delay_days ?? 0), 0) / respondedPlots.length) * 100) / 100
    : 0;
  const derivedHighStressEvents = plots.filter((p) => p.plant_stress_index > 0.6).length;

  // Deltas from previous week — match the same scope as current plots
  const weeklyStats = data?.weeklyStats[activeWeek];
  const activeWeekIdx = data ? data.weeks.indexOf(activeWeek) : -1;
  const prevWeekKey = activeWeekIdx > 0 ? data!.weeks[activeWeekIdx - 1] : null;
  const prevPlots = prevWeekKey ? (data?.plotRankings[prevWeekKey] ?? []) : allWeekPlots;
  const prevFarmFiltered = harvestFilter === "all" ? prevPlots : prevPlots.filter((p) => p.farm_name === harvestFilter);
  const prevPool = cropFilter ? prevFarmFiltered.filter((p) => p.crop === cropFilter) : prevFarmFiltered;
  const prevUrgentCount = prevPool.filter((p) => p.urgency_score > 0.7).length;
  const prevHighStress = prevPool.filter((p) => p.plant_stress_index > 0.6).length;
  const prevAlerts = prevPool.filter((p) => p.alert_flag === 1);
  const prevResponded = prevAlerts.filter((p) => p.action_taken === 1);
  const prevResponseRate = prevAlerts.length > 0
    ? Math.round((prevResponded.length / prevAlerts.length) * 1000) / 10
    : derivedResponseRate;
  const prevAvgDelay = prevResponded.length > 0
    ? Math.round((prevResponded.reduce((s, p) => s + (p.action_delay_days ?? 0), 0) / prevResponded.length) * 100) / 100
    : derivedAvgDelay;

  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  // Urgency filter applied on top of harvest filter
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

  const sortedPlots = sortBy === "crop"
    ? [...filteredPlots].sort((a, b) => {
        const cropCmp = (a.crop ?? "").localeCompare(b.crop ?? "");
        return cropCmp !== 0 ? cropCmp : b.urgency_score - a.urgency_score;
      })
    : filteredPlots;

  const visiblePlots = showAll ? sortedPlots : sortedPlots.slice(0, 10);

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
    const scope = harvestFilter !== "all" ? ` in ${harvestFilter}` : "";
    return urgentCount > 0 ? (
      <p className="text-sm text-sage-900">
        <span className="font-semibold" style={{ color: COLORS.critical }}>
          {urgentCount} plot{urgentCount !== 1 ? "s" : ""}{scope} need immediate attention.
        </span>{" "}
        Sorted by urgency — start at the top. Tap any row for timeline, alerts, and stress simulator.
      </p>
    ) : (
      <p className="text-sm text-sage-900">
        <span className="font-medium">No critical plots{scope} this week.</span>{" "}
        <span className="text-sage-600">
          {plots.filter((p) => p.urgency_score >= 0.4).length} plots are on watch.
          Focus on any marked <span className="font-medium text-red-700">⏱ no response</span> — those have gone the longest without action.
        </span>
      </p>
    );
  })();

  // Latest recommended action per plot → feeds the crew dispatch "focus" line.
  const recommendedActions: Record<string, string> = {};
  for (const p of plots) {
    const det = data.plotDetails[`${p.plot_id}|${activeWeek}`];
    const log = det?.alertLog as { recommended_action?: string }[] | undefined;
    const rec = log?.[log.length - 1]?.recommended_action;
    if (rec) recommendedActions[p.plot_id] = rec;
  }

  return (
    <Wrapper className={wrapClass}>
      {/* Header */}
      <div>
        <h2 className={embedded ? "text-xl font-bold text-sage-900" : "text-2xl font-bold text-sage-900"}>
          It&apos;s {dayName}. You have limited crew.
        </h2>
        <p className="mt-0.5 text-sage-600">Here&apos;s where to send them first.</p>
      </div>

      {/* Controls row — week picker + sort; farm/crop controlled by global sidebar selector */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <SelectPicker
          value={sortBy}
          onChange={(v) => setSortBy(v as "urgency" | "crop")}
        >
          <option value="urgency">Sort: Urgency</option>
          <option value="crop">Sort: Crop type</option>
        </SelectPicker>
        <SelectPicker
          value={activeWeek}
          onChange={(v) => handleWeekChange(v)}
        >
          {data.weeks.map((w) => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </SelectPicker>
      </div>

      {/* Active crop filter banner */}
      <div className="mt-2">
        <CropFilterBanner filteredCount={plots.length} totalCount={farmFiltered.length} />
      </div>

      {/* KPI cards */}
      {weeklyStats && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            id="critical"
            value={urgentCount}
            label="Plots critical"
            valueColor={urgentCount > 0 ? COLORS.critical : COLORS.healthy}
            delta={urgentCount - prevUrgentCount}
            invertDelta
            tooltip="Plots where urgency score exceeds 0.7 — a combination of high stress, an active alert, and slow response time. These need crew today."
            tooltipPlots={plots.filter((p) => p.urgency_score > 0.7).slice(0, 4)}
            onClick={urgentCount > 0 ? () => toggleFilter("critical") : undefined}
            isActive={filterMode === "critical"}
          />
          <StatCard
            id="high-stress"
            value={derivedHighStressEvents}
            label="High-stress plots"
            valueColor={derivedHighStressEvents > prevHighStress ? COLORS.warning : undefined}
            delta={derivedHighStressEvents - prevHighStress}
            invertDelta
            tooltip="Plots currently above the 60% stress threshold. Click to sort by stress level."
            tooltipPlots={plots.filter((p) => p.plant_stress_index > 0.6).slice(0, 4)}
            onClick={highStressPlotCount > 0 ? () => toggleFilter("highStress") : undefined}
            isActive={filterMode === "highStress"}
          />
          <StatCard
            id="response-rate"
            value={`${derivedResponseRate}%`}
            label="Alerts responded"
            hint="≥80% is good"
            valueColor={
              derivedResponseRate < 60
                ? COLORS.critical
                : derivedResponseRate < 80
                  ? COLORS.warning
                  : COLORS.healthy
            }
            delta={Math.round((derivedResponseRate - prevResponseRate) * 10) / 10}
            tooltip="Percentage of alerts this week where a crew action was recorded. Below 80% means alerts are being missed or ignored."
          />
          <StatCard
            id="response-delay"
            value={`${derivedAvgDelay}d`}
            label="Avg response delay"
            hint="target <1d"
            valueColor={
              derivedAvgDelay > 2
                ? COLORS.critical
                : derivedAvgDelay > 1
                  ? COLORS.warning
                  : COLORS.healthy
            }
            delta={Math.round((derivedAvgDelay - prevAvgDelay) * 100) / 100}
            invertDelta
            tooltip="Average days between an alert firing and a crew action being taken. Under 1 day keeps stress from compounding. Over 2 days is associated with measurable yield impact."
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
            <IconAlertCircle /> Critical ({urgentCount})
          </FilterChip>
        )}
        {highStressPlotCount > 0 && (
          <FilterChip active={filterMode === "highStress"} onClick={() => toggleFilter("highStress")} color="amber">
            <IconActivity /> High stress ({highStressPlotCount})
          </FilterChip>
        )}
        {noResponseCount > 0 && (
          <FilterChip active={filterMode === "noResponse"} onClick={() => toggleFilter("noResponse")} color="red">
            <IconTriangleAlert /> No response ({noResponseCount})
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

      {/* Call to action — turn the ranked list into a morning route */}
      <CrewDispatch plots={plots} recommendedActions={recommendedActions} dayName={dayName} />

      <PlotDrawer
        detail={detail as Parameters<typeof PlotDrawer>[0]["detail"]}
        onClose={() => setSelectedKey(null)}
        model={data.stressModel}
      />
    </Wrapper>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SelectPicker({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-sage-300 bg-white py-2 pl-3 pr-8 text-sm text-sage-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sage-400 cursor-pointer"
      >
        {children}
      </select>
      {/* Custom chevron — replaces the native arrow */}
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sage-400">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
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
  const base = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer select-none";
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

/** Filled circle with exclamation — used for Critical */
function IconAlertCircle() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true" className="flex-shrink-0" fill="currentColor">
      <circle cx="6.5" cy="6.5" r="6.5" />
      <rect x="5.8" y="3.5" width="1.4" height="3.8" rx="0.7" fill="white" />
      <circle cx="6.5" cy="9.2" r="0.85" fill="white" />
    </svg>
  );
}

/** Activity pulse with spike — used for High stress */
function IconActivity() {
  return (
    <svg width="14" height="13" viewBox="0 0 14 13" aria-hidden="true" className="flex-shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3">
      <polyline points="1,7 3.5,7 5,9.5 7,2 9,9.5 10.5,7 13,7" />
    </svg>
  );
}

/** Triangle warning — used for No response */
function IconTriangleAlert() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true" className="flex-shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3">
      <path d="M6.5 1.8L11.8 11H1.2L6.5 1.8z" />
      <line x1="6.5" y1="5.2" x2="6.5" y2="8" />
      <circle cx="6.5" cy="9.4" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function StatCard({
  id,
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
  id?: string;
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
    <div
      id={id}
      className={`group relative flex flex-col scroll-mt-28 rounded-lg border bg-white p-4 shadow-sm transition-all
        ${isClickable ? "cursor-pointer hover:shadow-md" : "cursor-help"}
        ${isActive
          ? "border-sage-400 ring-2 ring-sage-300"
          : "border-sage-200 hover:border-sage-300"
        }`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); } : undefined}
    >
      {/* Delta badge — top right */}
      {delta !== undefined && delta !== 0 && (
        <span
          className="absolute top-3 right-3 text-xs font-semibold"
          style={{ color: deltaColor }}
        >
          {delta > 0 ? "▲" : "▼"}{Math.abs(delta)}
        </span>
      )}

      {/* Value */}
      <p
        className="text-3xl font-bold leading-none"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>

      {/* Label */}
      <p className="mt-1.5 text-sm text-sage-600">{label}</p>

      {/* Hint */}
      {hint && <p className="mt-0.5 text-xs text-sage-400">{hint}</p>}

      {/* Filter affordance */}
      {isClickable && (
        <p className={`mt-2 text-xs font-medium transition-opacity ${isActive ? "text-sage-500" : "text-sage-400 opacity-0 group-hover:opacity-100"}`}>
          {isActive ? "✕ clear filter" : "↓ click to filter"}
        </p>
      )}

      {/* Hover tooltip */}
      {tooltip && (
        <div className="pointer-events-none invisible group-hover:visible absolute left-0 top-full mt-2 z-30 w-72 rounded-lg border border-sage-200 bg-white p-3 text-xs text-sage-700 shadow-xl">
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
    </div>
  );
}
