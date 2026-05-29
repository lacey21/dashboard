"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useData } from "@/hooks/useData";
import { KPICard } from "@/components/KPICard";
import { SpendReturnBar } from "@/charts/SpendReturnBar";
import { ScatterPlot } from "@/charts/ScatterPlot";
import { YieldSimulator } from "@/components/YieldSimulator";
import { LoanCalculator } from "@/components/LoanCalculator";
import { Collapsible } from "@/components/Collapsible";
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
  scatterPlots: { plot_id: string; treatment: string; totalCost: number; avgStress: number; yield: number }[];
  yieldBenchmark: { crop: string; avgYield: number; benchmark: number; aboveBenchmark: boolean }[];
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

export default function SeasonalEvaluationPage({ embedded = false }: { embedded?: boolean }) {
  const { data, loading } = useData<SeasonData>("seasonal_evaluation.json");

  if (loading || !data) {
    return <p className={embedded ? "py-4 text-sage-700" : "p-8 text-sage-700"}>Loading season review…</p>;
  }

  const f = data.financials;

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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <h2 className="font-semibold text-sage-900">Spend vs return by treatment</h2>
        <SpendReturnBar data={data.spendReturnByTreatment} controlBaseline={data.controlRevenueBaseline} />
        <p className="text-sm text-sage-700">
          Treatments above the baseline line outperformed routine management.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-sage-900">Precision vs routine cost over time</h2>
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
          Weeks with higher precision spend are followed by stress reduction — or they aren&apos;t. Both
          patterns are visible here.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-sage-900">Stress vs spend</h2>
        <ScatterPlot data={data.scatterPlots} />
      </section>

      <section id="yield-benchmark" className="mt-10 scroll-mt-28">
        <h2 className="font-semibold text-sage-900">Yield benchmark by crop</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.yieldBenchmark}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="crop" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="avgYield" name="GreenLeaf avg">
              {data.yieldBenchmark.map((entry) => (
                <Cell key={entry.crop} fill={entry.aboveBenchmark ? COLORS.healthy : COLORS.warning} />
              ))}
            </Bar>
            <Bar dataKey="benchmark" name="BC benchmark" fill={COLORS.routine} opacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
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
          summary={`See how a loan could fit your harvest cycle — pays for itself in about ${Math.ceil(
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
    </Wrapper>
  );
}
