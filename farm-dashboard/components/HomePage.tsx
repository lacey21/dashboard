"use client";

import Link from "next/link";
import { useData } from "@/hooks/useData";
import { useFarm } from "@/contexts/FarmContext";
import { useChat } from "@/contexts/ChatContext";
import { KPICard } from "@/components/KPICard";
import { GeminiInsight } from "@/components/GeminiInsight";
import { UseCaseIcon } from "@/components/UseCaseIcon";
import { USE_CASES } from "@/constants/useCases";

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
  nav: {
    alertTriageUrgent: number;
    seasonalPrecisionBenefit: number;
    sustainabilityScore: number;
  };
};

type SustainData = {
  overallScore: number;
};

export default function HomePage() {
  const { data, loading, error } = useData<HomeData>("home.json");
  const { data: susData } = useData<SustainData>("sustainability.json");
  const { selected } = useFarm();
  const { openChat } = useChat();

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {loading && (
        <p className="py-8 text-sage-700">Loading farm overview…</p>
      )}

      {error && <p className="py-8 text-red-600">{error}</p>}

      {data && !error && (
        <>
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-sage-900">Operation Overview</h1>
            <p className="mt-1 text-sm text-sage-700">
              <strong className="font-semibold text-sage-900">{data.banner.criticalPlots}</strong> critical
              plots · <strong className="font-semibold text-sage-900">{data.banner.unactionedAlerts}</strong>{" "}
              unactioned alerts · ROI{" "}
              <strong className="font-semibold text-sage-900">{Math.abs(data.banner.roiVsBaseline)}%</strong>{" "}
              {data.banner.roiVsBaseline >= 0 ? "above" : "below"} baseline
            </p>
          </header>

          {/* ── Executive KPIs ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label="Farm health score (0–100, higher is better)"
              value={data.kpis.farmHealthScore}
              delta={data.kpis.farmHealthDelta}
              deltaLabel="vs last week"
              deltaPositive={data.kpis.farmHealthDelta >= 0}
              href="/alert-triage"
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
              deltaPositive
              href="/seasonal-evaluation"
            />
          </div>

          {overviewPrompt && (
            <section className="mt-8">
              <GeminiInsight
                prompt={overviewPrompt}
                autoRun
                label="overview summary"
                headerLabel="GreenLeaf AI overview"
                showRegenerate={false}
                errorFallback="GreenLeaf AI overview not available"
                footer={
                  <button
                    type="button"
                    onClick={openChat}
                    className="group flex w-full items-center justify-between gap-3 rounded-lg border border-sage-300 bg-sage-50 px-4 py-3 text-left transition hover:border-sage-400 hover:bg-sage-100"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white">
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                          <path d="M8 1.5l1.4 3.6L13 6.5l-3.6 1.4L8 11.5 6.6 7.9 3 6.5l3.6-1.4L8 1.5z" />
                        </svg>
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
                }
              />
            </section>
          )}

          {/* ── The three use cases this overview powers ── */}
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-sage-700">
              Use cases
            </h2>
            <p className="mt-1 text-sm text-sage-600">
              Drill into alerts, season performance, or sustainability scores.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {USE_CASES.map((u, i) => (
                <Link
                  key={u.href}
                  href={u.href}
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
                  <p className="mt-3 flex items-center gap-1.5 text-base font-semibold text-sage-900">
                    <UseCaseIcon src={u.icon} size={28} variant="dark" />
                    {u.title}
                  </p>
                  <p className="mt-1 text-sm italic text-sage-700">“{u.question}”</p>
                  <p className="mt-3 flex-1 text-sm font-medium text-sage-800">{stats[u.id]}</p>
                  <span className="mt-4 text-sm font-medium text-sage-700 group-hover:text-sage-900">
                    Explore this use case →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
