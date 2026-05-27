"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "@/constants/colors";
import { STRESS_THRESHOLD } from "@/constants/thresholds";

type Point = {
  date: string;
  plant_stress_index: number;
  alert_flag: number;
  action_taken: number;
};

export function StressTimeline({ data }: { data: Point[] }) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    stress: d.plant_stress_index,
    alert: d.alert_flag === 1,
    action: d.action_taken === 1,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d4dfd1" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis
          domain={[0, 1]}
          tick={{ fontSize: 11 }}
          label={{
            value: "Stress (0 = healthy, 1 = critical)",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 10 },
          }}
        />
        <Tooltip />
        <ReferenceLine
          y={STRESS_THRESHOLD}
          stroke={COLORS.warning}
          strokeDasharray="4 4"
          label={{ value: "High stress threshold", position: "right", fontSize: 10 }}
        />
        <Line
          type="monotone"
          dataKey="stress"
          stroke={COLORS.critical}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
