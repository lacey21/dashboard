"use client";

import { useMemo, useState } from "react";
import { COLORS } from "@/constants/colors";

type ModelTerm =
  | { type: "linear"; feature: string }
  | { type: "poly"; feature: string; power: number }
  | { type: "interact"; features: [string, string] };

type YieldModel = {
  featureNames: string[];
  terms?: ModelTerm[];
  coefficients: number[];
  intercept: number;
  defaults: Record<string, number>;
  bounds: Record<string, [number, number]>;
  currentSeasonAvgYield: number;
  avgMarketPricePerKg: number;
};

const LABELS: Record<string, string> = {
  daily_fertilizer_cost: "Fertilizer spend per day ($)",
  daily_energy_cost: "Energy spend per day ($)",
  daily_water_cost: "Water spend per day ($)",
  daily_pesticide_cost: "Pesticide spend per day ($)",
  plant_density_plants_m2: "Plant density (plants/m²)",
  precision_action_rate: "Precision action rate (%)",
  avg_action_delay_days: "Avg response time to alerts (days)",
};

function predict(
  features: Record<string, number>,
  model: YieldModel,
): number {
  let y = model.intercept;
  const terms: ModelTerm[] =
    model.terms ?? model.featureNames.map((feature) => ({ type: "linear", feature }));
  terms.forEach((term, i) => {
    const c = model.coefficients[i];
    if (term.type === "linear") {
      y += c * features[term.feature];
    } else if (term.type === "poly") {
      y += c * Math.pow(features[term.feature], term.power);
    } else {
      y += c * features[term.features[0]] * features[term.features[1]];
    }
  });
  return Math.max(0, y);
}

export function YieldSimulator({ model }: { model: YieldModel }) {
  const [values, setValues] = useState({ ...model.defaults });

  const projected = useMemo(() => predict(values, model), [values, model]);
  const pctChange =
    ((projected - model.currentSeasonAvgYield) / model.currentSeasonAvgYield) * 100;
  const projectedRevenue = projected * model.avgMarketPricePerKg * 100; // scaled display

  return (
    <div>
      <p className="text-sm text-sage-700">
        Move the sliders to see how different spending and management decisions would have
        changed your yield. Trained on GreenLeaf&apos;s experimental data.
      </p>

      <div className="mt-6 space-y-4">
        {model.featureNames.map((key) => {
          const [min, max] = model.bounds[key];
          const displayVal =
            key === "precision_action_rate" ? values[key] * 100 : values[key];
          const setVal = (v: number) =>
            setValues((prev) => ({
              ...prev,
              [key]: key === "precision_action_rate" ? v / 100 : v,
            }));
          return (
            <div key={key}>
              <label className="flex justify-between text-sm text-sage-800">
                <span>{LABELS[key] ?? key}</span>
                <span className="font-medium">
                  {key === "precision_action_rate"
                    ? `${displayVal.toFixed(0)}%`
                    : key.includes("cost")
                      ? `$${displayVal.toFixed(1)}`
                      : displayVal.toFixed(1)}
                </span>
              </label>
              <input
                type="range"
                min={key === "precision_action_rate" ? 0 : min}
                max={key === "precision_action_rate" ? 100 : max}
                step={key === "precision_action_rate" ? 1 : 0.5}
                value={displayVal}
                onChange={(e) => setVal(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-sage-100 bg-sage-50 p-4 text-center">
        <p className="text-4xl font-bold" style={{ color: COLORS.healthy }}>
          {projected.toFixed(1)} kg/m²
        </p>
        <p className="mt-1 text-sm text-sage-700">
          {pctChange >= 0 ? "+" : ""}
          {pctChange.toFixed(1)}% vs your current season average (
          {model.currentSeasonAvgYield.toFixed(1)} kg/m²)
        </p>
        <p className="mt-1 text-sm text-sage-600">
          Estimated revenue at this yield: ~${projectedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      </div>

      <button
        type="button"
        className="mt-4 text-sm font-medium text-sage-700 underline decoration-sage-400 hover:text-sage-900"
        onClick={() => setValues({ ...model.defaults })}
      >
        Reset to my actual values
      </button>
    </div>
  );
}
