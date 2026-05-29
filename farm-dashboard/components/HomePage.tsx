"use client";

import Link from "next/link";
import { useData } from "@/hooks/useData";
import { KPICard } from "@/components/KPICard";
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

  // Live headline stat per use case, keyed by the shared use-case id.
  const stats: Record<string, string> = data
    ? {
        "alert-triage": `${data.nav.alertTriageUrgent} plots need immediate attention`,
        seasonal: `Precision benefit: +$${data.nav.seasonalPrecisionBenefit.toLocaleString()} this season`,
        sustainability: `Sustainability score: ${susData?.overallScore ?? "—"}/100`,
      }
    : {};

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {loading && (
        <p className="py-8 text-sage-700">Loading farm overview…</p>
      )}

      {error && <p className="py-8 text-red-600">{error}</p>}

      {data && !error && (
        <>
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-sage-900">Operation overview</h1>
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

          {/* ── The three use cases this overview powers ── */}
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-sage-700">
              Three use cases of this overview
            </h2>
            <p className="mt-1 text-sm text-sage-600">
              The numbers above come to life in three decisions — follow them in order, or jump to the one
              you need.
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
                    <span aria-hidden>{u.icon}</span>
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
