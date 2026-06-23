"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/hooks/useData";
import { useFarm } from "@/contexts/FarmContext";
import type { FarmOption } from "@/contexts/FarmContext";
import { useChat } from "@/contexts/ChatContext";
import { CropFilterBanner } from "@/components/CropFilterBanner";
import { KPICard } from "@/components/KPICard";
import { AiIcon } from "@/components/AiIcon";
import { OllamaInsight } from "@/components/OllamaInsight";
import { UseCaseIcon } from "@/components/UseCaseIcon";
import { FarmHealthDrawer } from "@/components/FarmHealthDrawer";
import type { PlotRowData } from "@/components/PlotRow";
import { COLORS } from "@/constants/colors";
import { USE_CASES, useCaseIconSize } from "@/constants/useCases";

type HomeData = {
  banner: { criticalPlots: number; unactionedAlerts: number; roiVsBaseline: number };
  kpis: {
    farmHealthScore: number;
    farmHealthDelta: number;
    activeAlerts: number;
    activeAlertsDelta: number;
    seasonRoiPct: number;
    seasonRoiDelta: number;
    precisionActionRate: number;
    precisionActionRateDelta: number;
  };
  farmHealthDrawer?: {
    highStressDaysPct: number;
    meanResponseDays: number;
    delayDistribution: { same_day: number; one_day: number; two_plus: number };
    responseRate: number;
    controlResponseRate: number;
    precisionVsOutcome: { week: string; daily_precision_cost: number; avg_delta: number }[];
  };
  nav: {
    alertTriageUrgent: number;
    seasonalPrecisionBenefit: number;
    sustainabilityScore: number;
  };
};

type SustainData = {
  overallScore: number;
};

type AlertPreviewData = {
  defaultWeek: string;
  plotRankings: Record<string, PlotRowData[]>;
};

const QUICK_LINKS = [
  { href: "/alert-triage#critical", label: "Critical plots" },
  { href: "/alert-triage#high-stress", label: "High-stress plots" },
  { href: "/seasonal-evaluation#precision-benefit", label: "Precision benefit" },
  { href: "/seasonal-evaluation#yield-benchmark", label: "Yield benchmark" },
  { href: "/sustainability#risk-watchlist", label: "Risk watchlist" },
  { href: "/stress-simulator", label: "Stress simulator" },
] as const;

function pluralizeCrop(crop: string): string {
  if (!crop || crop === "Mixed crops") return crop;
  if (crop.endsWith("s")) return crop;
  if (crop.endsWith("o")) return `${crop}es`;
  if (crop.endsWith("y")) return `${crop.slice(0, -1)}ies`;
  return `${crop}s`;
}

function formatScopeHeader(selected: FarmOption, cropFilter: string | null): string {
  if (cropFilter) {
    return `All Farms · Fleet-wide · ${pluralizeCrop(cropFilter)}`;
  }
  if (selected.id === "all") {
    return "All Farms · Fleet-wide · Mixed crops";
  }
  const region = selected.climateZone ?? selected.region;
  const crop = pluralizeCrop(selected.primaryCrop);
  return [selected.name, region, crop].filter(Boolean).join(" · ");
}

function buildOverviewSummary(data: HomeData): string {
  const { banner, kpis } = data;
  const healthChange =
    kpis.farmHealthDelta >= 0
      ? `rose ${Math.abs(kpis.farmHealthDelta)} pts`
      : `dropped ${Math.abs(kpis.farmHealthDelta)} pts`;
  const roiSign = kpis.seasonRoiDelta >= 0 ? "+" : "−";
  const roiDelta = `${roiSign}${Math.abs(kpis.seasonRoiDelta)}% vs control`;
  const criticalPart =
    banner.criticalPlots === 0
      ? "no critical plots"
      : `${banner.criticalPlots} critical plot${banner.criticalPlots !== 1 ? "s" : ""}`;

  let priority = "review alert triage";
  if (banner.criticalPlots === 0 && banner.unactionedAlerts === 0) {
    priority = kpis.seasonRoiDelta < 0 ? "review seasonal ROI" : "maintain current operations";
  } else if (banner.unactionedAlerts > 0) {
    priority = "clear unactioned alerts";
  }

  return `Farm health ${healthChange} this week. ${criticalPart}; season ROI ${Math.round(kpis.seasonRoiPct)}% (${roiDelta}). Priority: ${priority}.`;
}

