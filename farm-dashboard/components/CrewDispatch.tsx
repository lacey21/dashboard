"use client";

import { useMemo, useState } from "react";
import { CtaCard, CtaModal } from "@/components/CtaModal";
import type { PlotRowData } from "@/components/PlotRow";
import { COLORS } from "@/constants/colors";

/**
 * Alert-triage call-to-action: turns the ranked plot list into a concrete
 * morning dispatch — which plot to hit first, where it is, and what to focus
 * on. The dataset carries no crew contacts, so we don't invent any: the plan
 * is assigned to "on-call crew" and the manager picks who to send it to.
 */

/** What a crew should actually do on arrival, by alert type. */
const FOCUS_BY_ALERT: Record<string, string> = {
  "Low Moisture": "Check irrigation lines and emitters, then increase watering on the block.",
  "High Pest Pressure": "Scout for pests and apply a targeted IPM treatment to the hotspot.",
  "High Canopy Temp": "Open vents / deploy shade and confirm cooling is running.",
  "High VPD": "Adjust venting and humidity to pull VPD back into range.",
};

function focusFor(plot: PlotRowData, recommended?: string): string {
  if (recommended && recommended.toLowerCase() !== "no action") return recommended;
  if (plot.alert_type && FOCUS_BY_ALERT[plot.alert_type]) return FOCUS_BY_ALERT[plot.alert_type];
  return "Walk the block, log stress drivers, and stabilize the plot.";
}

function mapsHref(plot: PlotRowData): string {
  const q = [plot.farm_name, plot.greenhouse_id, plot.region].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || "greenhouse")}`;
}

type Props = {
  /** Harvest-filtered plot pool for the active week (any order). */
  plots: PlotRowData[];
  /** plot_id → recommended action, pulled from the plot's latest alert. */
  recommendedActions?: Record<string, string>;
  dayName: string;
};

export function CrewDispatch({ plots, recommendedActions, dayName }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Top 3 by urgency — the route for this morning.
  const route = useMemo(
    () => [...plots].sort((a, b) => b.urgency_score - a.urgency_score).slice(0, 3),
    [plots],
  );

  if (route.length === 0) return null;

  const first = route[0];
  const focus = focusFor(first, recommendedActions?.[first.plot_id]);
  const stressPct = Math.round(first.plant_stress_index * 100);

  const dispatchText = [
    `GreenLeaf crew dispatch — ${dayName}`,
    ``,
    `1. VISIT FIRST: ${first.label}`,
    `   Location: ${[first.farm_name, first.greenhouse_id, first.region].filter(Boolean).join(" · ")}`,
    `   Focus: ${first.alert_type ?? "Stress"} (${stressPct}% stress) — ${focus}`,
    route[1] ? `\n2. Then: ${route[1].label} (${Math.round(route[1].plant_stress_index * 100)}% stress)` : "",
    route[2] ? `3. Then: ${route[2].label} (${Math.round(route[2].plant_stress_index * 100)}% stress)` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const copyDispatch = async () => {
    try {
      await navigator.clipboard.writeText(dispatchText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <>
      <CtaCard
        eyebrow="Take action"
        title="Dispatch your crew"
        description="Get a ready-to-send plan: which plot first, where it is, who to call, what to do."
        buttonLabel="Plan today's route →"
        onClick={() => setOpen(true)}
        icon={<IconRoute />}
      />

      <CtaModal
        open={open}
        onClose={() => setOpen(false)}
        title="Crew dispatch plan"
        subtitle={`${dayName} · ${route.length} stop${route.length !== 1 ? "s" : ""} prioritized by urgency`}
        icon={<IconRoute />}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <a
              href={`sms:?body=${encodeURIComponent(dispatchText)}`}
              className="rounded-lg border border-sage-300 bg-white px-4 py-2 text-sm font-semibold text-sage-800 transition hover:bg-sage-50"
            >
              Text the plan
            </a>
            <button
              type="button"
              onClick={copyDispatch}
              className="rounded-lg bg-sage-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-800"
            >
              {copied ? "Copied ✓" : "Copy dispatch"}
            </button>
          </div>
        }
      >
        {/* Visit first — the hero stop */}
        <div className="rounded-xl border-2 p-4" style={{ borderColor: COLORS.critical }}>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
              style={{ backgroundColor: COLORS.critical }}
            >
              VISIT FIRST
            </span>
            <span className="text-xs font-medium text-sage-500">Urgency {first.urgency_score.toFixed(2)}</span>
          </div>

          <p className="mt-2 text-base font-bold text-sage-900">{first.label}</p>
          <p className="text-sm text-sage-600">{first.oneliner}</p>

          <dl className="mt-4 space-y-3 text-sm">
            <DispatchRow label="Location">
              <span className="font-medium text-sage-900">
                {[first.farm_name, first.greenhouse_id, first.region].filter(Boolean).join(" · ")}
              </span>
              <a
                href={mapsHref(first)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 font-semibold text-sage-700 underline hover:text-sage-900"
              >
                Open in Maps ↗
              </a>
            </DispatchRow>

            <DispatchRow label="Assign to">
              <span className="font-medium text-sage-900">On-call crew</span>
              <p className="mt-1 text-xs text-sage-500">
                No crew contacts in this dataset — send the plan below and assign whoever&apos;s available.
              </p>
            </DispatchRow>

            <DispatchRow label="Focus on">
              <span className="font-medium text-sage-900">{first.alert_type ?? "Plant stress"}</span>
              <span className="ml-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                {stressPct}% stress
              </span>
              <p className="mt-1 text-sage-700">{focus}</p>
            </DispatchRow>
          </dl>
        </div>

        {/* Next stops */}
        {route.length > 1 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-500">Then head to</p>
            <ol className="space-y-2">
              {route.slice(1).map((p, i) => (
                <li
                  key={p.plot_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-sage-200 bg-white px-3 py-2.5"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-bold text-sage-700">
                      {i + 2}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-sage-900">{p.label}</span>
                      <span className="block text-xs text-sage-500">
                        {[p.farm_name, p.greenhouse_id].filter(Boolean).join(" · ")} · {p.alert_type ?? "Stress"}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold" style={{ color: COLORS.critical }}>
                    {Math.round(p.plant_stress_index * 100)}%
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CtaModal>
    </>
  );
}

function DispatchRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-sage-400 sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sage-700">{children}</dd>
    </div>
  );
}

function IconRoute() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="15" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 7.2v3.3a2.5 2.5 0 002.5 2.5h2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
