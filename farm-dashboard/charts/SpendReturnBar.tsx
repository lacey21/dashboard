"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "@/constants/colors";

type Row = { treatment: string; avg_cost: number; avg_revenue: number };

const CONTROL_STROKE = COLORS.warning;
const CONTROL_COST_FILL = COLORS.sageMuted;
const CONTROL_REVENUE_FILL = "#C9A85A";

function isControlTreatment(treatment: string) {
  return treatment.trim().toLowerCase() === "control";
}

/** One word per line when the label spans multiple words; control always gets a second line */
function treatmentLabelLines(treatment: string): string[] {
  if (isControlTreatment(treatment)) return ["Control", "(baseline)"];
  const words = treatment.trim().split(/\s+/);
  return words.length > 1 ? words : [treatment];
}

function TreatmentTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const label = payload?.value ?? "";
  const isControl = isControlTreatment(label);
  const lines = treatmentLabelLines(label);
  const lineHeight = 13;

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill={isControl ? CONTROL_STROKE : COLORS.textMuted}>
        {lines.map((line, i) => (
          <tspan
            key={`${label}-${i}`}
            x={0}
            dy={i === 0 ? lineHeight : lineHeight}
            fontSize={isControl ? 12 : 11}
            fontWeight={isControl ? 700 : 400}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

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
      <BarChart data={chartData} margin={{ bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="treatment" height={48} tick={TreatmentTick} interval={0} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
        <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 0 }} />
        <ReferenceLine
          y={controlBaseline}
          stroke={COLORS.warning}
          strokeDasharray="5 5"
          label={{ value: "Control baseline", position: "insideTopRight", fontSize: 11 }}
        />
        <Bar dataKey="cost" name="Avg cost" fill={COLORS.routine} radius={[2, 2, 0, 0]}>
          {chartData.map((entry) => {
            const isControl = isControlTreatment(entry.treatment);
            return (
              <Cell
                key={`cost-${entry.treatment}`}
                fill={isControl ? CONTROL_COST_FILL : COLORS.routine}
                stroke={isControl ? CONTROL_STROKE : "none"}
                strokeWidth={isControl ? 2 : 0}
              />
            );
          })}
        </Bar>
        <Bar dataKey="revenue" name="Avg revenue" fill={COLORS.healthy} radius={[2, 2, 0, 0]}>
          {chartData.map((entry) => {
            const isControl = isControlTreatment(entry.treatment);
            return (
              <Cell
                key={`revenue-${entry.treatment}`}
                fill={isControl ? CONTROL_REVENUE_FILL : COLORS.healthy}
                stroke={isControl ? CONTROL_STROKE : "none"}
                strokeWidth={isControl ? 2 : 0}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
