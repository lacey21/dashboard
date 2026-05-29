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

const TABS = ["This plot", "Costs", "Get advice"] as const;
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

  const prompt = `You are a plain-spoken agricultural advisor. In 2-3 sentences, explain what is
happening with this plot and what the farmer should do today. Be specific with numbers.

Plot: ${detail.geminiContext.crop}, ${detail.geminiContext.farmName}, ${detail.geminiContext.climateZone}
Current stress: ${detail.geminiContext.stressIndex} (above 0.6 is high)
Alert: ${detail.geminiContext.alertType}, ${detail.geminiContext.actionDelayDays} days without action
Stress change after last action: ${detail.geminiContext.postActionDelta}
This week's spend: $${detail.geminiContext.weeklyCost}`;

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

              {/* Stress outcome simulator */}
              {model && (
                <div className="mt-6">
                  <StressOutcomeSimulator model={model} initialValues={detail.simulatorValues} />
                </div>
              )}
            </>
          )}

          {tab === "Costs" && <CostBreakdown costs={detail.costs} />}

          {tab === "Get advice" && (
            <GeminiInsight prompt={prompt} label="remediation suggestions" />
          )}
        </div>
      </aside>
    </>
  );
}
