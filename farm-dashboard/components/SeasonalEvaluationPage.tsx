"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useData } from "@/hooks/useData";
import { useFarm } from "@/contexts/FarmContext";
import { CropFilterBanner } from "@/components/CropFilterBanner";
import { KPICard } from "@/components/KPICard";
import { SpendReturnBar } from "@/charts/SpendReturnBar";
import { ScatterPlot } from "@/charts/ScatterPlot";
import { YieldBenchmarkChart, type YieldBenchmarkRow } from "@/charts/YieldBenchmarkChart";
import { YieldSimulator } from "@/components/YieldSimulator";
import { LoanCalculator } from "@/components/LoanCalculator";
import { Collapsible } from "@/components/Collapsible";
import { ExpandableChartSection, PreviewStat } from "@/components/ExpandableChartSection";
import { BankReport } from "@/components/BankReport";
import { COLORS } from "@/constants/colors";

type SeasonData = {
  financials: {
    totalRevenue: number;
    totalCost: number;
    precisionSpend: number;
    precisionBenefit: number;
    avgYield: number;
    controlYield: number;
    meanRoiPct: number;
    benefitPerDollar: number;
  };
  spendReturnByTreatment: { treatment: string; avg_cost: number; avg_revenue: number }[];
  controlRevenueBaseline: number;
  costOverTime: { week: string; precision: number; routine: number; plant_stress_index: number }[];
  scatterPlots: { plot_id: string; crop?: string; treatment: string; totalCost: number; avgStress: number; yield: number }[];
  yieldBenchmark: YieldBenchmarkRow[];
  yieldModel: Parameters<typeof YieldSimulator>[0]["model"];
  monthlyRevenueCurve: { month: number; revenue: number }[];
  precisionBenefitPerSeason: number;
};

const COST_OVER_TIME_COLORS = {
  precision: "#2563EB",
  routine: COLORS.sage,
};

const WEEK_RANGE = /^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/;

function parseCostWeek(week: string): { start: Date; end: Date | null } {
  const match = week.match(WEEK_RANGE);
  if (match) {
    return {
      start: new Date(`${match[1]}T12:00:00`),
      end: new Date(`${match[2]}T12:00:00`),
    };
  }
  const start = new Date(`${week}T12:00:00`);
  return { start, end: null };
}

