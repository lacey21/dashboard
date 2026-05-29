"use client";

import { useEffect, useRef } from "react";
import { StickyKpiChip } from "@/components/StickyKpiChip";
import { FarmSelector } from "@/components/FarmSelector";

type Banner = {
  criticalPlots: number;
  unactionedAlerts: number;
  roiVsBaseline: number;
};

type Kpis = {
  farmHealthScore: number;
  farmHealthDelta: number;
  activeAlerts: number;
  activeAlertsDelta: number;
  seasonRoiPct: number;
  seasonRoiDelta: number;
  precisionActionRate: number;
  precisionActionRateDelta: number;
};

type Props = {
  banner: Banner;
  kpis: Kpis;
  kpiProgress: number;
};

export function StickyDashboardHeader({
  banner,
  kpis,
  kpiProgress: p,
}: Props) {
  const headerRef = useRef<HTMLElement>(null);
  const sign = banner.roiVsBaseline >= 0 ? "above" : "below";

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const setHeight = () => {
      document.documentElement.style.setProperty("--header-height", `${el.offsetHeight}px`);
    };

    setHeight();
    const ro = new ResizeObserver(setHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [p]);

  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-50 border-b border-sage-800 bg-sage-700 shadow-sm"
    >
      <div className="mx-auto max-w-7xl px-3 py-1.5 sm:px-5 lg:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="shrink-0 text-sm font-bold tracking-tight text-white sm:text-base">
            GreenLeaf CEA
          </h1>

          <FarmSelector />

          <p className="hidden min-w-0 flex-1 truncate text-[11px] leading-tight text-sage-50 sm:block sm:text-xs">
            <strong className="font-semibold text-white">{banner.criticalPlots}</strong> critical ·{" "}
            <strong className="font-semibold text-white">{banner.unactionedAlerts}</strong> unactioned · ROI{" "}
            <strong className="font-semibold text-white">{Math.abs(banner.roiVsBaseline)}%</strong> {sign}
          </p>

          <div
            className="ml-auto flex shrink-0 items-center gap-0.5 overflow-hidden transition-all duration-500 ease-out sm:gap-1"
            style={{
              opacity: p,
              maxWidth: p > 0.02 ? "min(65%, 420px)" : 0,
              transform: `translateX(${(1 - p) * 12}px)`,
              pointerEvents: p > 0.35 ? "auto" : "none",
            }}
            aria-hidden={p < 0.1}
          >
            <StickyKpiChip label="Health" value={kpis.farmHealthScore} />
            <StickyKpiChip label="Alerts" value={kpis.activeAlerts} />
            <StickyKpiChip label="ROI" value={`${kpis.seasonRoiPct}%`} />
            <StickyKpiChip label="Precision" value={`${kpis.precisionActionRate}%`} />
          </div>
        </div>
      </div>
    </header>
  );
}
