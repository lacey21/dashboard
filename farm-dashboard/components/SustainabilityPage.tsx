"use client";

import { useState, useEffect } from "react";
import { useData } from "@/hooks/useData";
import { RiskCard } from "@/components/RiskCard";
import { SustainabilityRadar } from "@/charts/RadarChart";
import { scoreColor } from "@/constants/colors";

type SustainData = {
  overallScore: number;
  scoreLabel?: string;
  subscores: Record<string, number>;
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
    <div
      id={id}
      title={tooltip}
      className="flex flex-col items-center gap-1 scroll-mt-28 rounded-xl border border-sage-100 bg-white px-4 py-3 shadow-sm"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-sage-500">{label}</p>
      <p className="text-2xl font-bold leading-none" style={{ color }}>
        {score}
      </p>
      <p className="text-xs text-sage-600">
        {value}&nbsp;{unit}
      </p>
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
  return (
    <div
      id={id}
      title={`Total carbon footprint: ${totalKgCO2e.toLocaleString()} kg CO₂e. ${
        isAggregate ? "Aggregate across all farms." : ""
      } Emission factor source: Environment and Climate Change Canada.`}
      className="flex flex-col items-center gap-1 scroll-mt-28 rounded-xl border border-sage-100 bg-white px-4 py-3 shadow-sm"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-sage-500">Carbon emissions</p>
      <p className="text-2xl font-bold leading-none" style={{ color }}>
        {score}
      </p>
      <p className="text-xs text-sage-600">
        {isAggregate 
          ? `${(totalKgCO2e / 1000).toFixed(1)} tonne CO₂e`
          : `${kgPerKgYield.toFixed(3)} kg CO₂e/kg`}
      </p>
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

  const dynamicSentence = `Your biggest opportunity is improving ${data.weakestCategory.toLowerCase()} (${data.weakestScore}/100). Your strongest area is ${data.strongestCategory.toLowerCase()} (${data.strongestScore}/100).`;

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
        <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
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
          className="mt-4 text-sm text-sage-700 underline"
          onClick={() => setShowBreakdown(!showBreakdown)}
        >
          {showBreakdown ? "Hide breakdown" : "See breakdown"}
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
            <DisasterRiskCard score={data.subscores.naturalDisasterRisk} />
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
    </Wrapper>
  );
}

// ─── CategoryCard (unchanged) ─────────────────────────────────────────────────

function CategoryCard({
  title,
  score,
  caption,
}: {
  title: string;
  score: number;
  caption: string;
}) {
  return (
    <div className="rounded-lg border border-sage-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-sage-700">{title}</p>
      <p className="text-3xl font-bold" style={{ color: scoreColor(score) }}>
        {score}
      </p>
      <p className="mt-2 text-xs text-sage-700">{caption}</p>
    </div>
  );
}

// ─── DisasterRiskCard ─────────────────────────────────────────────────────

function DisasterRiskCard({ score }: { score: number }) {
  return (
    <div className="rounded-lg border border-sage-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-sage-700">Natural disaster risk</p>
      <p className="text-3xl font-bold" style={{ color: scoreColor(score) }}>
        {score}
      </p>
      <p className="mt-2 text-xs text-sage-700">Resilience to temperature extremes and environmental stressors</p>
    </div>
  );
}
