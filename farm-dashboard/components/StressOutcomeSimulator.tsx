"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { COLORS } from "@/constants/colors";

export type StressModel = {
  featureNames: string[];
  coefficients: number[];
  intercept: number;
  defaults: Record<string, number>;
  bounds: Record<string, [number, number]>;
  avgSeasonDelta: number;
};

const LABELS: Record<string, string> = {
  action_delay_days: "Days before you respond",
  plant_stress_index: "Current stress level (0 = healthy, 1 = critical)",
  vpd_kpa: "Air dryness — VPD (kPa)",
  substrate_moisture: "Soil moisture (0 = dry, 1 = saturated)",
  pest_pressure_index: "Pest pressure (0 = none, 1 = severe)",
  disease_risk_index: "Disease risk (0 = none, 1 = severe)",
};

function predict(features: Record<string, number>, model: StressModel): number {
  let y = model.intercept;
  model.featureNames.forEach((name, i) => {
    y += model.coefficients[i] * (features[name] ?? 0);
  });
  return y;
}

function OutcomePanel({ delta, label }: { delta: number; label: string }) {
  const isGood = delta < 0;
  const color = isGood ? COLORS.healthy : COLORS.critical;
  const sign = delta >= 0 ? "+" : "";
  return (
    <div
      className="flex flex-col items-center rounded-lg border p-4 text-center"
      style={{ borderColor: color, background: isGood ? "#f0f7f1" : "#fdf3f1" }}
    >
      <p className="text-xs text-sage-600 mb-2">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>
        {sign}{delta.toFixed(3)}
      </p>
      <p className="mt-1 text-xs font-medium" style={{ color }}>
        {isGood ? "stress drops ↓" : "stress rises ↑"}
      </p>
    </div>
  );
}

// Custom tooltip for the delay chart
function DelayTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const isGood = val < 0;
  return (
    <div className="rounded border border-sage-200 bg-white px-2.5 py-2 text-xs shadow-md">
      <p className="text-sage-500 mb-0.5">{label}d delay</p>
      <p className="font-semibold" style={{ color: isGood ? COLORS.healthy : COLORS.critical }}>
        Δ {val >= 0 ? "+" : ""}{val.toFixed(3)}
      </p>
    </div>
  );
}

