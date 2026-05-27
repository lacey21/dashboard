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
      <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2 text-xs text-sage-500">
        <span className="p-2">Underinvested</span>
        <span className="p-2 text-right">Inefficient</span>
        <span className="p-2">Optimal</span>
        <span className="p-2 text-right">Efficient</span>
      </div>
      <p className="mt-2 text-sm text-sage-700">
        Bottom-left is where you want to be. Top-right needs a different strategy.
      </p>
    </div>
  );
}