function formatCostWeekAxis(week: string): string {
  const { start } = parseCostWeek(week);
  if (Number.isNaN(start.getTime())) return week;
  return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCostWeekTooltip(week: string): string {
  const { start, end } = parseCostWeek(week);
  if (Number.isNaN(start.getTime())) return week;
  const short: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (end && !Number.isNaN(end.getTime())) {
    return `${start.toLocaleDateString("en-US", short)} – ${end.toLocaleDateString("en-US", short)}, ${start.getFullYear()}`;
  }
  return start.toLocaleDateString("en-US", { ...short, year: "numeric" });
}

function summarizeCostOverTime(
  rows: { precision: number; routine: number; plant_stress_index: number }[],
) {
  const totalPrecision = rows.reduce((s, r) => s + r.precision, 0);
  const totalRoutine = rows.reduce((s, r) => s + r.routine, 0);
  const total = totalPrecision + totalRoutine;
  const avgStress = rows.reduce((s, r) => s + r.plant_stress_index, 0) / Math.max(rows.length, 1);
  const precisionPct = total > 0 ? Math.round((totalPrecision / total) * 100) : 0;

  const q = Math.max(1, Math.floor(rows.length / 4));
  const stressStart =
    rows.slice(0, q).reduce((s, r) => s + r.plant_stress_index, 0) / q;
  const stressEnd =
    rows.slice(-q).reduce((s, r) => s + r.plant_stress_index, 0) / q;
  const stressDelta = stressEnd - stressStart;

  let insight: string;
  if (stressDelta < -0.03) {
    insight = `Stress eased from ${stressStart.toFixed(2)} early season to ${stressEnd.toFixed(2)} late season. Precision was ${precisionPct}% of tracked weekly spend.`;
  } else if (stressDelta > 0.03) {
    insight = `Stress climbed through the season (${stressStart.toFixed(2)} → ${stressEnd.toFixed(2)}). See whether precision-heavy weeks bought relief in the full chart.`;
  } else {
    insight = `Stress held near ${avgStress.toFixed(2)} on average across ${rows.length} weeks. Precision was ${precisionPct}% of weekly spend.`;
  }

  return { totalPrecision, totalRoutine, avgStress, precisionPct, insight };
}

function summarizeScatter(
  points: { plot_id: string; treatment: string; totalCost: number; avgStress: number; yield: number }[],
) {
  const avgStress = points.reduce((s, p) => s + p.avgStress, 0) / Math.max(points.length, 1);
  const costs = [...points.map((p) => p.totalCost)].sort((a, b) => a - b);
  const stresses = [...points.map((p) => p.avgStress)].sort((a, b) => a - b);
  const medianCost = costs[Math.floor(costs.length / 2)] ?? 0;
  const medianStress = stresses[Math.floor(stresses.length / 2)] ?? 0;
  const inefficient = points.filter(
    (p) => p.totalCost >= medianCost && p.avgStress >= medianStress,
  ).length;

  const byTreatment = new Map<string, { yieldSum: number; n: number }>();
  for (const p of points) {
    const cur = byTreatment.get(p.treatment) ?? { yieldSum: 0, n: 0 };
    byTreatment.set(p.treatment, { yieldSum: cur.yieldSum + p.yield, n: cur.n + 1 });
  }
  let bestTreatment = "N/A";
  let bestAvgYield = 0;
  for (const [treatment, { yieldSum, n }] of byTreatment) {
    const avg = yieldSum / n;
    if (avg > bestAvgYield) {
      bestAvgYield = avg;
      bestTreatment = treatment;
    }
  }

  const bestPlot = points.reduce(
    (best, p) => (p.yield > best.yield ? p : best),
    points[0] ?? { plot_id: "N/A", yield: 0 },
  );

  const insight =
    inefficient > 0
      ? `${inefficient} plot${inefficient === 1 ? "" : "s"} spent above the median but stayed stressed. See the scatter chart for where spend didn't buy relief.`
      : `Higher spend generally paired with manageable stress. ${bestTreatment} led on average yield this season.`;

  return {
    count: points.length,
    avgStress,
    bestTreatment,
    bestAvgYield,
    bestPlotId: bestPlot.plot_id,
    bestYield: bestPlot.yield,
    inefficient,
    insight,
  };
}

export default function SeasonalEvaluationPage({ embedded = false }: { embedded?: boolean }) {
  const { data, loading } = useData<SeasonData>("seasonal_evaluation.json");
  const { cropFilter } = useFarm();

  if (loading || !data) {
    return <p className={embedded ? "py-4 text-sage-700" : "p-8 text-sage-700"}>Loading season review…</p>;
  }

  const f = data.financials;
  const costSummary = summarizeCostOverTime(data.costOverTime);

  // Apply crop filter to per-plot data; financials/costOverTime are fleet-wide aggregates
  const filteredScatterPlots = cropFilter
    ? data.scatterPlots.filter((p) => p.crop === cropFilter)
    : data.scatterPlots;
  const filteredBenchmark = cropFilter
    ? data.yieldBenchmark.filter((r) => r.crop === cropFilter)
    : data.yieldBenchmark;

  const scatterSummary = summarizeScatter(filteredScatterPlots);

  const Wrapper = embedded ? "div" : "main";
  const wrapClass = embedded ? "" : "mx-auto max-w-7xl px-6 py-8";

  return (
    <Wrapper className={wrapClass}>
      <h2 className={embedded ? "text-xl font-bold text-sage-900" : "text-2xl font-bold text-sage-900"}>
        You&apos;re preparing for a conversation with your lender.
      </h2>
      <p className="mt-1 text-sage-700">
        Here&apos;s the evidence that your precision system is paying for itself.
      </p>

      {/* Crop filter banner — scatter + yield benchmark filter; financials are fleet-wide */}
      <div className="mt-3">
        <CropFilterBanner
          filteredCount={filteredScatterPlots.length}
          totalCount={data.scatterPlots.length}
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          id="total-revenue"
          label="Total revenue this season"
          value={`$${f.totalRevenue.toLocaleString()}`}
          delta={Math.round(((f.totalRevenue - f.totalCost) / f.totalCost) * 100)}
          deltaLabel="vs total cost"
          deltaPositive={f.totalRevenue > f.totalCost}
        />
        <KPICard
          label="Precision spend"
          value={`$${f.precisionSpend.toLocaleString()}`}
          delta={Math.round((f.precisionSpend / f.totalCost) * 100)}
          deltaLabel="% of total spend"
        />
        <KPICard
          id="precision-benefit"
          label="Precision benefit"
          value={`$${f.precisionBenefit.toLocaleString()}`}
          delta={Math.round((f.precisionBenefit / Math.max(f.precisionSpend, 1)) * 100)}
          deltaLabel="% return on precision spend"
          deltaPositive
        />
        <KPICard
          label="Avg yield (kg/m²)"
          value={f.avgYield.toFixed(1)}
          delta={Math.round(((f.avgYield - f.controlYield) / f.controlYield) * 100)}
          deltaLabel="vs Control treatment"
          deltaPositive={f.avgYield >= f.controlYield}
        />
      </div>

      <div className="mt-4 rounded-lg border-l-4 border-sage-600 bg-sage-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-sage-600">Bottom line</p>
        <p className="mt-0.5 text-base font-semibold text-sage-900">
          For every $1 spent on precision actions, GreenLeaf returned ${f.benefitPerDollar} in measurable
          benefit.
        </p>
      </div>

      <section id="spend-return" className="mt-10 scroll-mt-28">
        <h2 className="mb-3 font-semibold text-sage-900">Spend vs return by treatment</h2>
        <SpendReturnBar data={data.spendReturnByTreatment} controlBaseline={data.controlRevenueBaseline} />
        <p className="-mt-3 text-sm leading-snug text-sage-700">
          Treatments above the baseline line outperformed routine management.
        </p>
      </section>

      <section className="mt-10">
        <ExpandableChartSection
          title="Precision vs routine cost over time"
          description="Weekly precision and routine spend stacked with average plant stress."
          insight={costSummary.insight}
          preview={
            <>
              <PreviewStat
                label="Precision spend"
                value={`$${Math.round(costSummary.totalPrecision).toLocaleString()}`}
                hint={`${costSummary.precisionPct}% of season weekly total`}
              />
              <PreviewStat
                label="Routine spend"
                value={`$${Math.round(costSummary.totalRoutine).toLocaleString()}`}
                hint="Stacked with precision by week"
              />
              <PreviewStat
                label="Avg plant stress"
                value={costSummary.avgStress.toFixed(2)}
                hint="0 = calm, 1 = high stress"
              />
            </>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.costOverTime} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10 }}
                tickFormatter={formatCostWeekAxis}
                minTickGap={48}
                interval="preserveStartEnd"
              />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(label) => formatCostWeekTooltip(String(label))} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="precision" stackId="1" fill={COST_OVER_TIME_COLORS.precision} stroke={COST_OVER_TIME_COLORS.precision} name="Precision $" />
              <Area yAxisId="left" type="monotone" dataKey="routine" stackId="1" fill={COST_OVER_TIME_COLORS.routine} stroke={COST_OVER_TIME_COLORS.routine} name="Routine $" />
              <Line yAxisId="right" type="monotone" dataKey="plant_stress_index" stroke={COLORS.critical} name="Avg stress" />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-2 text-sm text-gray-600">
            Weeks with higher precision spend are followed by stress reduction, or they aren&apos;t. Both
            patterns are visible here.
          </p>
        </ExpandableChartSection>
      </section>

      <section id="yield-benchmark" className="mt-10 scroll-mt-28">
        <h2 className="font-semibold text-sage-900">Yield vs Canadian greenhouse norm by crop</h2>
        <YieldBenchmarkChart data={filteredBenchmark} />
      </section>

      <section className="mt-10">
        <ExpandableChartSection
          title="Stress vs spend"
          description="Each dot is one plot: season cost, average stress, and yield, colored by treatment."
          insight={scatterSummary.insight}
          preview={
            <>
              <PreviewStat
                label="Plots tracked"
                value={String(scatterSummary.count)}
                hint={cropFilter ? `${cropFilter} only` : "One season per plot"}
              />
              <PreviewStat
                label="Top treatment"
                value={scatterSummary.bestTreatment}
                hint={`${scatterSummary.bestAvgYield.toFixed(1)} kg/m² avg yield`}
              />
              <PreviewStat
                label="Best plot"
                value={scatterSummary.bestPlotId}
                hint={`${scatterSummary.bestYield.toFixed(1)} kg/m²`}
              />
            </>
          }
        >
          <ScatterPlot data={filteredScatterPlots} />
        </ExpandableChartSection>
      </section>

      <section className="mt-10">
        <Collapsible
          title="Yield simulator"
          summary="What-if: see how spending and management changes would move your yield."
          openLabel="Open simulator"
        >
          <YieldSimulator model={data.yieldModel} />
        </Collapsible>
      </section>

      <section className="mt-10">
        <Collapsible
          title="Loan repayment planner"
          summary={`See how a loan could fit your harvest cycle. Pays for itself in about ${Math.ceil(
            100000 / Math.max(data.precisionBenefitPerSeason, 1),
          )} seasons.`}
          openLabel="Open planner"
        >
          <LoanCalculator
            monthlyRevenue={data.monthlyRevenueCurve}
            precisionBenefitPerSeason={data.precisionBenefitPerSeason}
          />
        </Collapsible>
      </section>

      {/* Call to action: hand the season's numbers to a lender */}
      <BankReport financials={f} treatments={data.spendReturnByTreatment} />
    </Wrapper>
  );
}