export function StressOutcomeSimulator({
  model,
  initialValues,
}: {
  model: StressModel;
  initialValues?: Record<string, number>;
}) {
  const [values, setValues] = useState<Record<string, number>>(
    initialValues ? { ...model.defaults, ...initialValues } : { ...model.defaults },
  );

  useEffect(() => {
    if (initialValues) {
      setValues((prev) => ({ ...prev, ...initialValues } as Record<string, number>));
    }
  }, [initialValues]);

  const actNow = useMemo(
    () => predict({ ...values, action_delay_days: 0 }, model),
    [values, model],
  );
  const actDelayed = useMemo(() => predict(values, model), [values, model]);

  const delay = values["action_delay_days"] ?? 0;
  const costOfWaiting = actDelayed - actNow;

  // Build the delay-sensitivity curve (0 → 5 days, 21 points)
  const chartData = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const d = parseFloat(((i / 20) * 5).toFixed(2));
      return {
        delay: d,
        delta: parseFloat(predict({ ...values, action_delay_days: d }, model).toFixed(4)),
      };
    });
  }, [values, model]);

  const yValues = chartData.map((d) => d.delta);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yPad = Math.max((yMax - yMin) * 0.15, 0.01);
  const yDomainMin = yMin - yPad;
  const yDomainMax = yMax + yPad;

  // Current position on the curve
  const curDot = chartData.find((d) => d.delay === parseFloat(delay.toFixed(2)));
  const curDelta = curDot?.delta ?? actDelayed;

  return (
    <div className="rounded-lg border border-sage-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-sage-900">Stress outcome simulator</h3>
      <p className="mt-1 text-sm text-sage-700">
        Adjust the sliders to project the 3-day stress change after an intervention.
        Negative values mean stress improves. Trained on GreenLeaf&apos;s experimental data.
      </p>

      {/* ── Delay sensitivity chart ── */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-500">
          Cost of waiting — projected Δ stress vs response delay
        </p>
        <div className="text-xs text-sage-400 mb-3 flex gap-4">
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ backgroundColor: "#dcfce7" }} />
            stress improves
          </span>
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ backgroundColor: "#fee2e2" }} />
            stress worsens
          </span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={chartData}
            margin={{ top: 6, right: 12, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e8ede9" vertical={false} />

            {/* Good zone (below zero) */}
            {yDomainMin < 0 && (
              <ReferenceArea
                y1={yDomainMin}
                y2={Math.min(0, yDomainMax)}
                fill="#dcfce7"
                fillOpacity={0.5}
              />
            )}
            {/* Bad zone (above zero) */}
            {yDomainMax > 0 && (
              <ReferenceArea
                y1={Math.max(0, yDomainMin)}
                y2={yDomainMax}
                fill="#fee2e2"
                fillOpacity={0.4}
              />
            )}

            <XAxis
              dataKey="delay"
              type="number"
              domain={[0, 5]}
              tickCount={6}
              tickFormatter={(v: number) => `${v}d`}
              tick={{ fontSize: 11, fill: "#8fa892" }}
              axisLine={{ stroke: "#d1d9d2" }}
              tickLine={false}
            />
            <YAxis
              domain={[yDomainMin, yDomainMax]}
              tickFormatter={(v: number) => v.toFixed(2)}
              tick={{ fontSize: 11, fill: "#8fa892" }}
              axisLine={false}
              tickLine={false}
              width={42}
            />

            {/* Zero line */}
            <ReferenceLine y={0} stroke="#6B8F71" strokeWidth={1} strokeDasharray="5 3" />

            {/* Current delay marker */}
            <ReferenceLine
              x={delay}
              stroke="#B8953A"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{ value: `${delay.toFixed(0)}d`, position: "top", fontSize: 10, fill: "#B8953A" }}
            />

            <Line
              dataKey="delta"
              stroke={COLORS.precision}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, stroke: "white", strokeWidth: 2 }}
            />

            {/* Dot at current delay position */}
            {curDot && (
              <ReferenceDot
                x={curDot.delay}
                y={curDot.delta}
                r={6}
                fill={curDelta < 0 ? COLORS.healthy : COLORS.critical}
                stroke="white"
                strokeWidth={2}
              />
            )}

            <Tooltip content={<DelayTooltip />} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Sliders ── */}
      <div className="mt-6 space-y-5">
        {model.featureNames.map((key) => {
          const [min, max] = model.bounds[key] as [number, number];
          const step = key === "action_delay_days" ? 1 : 0.01;
          const val = values[key] ?? model.defaults[key] ?? 0;
          return (
            <div key={key}>
              <label className="flex justify-between text-sm text-sage-800">
                <span>{LABELS[key] ?? key}</span>
                <span className="font-mono font-medium">
                  {key === "action_delay_days" ? `${val.toFixed(0)} day${val !== 1 ? "s" : ""}` : val.toFixed(2)}
                </span>
              </label>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={val}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                }
                className="mt-1 w-full accent-sage-600"
              />
            </div>
          );
        })}
      </div>

      {/* ── Side-by-side outcome panels ── */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <OutcomePanel delta={actNow} label="Act today (delay = 0 days)" />
        <OutcomePanel
          delta={actDelayed}
          label={`Wait ${delay.toFixed(0)} day${delay !== 1 ? "s" : ""} to respond`}
        />
      </div>

      {delay > 0 && costOfWaiting > 0.005 && (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Acting today instead of waiting{" "}
          <strong>{delay.toFixed(0)} day{delay !== 1 ? "s" : ""}</strong> is projected to
          reduce stress by an additional{" "}
          <strong>{costOfWaiting.toFixed(3)}</strong> units over 3 days.
        </div>
      )}

      <button
        type="button"
        className="mt-4 text-sm font-medium text-sage-700 underline decoration-sage-400 hover:text-sage-900"
        onClick={() => setValues(initialValues ? { ...model.defaults, ...initialValues } : { ...model.defaults })}
      >
        Reset to current plot values
      </button>
    </div>
  );
}
