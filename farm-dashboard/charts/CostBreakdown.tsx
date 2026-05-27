"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "@/constants/colors";

type Costs = {
  energy: number;
  fertilizer: number;
  labor: number;
  pesticide: number;
  water: number;
  precision: number;
  routine: number;
  total: number;
};

export function CostBreakdown({ costs }: { costs: Costs }) {
  const items = [
    { name: "Energy", value: costs.energy, type: "routine" },
    { name: "Fertilizer", value: costs.fertilizer, type: "routine" },
    { name: "Labor", value: costs.labor, type: "routine" },
    { name: "Pesticide", value: costs.pesticide, type: "routine" },
    { name: "Water", value: costs.water, type: "routine" },
    { name: "Precision", value: costs.precision, type: "precision" },
  ].filter((i) => i.value > 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart layout="vertical" data={items} margin={{ left: 60 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(0)}`, ""]} />
          <Bar dataKey="value" stackId="a">
            {items.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.type === "precision" ? COLORS.precision : COLORS.routine}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-sm text-sage-700">
        ${costs.total.toFixed(0)} spent this week — ${costs.precision.toFixed(0)} was
        precision-driven
      </p>
    </div>
  );
}
