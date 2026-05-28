"use client";

import { useEffect, useRef } from "react";
import { StickyKpiChip } from "@/components/StickyKpiChip";

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
  onFarmHealthClick: () => void;
  onAlertsClick: () => void;
  onSeasonClick: () => void;
  onSustainabilityClick: () => void;
};

export function StickyDashboardHeader({
  banner,
  kpis,
  kpiProgress: p,
  onFarmHealthClick,
  onAlertsClick,
  onSeasonClick,
  onSustainabilityClick,
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

          <p className="min-w-0 flex-1 truncate text-[11px] leading-tight text-sage-50 sm:text-xs">
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
            <StickyKpiChip label="Health" value={kpis.farmHealthScore} onClick={onFarmHealthClick} />
            <StickyKpiChip label="Alerts" value={kpis.activeAlerts} onClick={onAlertsClick} />
            <StickyKpiChip label="ROI" value={`${kpis.seasonRoiPct}%`} onClick={onSeasonClick} />
            <StickyKpiChip
              label="Precision"
              value={`${kpis.precisionActionRate}%`}
              onClick={onSustainabilityClick}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
