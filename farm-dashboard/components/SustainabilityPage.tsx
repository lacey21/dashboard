"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useData } from "@/hooks/useData";
import { RiskCard } from "@/components/RiskCard";
import { GrantFinder } from "@/components/GrantFinder";
import { SustainabilityRadar } from "@/charts/RadarChart";
import { scoreColor } from "@/constants/colors";

type SustainData = {
  overallScore: number;
  scoreLabel?: string;
  subscores: Record<string, number>;
  subscoreTrends?: Record<string, number>;
  weakestCategory: string;
  strongestCategory: string;
  weakestScore: number;
  strongestScore: number;
  farm: { farmName: string; region: string; climateZone: string; primaryCrop: string };
  benchmarks: { energyPerKg: number; waterPerKg: number };
  carbonEmissionsKgCO2e: number;
  carbonKgPerKgYield: number;
  carbonEmissionsScore: number;
  risks: { id: string; icon: string; title: string; level: "critical" | "warning" | "healthy"; oneliner: string }[];
  controlBaseline: Record<string, number>;
  aggregationType?: "all_farms" | "single_farm";
  numFarms?: number;
};

type SeasonalData = {
  financials: {
    meanRoiPct: number;
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  energyIntensity: "Energy intensity",
  waterEfficiency: "Water efficiency",
  chemicalLoad: "Total Chemical load",
  carbonEmissions: "Carbon emissions",
  naturalDisasterRisk: "Natural disaster risk",
};

function formatCategoryForSentence(category: string): string {
  const label = CATEGORY_LABELS[category] ?? category;
  return label.toLowerCase();
}

// ─── KPI hover tooltip ───────────────────────────────────────────────────────

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="5.5" />
      <path strokeLinecap="round" d="M7 6.2V9.8M7 4.4v.1" />
    </svg>
  );
}

function KpiHoverTooltip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-xl border border-sage-200 bg-white p-4 text-left shadow-xl group-hover:visible"
    >
      <div
        className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-sage-200 bg-white"
        aria-hidden
      />
      <p className="text-sm font-semibold text-sage-900">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-sage-600">{children}</p>
    </div>
  );
}

const KPI_CARD_CLASS =
  "group relative flex min-h-[7.5rem] flex-col items-center justify-center gap-2 scroll-mt-28 rounded-xl border border-sage-200 bg-white px-5 py-5 shadow-sm transition hover:border-sage-300 hover:shadow-md cursor-help";

// ─── Metric pill displayed below the big score ───────────────────────────────

function MetricPill({
  id,
  label,
  value,
  unit,
  score,
  tooltip,
}: {
  id?: string;
  label: string;
  value: string;
  unit: string;
  score: number;
  tooltip: string;
}) {
  const color = scoreColor(score);
  return (
    <div id={id} className={KPI_CARD_CLASS}>
      <span className="absolute right-2.5 top-2.5 text-sage-300 transition-colors group-hover:text-sage-500">
        <InfoIcon />
      </span>
      <p className="text-sm font-medium uppercase tracking-wide text-sage-500">{label}</p>
      <p className="text-4xl font-bold leading-none" style={{ color }}>
        {score}
      </p>
      <p className="text-sm text-sage-600">
        {value}&nbsp;{unit}
      </p>
      <KpiHoverTooltip title={label}>{tooltip}</KpiHoverTooltip>
    </div>
  );
}

// ─── Carbon pill (slightly different — shows raw CO₂e value prominently) ─────

