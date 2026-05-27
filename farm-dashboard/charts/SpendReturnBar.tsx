"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "@/constants/colors";

type Row = { treatment: string; avg_cost: number; avg_revenue: number };

export function SpendReturnBar({
  data,
  controlBaseline,
}: {
  data: Row[];
  controlBaseline: number;
}) {
  const chartData = data.map((d) => ({
    treatment: d.treatment,
    cost: Math.round(d.avg_cost),
    revenue: Math.round(d.avg_revenue),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="treatment" angle={-25} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
        <Legend />
        <ReferenceLine
          y={controlBaseline}
          stroke={COLORS.warning}
          strokeDasharray="5 5"
          label={{ value: "Control baseline", position: "insideTopRight", fontSize: 11 }}
        />
        <Bar dataKey="cost" name="Avg cost" fill={COLORS.routine} />
        <Bar dataKey="revenue" name="Avg revenue" fill={COLORS.healthy} />
      </BarChart>
    </ResponsiveContainer>
  );
}
