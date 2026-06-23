"use client";

import { useData } from "@/hooks/useData";
import { CropFilterBanner } from "@/components/CropFilterBanner";
import { StressOutcomeSimulator, type StressModel } from "@/components/StressOutcomeSimulator";
import { COLORS } from "@/constants/colors";

type AlertData = {
  stressModel: StressModel;
  weeklyStats: Record<string, { avgResponseDays: number; responseRate: number }>;
  defaultWeek: string;
};

export default function StressSimulatorPage() {
  const { data, loading, error } = useData<AlertData>("alert_triage.json");

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sage-600">Loading model…</p>
      </main>
    );
  }

  if (error || !data?.stressModel) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-red-600">Could not load stress model. {error}</p>
      </main>
    );
  }

  const model = data.stressModel;

  // Summary stats for the context banner
  const weekKey = data.defaultWeek;
  const weekStats = data.weeklyStats?.[weekKey];

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sage-900">Stress outcome simulator</h1>
        <p className="mt-1.5 text-sage-600">
          A linear surrogate trained on GreenLeaf&apos;s sensor and intervention data.
          Use it to model what happens to plant stress over 3 days depending on when your
          crew responds — and under different growing conditions.
        </p>
      </div>

      {/* Crop filter banner — model is trained on fleet-wide data */}
      <div className="mb-4">
        <CropFilterBanner />
      </div>

      {/* Context banner — operation-wide benchmarks */}
      {weekStats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-sage-200 bg-white p-4 shadow-sm">
            <p
              className="text-2xl font-bold"
              style={{
                color:
                  weekStats.responseRate >= 80
                    ? COLORS.healthy
                    : weekStats.responseRate >= 60
                      ? COLORS.warning
                      : COLORS.critical,
              }}
            >
              {weekStats.responseRate.toFixed(0)}%
            </p>
            <p className="mt-0.5 text-xs text-sage-600">Operation response rate</p>
          </div>
          <div className="rounded-lg border border-sage-200 bg-white p-4 shadow-sm">
            <p
              className="text-2xl font-bold"
              style={{
                color:
                  weekStats.avgResponseDays <= 1
                    ? COLORS.healthy
                    : weekStats.avgResponseDays <= 2
                      ? COLORS.warning
                      : COLORS.critical,
              }}
            >
              {weekStats.avgResponseDays.toFixed(1)}d
            </p>
            <p className="mt-0.5 text-xs text-sage-600">Avg response delay</p>
          </div>
          <div className="rounded-lg border border-sage-200 bg-white p-4 shadow-sm col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold" style={{ color: COLORS.precision }}>
              {(model.avgSeasonDelta * 100).toFixed(1)}%
            </p>
            <p className="mt-0.5 text-xs text-sage-600">Avg season stress Δ</p>
          </div>
        </div>
      )}

      {/* How it works callout */}
      <div className="mb-6 rounded-lg border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-700 leading-relaxed">
        <p className="font-semibold text-sage-800 mb-1">How the model works</p>
        <p>
          The simulator fits a linear regression surrogate over the GradientBoosting predictions
          from GreenLeaf&apos;s training set. Each slider adjusts an input feature and the chart
          shows how projected 3-day stress change varies as response delay grows from 0 to 5 days.
          The green zone means stress is expected to fall; red means it rises.
        </p>
      </div>

      {/* The simulator itself */}
      <StressOutcomeSimulator model={model} />

      {/* Feature coefficient table */}
      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sage-500">
          Model coefficients
        </p>
        <div className="overflow-hidden rounded-lg border border-sage-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sage-100 bg-sage-50 text-sage-500">
                <th className="px-4 py-2.5 font-semibold">Feature</th>
                <th className="px-4 py-2.5 font-semibold text-right">Coefficient</th>
                <th className="px-4 py-2.5 font-semibold text-right hidden sm:table-cell">Direction</th>
              </tr>
            </thead>
            <tbody>
              {model.featureNames.map((name, i) => {
                const coef = model.coefficients[i];
                const isPositive = coef > 0;
                return (
                  <tr key={name} className="border-b border-sage-50 last:border-0">
                    <td className="px-4 py-2.5 text-sage-800 font-medium">
                      {name.replace(/_/g, " ")}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-mono font-semibold"
                      style={{ color: isPositive ? COLORS.critical : COLORS.healthy }}
                    >
                      {coef >= 0 ? "+" : ""}{coef.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sage-400 hidden sm:table-cell">
                      {isPositive ? "↑ increases stress" : "↓ reduces stress"}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-sage-50 border-t border-sage-200">
                <td className="px-4 py-2.5 text-sage-500">intercept</td>
                <td className="px-4 py-2.5 text-right font-mono text-sage-700">
                  {model.intercept >= 0 ? "+" : ""}{model.intercept.toFixed(4)}
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell" />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-sage-400">
          Positive coefficients → higher input values push the 3-day stress change upward (worse outcome).
          Negative coefficients → higher values are associated with stress recovery.
        </p>
      </div>

    </main>
  );
}