function CarbonPill({
  id,
  totalKgCO2e,
  kgPerKgYield,
  score,
  isAggregate,
}: {
  id?: string;
  totalKgCO2e: number;
  kgPerKgYield: number;
  score: number;
  isAggregate?: boolean;
}) {
  const color = scoreColor(score);
  const label = "Carbon emissions";
  const tooltip = (
    <>
      Total carbon footprint: <strong className="font-medium text-sage-800">{totalKgCO2e.toLocaleString()} kg CO₂e</strong>.
      {isAggregate ? " Aggregate across all farms." : " Per-kg yield factor shown below."}
      {" "}Emission factors from Environment and Climate Change Canada.
    </>
  );

  return (
    <div id={id} className={KPI_CARD_CLASS}>
      <span className="absolute right-2.5 top-2.5 text-sage-300 transition-colors group-hover:text-sage-500">
        <InfoIcon />
      </span>
      <p className="text-sm font-medium uppercase tracking-wide text-sage-500">{label}</p>
      <p className="text-4xl font-bold leading-none" style={{ color }}>
        {score}
      </p>
      <p className="text-sm text-sage-600">
        {isAggregate
          ? `${(totalKgCO2e / 1000).toFixed(1)} tonne CO₂e`
          : `${kgPerKgYield.toFixed(3)} kg CO₂e/kg`}
      </p>
      <KpiHoverTooltip title={label}>{tooltip}</KpiHoverTooltip>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SustainabilityPage({ embedded = false }: { embedded?: boolean }) {
  const { data, loading } = useData<SustainData>("sustainability.json");
  const { data: seasonalData } = useData<SeasonalData>("seasonal_evaluation.json");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [pendingScrollTarget, setPendingScrollTarget] = useState<string | null>(null);

  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.slice(1);
      if (hash === "score-breakdown" || hash === "all-dimensions-vs-control") {
        setShowBreakdown(true);
        setPendingScrollTarget(hash);
      }
    }

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!showBreakdown || !pendingScrollTarget) return;

    const element = document.getElementById(pendingScrollTarget);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScrollTarget(null);
    }
  }, [showBreakdown, pendingScrollTarget]);

  if (loading || !data) {
    return (
      <p className={embedded ? "py-4 text-sage-700" : "p-8 text-sage-700"}>
        Loading sustainability scorecard…
      </p>
    );
  }

  const scoreLabel =
    data.scoreLabel || (data.overallScore >= 75 ? "Strong" : data.overallScore >= 50 ? "Developing" : "At Risk");

  const isAggregate = data.aggregationType === "all_farms";

  const dynamicSentence = `Your biggest opportunity is improving ${formatCategoryForSentence(data.weakestCategory)} (${data.weakestScore}/100). Your strongest area is ${formatCategoryForSentence(data.strongestCategory)} (${data.strongestScore}/100).`;

  // Filter risks to only show warning and critical
  const filteredRisks = data.risks.filter((r) => r.level !== "healthy");

  const Wrapper = embedded ? "div" : "main";
  const wrapClass = embedded ? "" : "mx-auto max-w-7xl px-6 py-8";

  return (
    <Wrapper className={wrapClass}>
      <h2 className={embedded ? "text-xl font-bold text-sage-900" : "text-2xl font-bold text-sage-900"}>
        {isAggregate ? "BC Farm Network Sustainability" : "Beyond this season's profit"}
      </h2>
      <p className="mt-1 text-sage-700">
        {isAggregate
          ? `Aggregate sustainability metrics across ${data.numFarms} farms.`
          : "Here's how resilient and future-proof this operation is."}
      </p>

      {/* ── Big score ────────────────────────────────────────────────── */}
      <div id="overall-score" className="mt-10 scroll-mt-28 text-center">
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="mx-auto block"
        >
          <p
            className="text-6xl font-bold"
            style={{ color: scoreColor(data.overallScore) }}
          >
            {data.overallScore}
          </p>
          <p className="text-lg text-sage-700">Overall Sustainability Score · {scoreLabel}</p>
        </button>

        {/* ── NEW: four metric pills ───────────────────────────────── */}
        <div className="mx-auto mt-6 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricPill
            id="water-efficiency"
            label="Water efficiency"
            score={data.subscores.waterEfficiency}
            value={data.benchmarks.waterPerKg.toFixed(1)}
            unit="L/kg"
            tooltip="Water consumed per kg of yield. Lower L/kg → higher score."
          />
          <MetricPill
            id="energy-intensity"
            label="Energy intensity"
            score={data.subscores.energyIntensity}
            value={data.benchmarks.energyPerKg.toFixed(2)}
            unit="kWh/kg"
            tooltip="Energy consumed per kg of yield. Lower kWh/kg → higher score."
          />
          <MetricPill
            label="Total Chemical Load"
            score={data.subscores.chemicalLoad}
            value={(data.subscores.chemicalLoad).toFixed(0)}
            unit="/100"
            tooltip="Pesticide input intensity per m² of growing area. Scored relative to fleet range."
          />
          <CarbonPill
            id="carbon-emissions"
            totalKgCO2e={data.carbonEmissionsKgCO2e ?? 0}
            kgPerKgYield={data.carbonKgPerKgYield ?? 0}
            score={data.subscores.carbonEmissions ?? data.carbonEmissionsScore ?? 0}
            isAggregate={isAggregate}
          />
        </div>
        {/* ──────────────────────────────────────────────────────────── */}

        <p className="mx-auto mt-4 max-w-xl text-sm text-sage-700">{dynamicSentence}</p>
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-sage-300 bg-white px-5 py-2 text-sm font-medium text-sage-800 shadow-sm transition hover:border-sage-400 hover:bg-sage-50 hover:shadow"
          onClick={() => setShowBreakdown(!showBreakdown)}
          aria-expanded={showBreakdown}
        >
          {showBreakdown ? "Hide breakdown" : "See breakdown"}
          <svg
            className={`h-4 w-4 text-sage-500 transition-transform duration-200 ${showBreakdown ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* ── Breakdown ────────────────────────────────────────────────── */}
      {showBreakdown && (
        <>
          <div id="score-breakdown" className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 scroll-mt-28">
            {(["waterEfficiency", "energyIntensity", "chemicalLoad", "carbonEmissions"] as const).map((key) => (
              <CategoryCard
                key={key}
                title={CATEGORY_LABELS[key]}
                score={data.subscores[key] ?? 0}
                trend={data.subscoreTrends?.[key]}
                caption={
                  key === "energyIntensity"
                    ? "How efficiently this farm converts energy spending into crop output"
                    : key === "waterEfficiency"
                      ? "How well irrigation is matched to crop needs"
                      : key === "chemicalLoad"
                        ? "How much chemical input this operation relies on relative to the fleet"
                        : "Carbon footprint per kg of yield based on BC grid emission factors"
                }
              />
            ))}
            <DisasterRiskCard
              score={data.subscores.naturalDisasterRisk}
              trend={data.subscoreTrends?.naturalDisasterRisk}
            />
          </div>

          <section id="all-dimensions-vs-control" className="mt-10 scroll-mt-28">
            <h2 className="mb-4 font-semibold text-sage-900">All dimensions vs control</h2>
            <p className="mb-4 text-sm text-sage-700">
              This radar compares your farm's sustainability metrics against your control plots. ROI measures financial return relative to cost—higher ROI means more profit per dollar spent.
            </p>
            <SustainabilityRadar
              subscores={data.subscores}
              controlBaseline={data.controlBaseline}
              roi={seasonalData?.financials?.meanRoiPct ?? 0}
            />
          </section>
        </>
      )}

      {/* ── Risk watchlist ───────────────────────────────────────────── */}
      {filteredRisks.length > 0 && (
        <section id="risk-watchlist" className="mt-12 scroll-mt-28">
          <h2 className="mb-4 font-semibold text-sage-900">Risk watchlist</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRisks.map((risk) => (
              <RiskCard
                key={risk.id}
                icon={risk.icon}
                title={risk.title}
                level={risk.level}
                oneliner={risk.oneliner}
              />
            ))}
          </div>
        </section>
      )}

      {/* Call to action — turn these scores into funding */}
      <GrantFinder
        metrics={{
          farmName: data.farm.farmName,
          overallScore: data.overallScore,
          scoreLabel,
          subscores: data.subscores,
          benchmarks: data.benchmarks,
          carbonEmissionsKgCO2e: data.carbonEmissionsKgCO2e ?? 0,
          carbonKgPerKgYield: data.carbonKgPerKgYield ?? 0,
          weakestCategory: data.weakestCategory,
          weakestScore: data.weakestScore,
          strongestCategory: data.strongestCategory,
          strongestScore: data.strongestScore,
        }}
      />
    </Wrapper>
  );
}

// ─── Trend badge ──────────────────────────────────────────────────────────────

function TrendBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.5) return null; // no meaningful change
  const improved = delta > 0;
  const color = improved ? "#15803D" : "#B91C1C";
  const bg    = improved ? "#DCFCE7"  : "#FEE2E2";
  const sign  = improved ? "+" : "";
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none"
      style={{ color, backgroundColor: bg }}
      title={`${sign}${delta.toFixed(1)} pts vs last month`}
    >
      <svg
        width="9" height="9" viewBox="0 0 10 10"
        fill="currentColor" aria-hidden
      >
        {improved
          ? <path d="M5 1 L9 8 H1 Z" />           /* up triangle */
          : <path d="M5 9 L9 2 H1 Z" />}           /* down triangle */
      </svg>
      {sign}{Math.abs(delta).toFixed(1)}
    </span>
  );
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({
  title,
  score,
  trend,
  caption,
}: {
  title: string;
  score: number;
  trend?: number;
  caption: string;
}) {
  const color = scoreColor(score);
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="flex flex-col rounded-xl border border-sage-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-sage-700">{title}</p>
        {trend != null && <TrendBadge delta={trend} />}
      </div>
      <p className="mt-1 text-3xl font-bold leading-none" style={{ color }}>
        {score}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-sage-700">{caption}</p>
    </div>
  );
}

// ─── DisasterRiskCard ─────────────────────────────────────────────────────────

function DisasterRiskCard({ score, trend }: { score: number; trend?: number }) {
  const color = scoreColor(score);
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="flex flex-col rounded-xl border border-sage-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-sage-700">Natural disaster risk</p>
        {trend != null && <TrendBadge delta={trend} />}
      </div>
      <p className="mt-1 text-3xl font-bold leading-none" style={{ color }}>
        {score}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-sage-700">Resilience to temperature extremes and environmental stressors</p>
    </div>
  );
}
