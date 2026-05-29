"use client";

import { useState } from "react";
import { StressTimeline } from "@/charts/StressTimeline";
import { CostBreakdown } from "@/charts/CostBreakdown";
import { GeminiInsight } from "@/components/GeminiInsight";
import { StressOutcomeSimulator, type StressModel } from "@/components/StressOutcomeSimulator";
import { COLORS } from "@/constants/colors";

type PlotDetail = {
  header: string;
  timeline: { date: string; plant_stress_index: number; alert_flag: number; action_taken: number }[];
  alertLog: {
    date: string;
    alert_type: string;
    recommended_action: string;
    action_taken: number;
    action_delay_days: number;
    post_action_stress_delta_3d: number;
  }[];
  costs: {
    energy: number;
    fertilizer: number;
    labor: number;
    pesticide: number;
    water: number;
    precision: number;
    routine: number;
    total: number;
  };
  geminiContext: Record<string, string | number>;
  simulatorValues?: Record<string, number>;
};

type Props = {
  detail: PlotDetail | null;
  onClose: () => void;
  model?: StressModel;
};

const TABS = ["This plot", "Simulator", "Get advice"] as const;
type TabName = (typeof TABS)[number];

export function PlotDrawer({ detail, onClose, model }: Props) {
  const [tab, setTab] = useState<TabName>("This plot");

  if (!detail) return null;

  const stats = {
    alertDays: detail.timeline.filter((d) => d.alert_flag === 1).length,
    actions: detail.timeline.filter((d) => d.action_taken === 1).length,
    avgStress:
      detail.timeline.reduce((s, d) => s + d.plant_stress_index, 0) /
      Math.max(detail.timeline.length, 1),
  };

  // Build the richest possible prompt so Gemini produces specific, actionable advice
  const cats = [
    { name: "labor", val: detail.costs.labor },
    { name: "fertilizer", val: detail.costs.fertilizer },
    { name: "pesticide", val: detail.costs.pesticide },
    { name: "energy", val: detail.costs.energy },
    { name: "water", val: detail.costs.water },
  ].sort((a, b) => b.val - a.val);
  const topCat = cats[0];
  const precisionPct = detail.costs.total > 0
    ? Math.round((detail.costs.precision / detail.costs.total) * 100)
    : 0;
  const latestAlert = detail.alertLog[0];
  const responseRatio = stats.alertDays > 0
    ? `${stats.actions}/${stats.alertDays} alerts responded`
    : "no alerts this period";

  const prompt = `You are a precision agriculture advisor for a CEA (controlled-environment agriculture) operation. Give concrete, prioritised advice in plain language. Use bullet points. Be specific with the numbers provided — do not hedge.

== Plot ==
Crop: ${detail.geminiContext.crop} | Farm: ${detail.geminiContext.farmName} | Climate zone: ${detail.geminiContext.climateZone}

== Current condition ==
Stress index: ${detail.geminiContext.stressIndex} (critical threshold: 0.6)
Active alert: ${detail.geminiContext.alertType}
Days since alert with no crew action: ${detail.geminiContext.actionDelayDays}
Stress trajectory after last intervention: ${detail.geminiContext.postActionDelta} (negative = improving)
${latestAlert ? `Latest recommended action: "${latestAlert.recommended_action}"` : ""}

== Season summary ==
Alert response: ${responseRatio}
Avg stress this season: ${(stats.avgStress * 100).toFixed(0)}%

== This week's costs ==
Total: $${detail.geminiContext.weeklyCost} | Precision (alert-driven): ${precisionPct}% | Routine: ${100 - precisionPct}%
Largest cost driver: ${topCat?.name ?? "n/a"} ($${topCat?.val.toFixed(0) ?? 0})
${precisionPct >= 25 ? "⚠ Precision spend is elevated above the ~15% baseline." : ""}

== Questions to answer ==
1. What should the farmer do TODAY — in order of priority?
2. What is the most likely root cause of the current alert?
3. Is there a cost concern, and how can it be addressed?`;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-sage-200 bg-white p-5">
          <button type="button" onClick={onClose} className="mb-2 text-sm text-sage-600">
            ← Back
          </button>
          <p className="text-sm font-medium text-sage-900">{detail.header}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-sage-200 bg-white">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t ? "border-b-2 text-sage-900" : "text-sage-500 hover:text-sage-800"
              }`}
              style={tab === t ? { borderColor: COLORS.precision } : {}}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white p-5">

          {/* ── This plot tab ── */}
          {tab === "This plot" && (
            <>
              {/* Stress timeline */}
              <StressTimeline data={detail.timeline} />

              {/* Mini stats */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded border border-sage-100 bg-sage-50 p-2">
                  <p className="font-bold">{stats.alertDays}</p>
                  <p className="text-sage-600">Alert days</p>
                </div>
                <div className="rounded border border-sage-100 bg-sage-50 p-2">
                  <p className="font-bold">{stats.actions}</p>
                  <p className="text-sage-600">Actions taken</p>
                </div>
                <div className="rounded border border-sage-100 bg-sage-50 p-2">
                  <p className="font-bold">{(stats.avgStress * 100).toFixed(0)}%</p>
                  <p className="text-sage-600">Avg stress</p>
                </div>
              </div>

              {/* Recent alerts (last 3) */}
              {detail.alertLog.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-500">
                    Recent alerts
                  </p>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-sage-100 text-sage-500">
                        <th className="pb-1.5">Date</th>
                        <th>Alert</th>
                        <th>Delay</th>
                        <th>3d outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.alertLog.slice(0, 3).map((row) => (
                        <tr key={row.date} className="border-b border-sage-50">
                          <td className="py-1.5">{row.date}</td>
                          <td>{row.alert_type}</td>
                          <td>{row.action_delay_days}d</td>
                          <td
                            style={{
                              color:
                                row.post_action_stress_delta_3d < 0
                                  ? COLORS.healthy
                                  : COLORS.critical,
                            }}
                          >
                            {row.post_action_stress_delta_3d > 0 ? "+" : ""}
                            {row.post_action_stress_delta_3d.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cost breakdown — lives in "This plot" for full context */}
              <div className="mt-6 border-t border-sage-100 pt-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-sage-500">
                  This week&apos;s costs
                </p>
                <CostBreakdown costs={detail.costs} />
              </div>
            </>
          )}

          {/* ── Simulator tab ── */}
          {tab === "Simulator" && (
            model ? (
              <StressOutcomeSimulator model={model} initialValues={detail.simulatorValues} />
            ) : (
              <p className="py-6 text-center text-sm text-sage-500">
                Simulator model not available for this plot.
              </p>
            )
          )}

          {/* ── Get advice tab ── */}
          {tab === "Get advice" && (
            <div>
              {/* Context pills — what Gemini is looking at */}
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  { label: "Stress", value: `${(Number(detail.geminiContext.stressIndex) * 100).toFixed(0)}%` },
                  { label: "Alert", value: String(detail.geminiContext.alertType) },
                  { label: "Delay", value: `${detail.geminiContext.actionDelayDays}d` },
                  { label: "Spend", value: `$${detail.geminiContext.weeklyCost}` },
                ].map(({ label, value }) => (
                  <span
                    key={label}
                    className="rounded-full border border-sage-200 bg-sage-50 px-3 py-1 text-xs text-sage-700"
                  >
                    <span className="text-sage-400">{label}: </span>
                    <span className="font-semibold text-sage-800">{value}</span>
                  </span>
                ))}
              </div>

              <GeminiInsight
                prompt={prompt}
                label="remediation suggestions"
                autoRun
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
