"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "@/constants/colors";
import {
  YIELD_LEGEND_SOURCES,
  getYieldBenchmarkStatus,
  getYieldBenchmarkTier,
  type YieldBenchmarkStatus,
} from "@/constants/thresholds";

/** Fixed series colors — not tied to benchmark performance. */
const SERIES_COLORS = {
  greenLeaf: COLORS.chartGreen,
  typical: COLORS.chartBlue,
  aspirational: COLORS.chartRed,
} as const;

const SERIES_NAMES = {
  greenLeaf: "GreenLeaf avg",
  typical: "Typical Canadian norm",
  aspirational: "Aspirational target",
} as const;

export type YieldBenchmarkRow = {
  crop: string;
  avgYield: number;
  typicalBenchmark?: number;
  aspirationalBenchmark?: number;
  status?: YieldBenchmarkStatus;
};

function seriesColor(name: string): string {
  if (name === SERIES_NAMES.greenLeaf) return SERIES_COLORS.greenLeaf;
  if (name === SERIES_NAMES.typical) return SERIES_COLORS.typical;
  if (name === SERIES_NAMES.aspirational) return SERIES_COLORS.aspirational;
  return COLORS.sage;
}

function statusLabel(status: YieldBenchmarkStatus): string {
  switch (status) {
    case "on_or_above":
      return "On or above typical Canadian norm";
    case "below_typical":
      return "Below typical (70–90% of norm)";
    case "well_below":
      return "Well below typical norm";
    case "check_units":
      return "Check units — yield may not be annual kg/m²";
  }
}

type ChartRow = YieldBenchmarkRow & {
  typicalBenchmark: number;
  aspirationalBenchmark: number;
  status: YieldBenchmarkStatus;
};

function enrichRows(rows: YieldBenchmarkRow[]): ChartRow[] {
  return rows.map((row) => {
    const tier = getYieldBenchmarkTier(row.crop);
    const typicalBenchmark = row.typicalBenchmark ?? tier.typical;
    const aspirationalBenchmark = row.aspirationalBenchmark ?? tier.aspirational;
    const status = row.status ?? getYieldBenchmarkStatus(row.avgYield, typicalBenchmark);
    return { ...row, typicalBenchmark, aspirationalBenchmark, status };
  });
}

function BenchmarkTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="max-w-xs rounded-lg border border-sage-200 bg-white p-3 text-xs shadow-md">
      <p className="font-semibold text-sage-900">{row.crop}</p>
      <dl className="mt-2 space-y-1 text-sage-700">
        <div className="flex justify-between gap-4">
          <dt>GreenLeaf avg</dt>
          <dd className="font-medium text-sage-900">{row.avgYield.toFixed(1)} kg/m²</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Typical commercial</dt>
          <dd>{row.typicalBenchmark.toFixed(1)} kg/m²</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Aspirational</dt>
          <dd>{row.aspirationalBenchmark.toFixed(1)} kg/m²</dd>
        </div>
      </dl>
      <p className="mt-2 border-t border-sage-100 pt-2 text-sage-600">{statusLabel(row.status)}</p>
    </div>
  );
}

function BenchmarkLegend({
  payload,
}: {
  payload?: { value: string; color: string }[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!payload?.length) return null;

  return (
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-2 text-xs text-sage-800">
      {payload.map((entry) => {
        const source = YIELD_LEGEND_SOURCES[entry.value];
        const color = seriesColor(entry.value);
        return (
          <li
            key={entry.value}
            className="relative"
            onMouseEnter={() => setHovered(entry.value)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(entry.value)}
            onBlur={() => setHovered(null)}
          >
            <span
              className="inline-flex cursor-help items-center gap-1.5 rounded px-1 py-0.5 hover:bg-sage-50"
              tabIndex={0}
              title={source}
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: color }}
              />
              {entry.value}
            </span>
            {hovered === entry.value && source && (
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-lg border border-sage-200 bg-white p-2.5 text-[11px] leading-snug text-sage-700 shadow-md"
              >
                {source}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function YieldBenchmarkChart({ data }: { data: YieldBenchmarkRow[] }) {
  const chartData = enrichRows(data);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ bottom: 8, left: 4, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="crop" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          label={{
            value: "kg/m² (annual, marketable)",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            fontSize: 10,
            fill: COLORS.textMuted,
          }}
        />
        <Tooltip content={<BenchmarkTooltip />} />
        <Legend content={<BenchmarkLegend />} />
        <Bar dataKey="avgYield" name={SERIES_NAMES.greenLeaf} fill={SERIES_COLORS.greenLeaf} />
        <Bar
          dataKey="typicalBenchmark"
          name={SERIES_NAMES.typical}
          fill={SERIES_COLORS.typical}
        />
        <Bar
          dataKey="aspirationalBenchmark"
          name={SERIES_NAMES.aspirational}
          fill={SERIES_COLORS.aspirational}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
