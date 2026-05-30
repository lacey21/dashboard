"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { COLORS } from "@/constants/colors";

type Point = {
  plot_id: string;
  treatment: string;
  totalCost: number;
  avgStress: number;
  yield: number;
};

const TREATMENT_COLORS: Record<string, string> = {
  Control: COLORS.routine,
  "Integrated Pest": COLORS.healthy,
  "High Light": COLORS.precision,
};

export function ScatterPlot({ data }: { data: Point[] }) {
  const maxYield = Math.max(...data.map((d) => d.yield), 1);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="totalCost"
            name="Season cost"
            tick={{ fontSize: 11 }}
            label={{ value: "Total season cost ($)", position: "bottom", offset: 0, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="avgStress"
            name="Avg stress"
            tick={{ fontSize: 11 }}
            label={{
              value: "Avg stress (lower is better)",
              angle: -90,
              position: "insideLeft",
              fontSize: 11,
            }}
          />
          <ZAxis type="number" dataKey="yield" range={[40, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value, name) => {
              const v = Number(value);
              if (name === "totalCost") return [`$${v.toFixed(0)}`, "Cost"];
              if (name === "avgStress") return [v.toFixed(2), "Stress"];
              return [v.toFixed(2), String(name)];
            }}
          />
          <Scatter data={data} fill={COLORS.precision}>
            {data.map((entry) => (
              <circle
                key={entry.plot_id}
                r={4 + (entry.yield / maxYield) * 8}
                fill={TREATMENT_COLORS[entry.treatment] ?? COLORS.precision}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      {/* Inset so labels clear the Y-axis ticks (left) and X-axis (bottom); pills keep them legible over gridlines */}
      <div className="pointer-events-none absolute bottom-11 left-[68px] right-6 top-5 grid grid-cols-2 grid-rows-2 text-[11px] font-medium uppercase tracking-wide text-sage-500">
        <span className="self-start justify-self-start rounded bg-white/80 px-1.5 py-0.5">Underinvested</span>
        <span className="self-start justify-self-end rounded bg-white/80 px-1.5 py-0.5">Inefficient</span>
        <span className="self-end justify-self-start rounded bg-white/80 px-1.5 py-0.5">Optimal</span>
        <span className="self-end justify-self-end rounded bg-white/80 px-1.5 py-0.5">Efficient</span>
      </div>
      <p className="mt-3 rounded-lg border-l-4 border-sage-600 bg-sage-50 px-3 py-2 text-sm font-medium text-sage-900">
        Bottom-left is where you want to be: low stress, low cost. Top-right needs a different strategy.
      </p>
    </div>
  );
}
