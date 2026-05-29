"use client";

import { useState } from "react";
import { useData } from "@/hooks/useData";
import { useKpiScrollProgress } from "@/hooks/useKpiScrollProgress";
import { KPICard } from "@/components/KPICard";
import { HeaderPlaceholder } from "@/components/HeaderPlaceholder";
import { StickyDashboardHeader } from "@/components/StickyDashboardHeader";
import { UseCaseSlideshow } from "@/components/UseCaseSlideshow";
import AlertTriagePage from "@/components/AlertTriagePage";
import SeasonalEvaluationPage from "@/components/SeasonalEvaluationPage";
import SustainabilityPage from "@/components/SustainabilityPage";

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
  const [slideIndex, setSlideIndex] = useState(0);
  const [kpiSectionRef, kpiProgress] = useKpiScrollProgress(40);

  const slides = data
    ? [
        {
          id: "alerts",
          title: "Where do I send my crew this morning?",
          audience: "Operations manager this morning",
          stat: `${data.nav.alertTriageUrgent} plots need immediate attention`,
          content: <AlertTriagePage embedded />,
        },
        {
          id: "season",
          title: "Is this system worth financing?",
          audience: "Farm owner + lender meeting",
          stat: `Precision benefit: +$${data.nav.seasonalPrecisionBenefit.toLocaleString()} this season`,
          content: <SeasonalEvaluationPage embedded />,
        },
        {
          id: "sustainability",
          title: "How resilient is this operation?",
          audience: "Long-term planning and risk management",
          stat: `Sustainability score: ${susData?.overallScore}/100`,
          content: <SustainabilityPage embedded />,
        },
      ]
    : [];

  return (
    <main className="min-h-screen" style={{ paddingTop: "var(--header-height, 40px)" }}>
      {loading && !data && <HeaderPlaceholder />}

      {data && (
        <StickyDashboardHeader
          banner={data.banner}
          kpis={data.kpis}
          kpiProgress={kpiProgress}
        />
      )}

      {loading && (
        <p className="px-4 py-8 text-sage-700 sm:px-6 lg:px-8">Loading farm overview…</p>
      )}

      {error && (
        <p className="px-4 py-8 text-red-600 sm:px-6 lg:px-8">{error}</p>
      )}

      {data && !error && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div ref={kpiSectionRef} className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label="Farm health score (0–100, higher is better)"
              value={data.kpis.farmHealthScore}
              delta={data.kpis.farmHealthDelta}
              deltaLabel="vs last week"
              deltaPositive={data.kpis.farmHealthDelta >= 0}
            />
            <KPICard
              label="Active alerts today"
              value={data.kpis.activeAlerts}
              delta={data.kpis.activeAlertsDelta}
              deltaLabel="vs 7 days ago"
              deltaPositive={data.kpis.activeAlertsDelta <= 0}
            />
            <KPICard
              label="Season ROI (avg across plots)"
              value={`${data.kpis.seasonRoiPct}%`}
              delta={data.kpis.seasonRoiDelta}
              deltaLabel="vs control baseline"
              deltaPositive={data.kpis.seasonRoiDelta >= 0}
            />
            <KPICard
              label="Precision action rate"
              value={`${data.kpis.precisionActionRate}%`}
              delta={data.kpis.precisionActionRateDelta}
              deltaLabel="vs season average"
              deltaPositive
            />
          </div>

          <UseCaseSlideshow
            slides={slides}
            index={slideIndex}
            onIndexChange={setSlideIndex}
          />
        </div>
      )}

    </main>
  );
}
