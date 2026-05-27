"use client";

import { useState } from "react";
import { StressTimeline } from "@/charts/StressTimeline";
import { CostBreakdown } from "@/charts/CostBreakdown";
import { GeminiInsight } from "@/components/GeminiInsight";
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
};

type Props = {
  detail: PlotDetail | null;
  onClose: () => void;
};

const TABS = ["Overview", "Alert Log", "Costs", "AI Insight"] as const;

export function PlotDrawer({ detail, onClose }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

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
        <div className="border-b border-sage-200 bg-white p-5">
          <button type="button" onClick={onClose} className="mb-2 text-sm text-sage-600">
            ← Back
          </button>
          <p className="text-sm font-medium text-sage-900">{detail.header}</p>
        </div>
        <div className="flex border-b border-sage-200 bg-white">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium ${
                tab === t ? "border-b-2 text-sage-900" : "text-sage-600"
              }`}
              style={tab === t ? { borderColor: COLORS.precision } : {}}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto bg-white p-5">
          {tab === "Overview" && (
            <>
              <StressTimeline data={detail.timeline} />
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
              <p className="mt-4 text-sm text-sage-700">
                Send your crew here if stress stays above the threshold with no action recorded.
              </p>
            </>
          )}
          {tab === "Alert Log" && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sage-100 text-sage-600">
                  <th className="py-2">Date</th>
                  <th>Alert</th>
                  <th>Action</th>
                  <th>Delay</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {detail.alertLog.map((row) => (
                  <tr
                    key={row.date}
                    className={`border-b ${row.action_taken === 0 ? "border-l-4 border-l-amber-400" : ""}`}
                  >
                    <td className="py-2">{row.date}</td>
                    <td>{row.alert_type}</td>
                    <td>{row.action_taken ? "Yes" : "No"}</td>
                    <td>{row.action_delay_days}d</td>
                    <td
                      style={{
                        color:
                          row.post_action_stress_delta_3d < 0
                            ? COLORS.healthy
                            : row.post_action_stress_delta_3d > 0
                              ? COLORS.critical
                              : undefined,
                      }}
                    >
                      {row.post_action_stress_delta_3d.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === "Costs" && <CostBreakdown costs={detail.costs} />}
          {tab === "AI Insight" && <GeminiInsight prompt={prompt} label="plot advice" />}
        </div>
      </aside>
    </>
  );
}