export default function HomePage() {
  const { data, loading, error } = useData<HomeData>("home.json");
  const { data: susData } = useData<SustainData>("sustainability.json");
  const { data: alertData } = useData<AlertPreviewData>("alert_triage.json");
  const { selected, cropFilter } = useFarm();
  const { openChat } = useChat();
  const [healthDrawerOpen, setHealthDrawerOpen] = useState(false);

  const scopeHeader = formatScopeHeader(selected, cropFilter);

  const criticalPlots = useMemo(() => {
    if (!alertData) return [];
    const week = alertData.defaultWeek;
    const plots = alertData.plotRankings[week] ?? [];
    return plots.filter((p) => p.urgency_score > 0.7);
  }, [alertData]);

  // Live headline stat per use case, keyed by the shared use-case id.
  const stats: Record<string, string> = data
    ? {
        "alert-triage": `${data.nav.alertTriageUrgent} plots need immediate attention`,
        seasonal: `Precision benefit: +$${data.nav.seasonalPrecisionBenefit.toLocaleString()} this season`,
        sustainability: `Sustainability score: ${susData?.overallScore ?? "—"}/100`,
      }
    : {};

  const overviewPrompt =
    data &&
    `You are an agricultural operations advisor. In 3-4 sentences, give a plain-English executive summary of this farm's current situation. Cover daily operations, season finances, and long-term resilience at a high level. Be specific using the numbers provided and highlight what needs attention first. Plain English, no jargon.

Farm: ${selected.name}, ${selected.region}${selected.primaryCrop ? `, primary crop ${selected.primaryCrop}` : ""}
Critical plots: ${data.banner.criticalPlots}
Unactioned alerts: ${data.banner.unactionedAlerts}
ROI vs baseline: ${data.banner.roiVsBaseline >= 0 ? "+" : ""}${data.banner.roiVsBaseline}%
Farm health score: ${data.kpis.farmHealthScore}/100 (${data.kpis.farmHealthDelta >= 0 ? "+" : ""}${data.kpis.farmHealthDelta} vs last week)
Active alerts today: ${data.kpis.activeAlerts}
Season ROI: ${data.kpis.seasonRoiPct}% (${data.kpis.seasonRoiDelta >= 0 ? "+" : ""}${data.kpis.seasonRoiDelta}% vs baseline)
Precision action rate: ${data.kpis.precisionActionRate}%
Sustainability score: ${susData?.overallScore ?? "N/A"}/100`;

  const staticOverviewSummary = data ? buildOverviewSummary(data) : "";

  const askAiFooter = (
    <button
      type="button"
      onClick={openChat}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-sage-300 bg-sage-50 px-4 py-3 text-left transition hover:border-sage-400 hover:bg-sage-100"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white">
          <AiIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-sage-900">Ask GreenLeaf AI</span>
          <span className="block text-xs text-sage-600">
            Get answers from your farm data, with links to the right page
          </span>
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-sage-700 group-hover:text-sage-900">
        Open →
      </span>
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {loading && (
        <p className="py-8 text-sage-700">Loading farm overview…</p>
      )}

      {error && <p className="py-8 text-red-600">{error}</p>}

      {data && !error && (
        <>
          {/* Crop filter banner */}
          <div className="mb-4">
            <CropFilterBanner />
          </div>

          <header className="mb-6">
            <h1 className="text-2xl font-bold text-sage-900">{scopeHeader}</h1>
            <p className="mt-1 text-sm text-sage-700">
              <strong className="font-semibold text-sage-900">{data.banner.criticalPlots}</strong> critical
              plots · <strong className="font-semibold text-sage-900">{data.banner.unactionedAlerts}</strong>{" "}
              unactioned alerts · ROI{" "}
              <strong className="font-semibold text-sage-900">{Math.abs(data.banner.roiVsBaseline)}%</strong>{" "}
              {data.banner.roiVsBaseline >= 0 ? "above" : "below"} baseline
            </p>
          </header>

          {/* Quick navigation */}
          <nav aria-label="Quick links" className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">Jump to</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-sage-200 bg-white px-3 py-1.5 text-xs font-medium text-sage-800 transition hover:border-sage-400 hover:bg-sage-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* ── Executive KPIs ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label="Farm health score (0–100, higher is better)"
              value={data.kpis.farmHealthScore}
              delta={data.kpis.farmHealthDelta}
              deltaLabel="vs last week"
              deltaPositive={data.kpis.farmHealthDelta >= 0}
              onClick={
                data.farmHealthDrawer
                  ? () => setHealthDrawerOpen(true)
                  : undefined
              }
              href={data.farmHealthDrawer ? undefined : "/alert-triage"}
            />
            <KPICard
              label="Active alerts today"
              value={data.kpis.activeAlerts}
              delta={data.kpis.activeAlertsDelta}
              deltaLabel="vs 7 days ago"
              deltaPositive={data.kpis.activeAlertsDelta <= 0}
              href="/alert-triage"
            />
            <KPICard
              label="Season ROI (avg across plots)"
              value={`${data.kpis.seasonRoiPct}%`}
              delta={data.kpis.seasonRoiDelta}
              deltaLabel="vs control baseline"
              deltaPositive={data.kpis.seasonRoiDelta >= 0}
              href="/seasonal-evaluation"
            />
            <KPICard
              label="Precision action rate"
              value={`${data.kpis.precisionActionRate}%`}
              delta={data.kpis.precisionActionRateDelta}
              deltaLabel="vs season average"
              deltaPositive={data.kpis.precisionActionRateDelta >= 0}
              href="/seasonal-evaluation"
            />
          </div>

          {/* Critical plots preview — top 3 only */}
          <section
            className={`mt-4 rounded-xl border p-4 sm:p-5 ${
              data.banner.criticalPlots > 0
                ? "border-red-200 bg-red-50/60"
                : "border-sage-200 bg-sage-50/80"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-sage-800">
                  Critical plots this week
                </h2>
                <p className="mt-1 text-sm text-sage-700">
                  {data.banner.criticalPlots === 0 ? (
                    "No plots above the urgency threshold."
                  ) : (
                    <>
                      <strong style={{ color: COLORS.critical }}>{data.banner.criticalPlots}</strong>
                      {data.banner.criticalPlots === 1 ? " plot needs" : " plots need"} immediate crew
                      attention.
                      {data.banner.criticalPlots > 3 && (
                        <span className="text-sage-600"> Showing top 3.</span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <Link
                href="/alert-triage#critical"
                className="shrink-0 text-sm font-semibold text-sage-700 underline decoration-sage-300 underline-offset-2 hover:text-sage-900"
              >
                {data.banner.criticalPlots > 0
                  ? `View all ${data.banner.criticalPlots} in alert triage →`
                  : "Open alert triage →"}
              </Link>
            </div>
            {criticalPlots.length > 0 && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {criticalPlots.slice(0, 3).map((plot) => (
                  <li key={plot.plot_id}>
                    <Link
                      href={`/alert-triage#${plot.plot_id}`}
                      className="block min-w-0 rounded-lg border border-red-100 bg-white/80 px-3 py-2 text-sm transition hover:border-red-200 hover:bg-white hover:shadow-sm"
                    >
                      <span className="block font-semibold text-sage-900">{plot.plot_id}</span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-sage-600">{plot.oneliner}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {overviewPrompt && (
            <section className="mt-8">
              <OllamaInsight
                prompt={overviewPrompt}
                autoRun
                label="overview summary"
                headerLabel="GreenLeaf AI overview"
                showRegenerate={false}
                staticFallback={staticOverviewSummary}
                footer={askAiFooter}
              />
            </section>
          )}

          {/* ── The three use cases this overview powers ── */}
          <section className="mt-7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-sage-700">
              Use cases
            </h2>
            <p className="mt-1 text-sm text-sage-600">
              Drill into alerts, season performance, or sustainability scores.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {USE_CASES.map((u, i) => (
                <div
                  key={u.href}
                  className="group flex flex-col rounded-xl border border-sage-200 bg-white p-5 shadow-sm transition hover:border-sage-400 hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage-100 text-xs font-bold text-sage-700">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wide text-sage-500">
                      Use case · {u.audience}
                    </span>
                  </div>
                  <Link href={u.href} className="mt-3 flex items-center gap-1.5 text-base font-semibold text-sage-900 hover:text-sage-700">
                    <UseCaseIcon src={u.icon} size={useCaseIconSize(28, u.iconScale)} variant="dark" />
                    {u.title}
                  </Link>
                  <p className="mt-1 text-sm italic text-sage-700">"{u.question}"</p>
                  <p className="mt-3 flex-1 text-sm font-medium text-sage-800">{stats[u.id]}</p>
                  {u.figures.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-sage-100 pt-3">
                      {u.figures.slice(0, 2).map((fig) => (
                        <li key={fig.hash}>
                          <Link
                            href={`${u.href}#${fig.hash}`}
                            className="text-xs font-medium text-sage-700 underline decoration-sage-200 underline-offset-2 hover:text-sage-900"
                          >
                            {fig.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href={u.href}
                    className="mt-4 text-sm font-medium text-sage-700 group-hover:text-sage-900"
                  >
                    Explore this use case →
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {healthDrawerOpen && data.farmHealthDrawer && (
            <FarmHealthDrawer
              data={data.farmHealthDrawer}
              onClose={() => setHealthDrawerOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
