"use client";

import { useEffect, useMemo, useState } from "react";
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

  return (
    <div className="rounded-lg border border-sage-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-sage-900">Stress outcome simulator</h3>
      <p className="mt-1 text-sm text-sage-700">
        Adjust the sliders to project the 3-day stress change after an intervention.
        Negative values mean stress improves. Trained on GreenLeaf&apos;s experimental data.
      </p>

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
