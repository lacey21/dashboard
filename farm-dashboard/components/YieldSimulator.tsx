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

function formatSliderValue(key: string, displayVal: number): string {
  if (key === "precision_action_rate") return `${displayVal.toFixed(0)}%`;
  if (key.includes("cost")) return `$${displayVal.toFixed(1)}`;
  return displayVal.toFixed(1);
}

function formatBound(key: string, val: number): string {
  if (key === "precision_action_rate") return `${val.toFixed(0)}%`;
  if (key.includes("cost")) return `$${val.toFixed(0)}`;
  return val.toFixed(0);
}

function SliderField({
  featureKey,
  values,
  bounds,
  onChange,
}: {
  featureKey: string;
  values: Record<string, number>;
  bounds: Record<string, [number, number]>;
  onChange: (key: string, v: number) => void;
}) {
  const [min, max] = bounds[featureKey];
  const displayMin = featureKey === "precision_action_rate" ? 0 : min;
  const displayMax = featureKey === "precision_action_rate" ? 100 : max;
  const displayVal =
    featureKey === "precision_action_rate" ? values[featureKey] * 100 : values[featureKey];

  return (
    <div className="rounded-lg border border-sage-100 bg-sage-50/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium leading-snug text-sage-700">
          {LABELS[featureKey] ?? featureKey}
        </span>
        <span className="shrink-0 rounded-md border border-sage-200 bg-white px-1.5 py-0.5 text-xs font-semibold tabular-nums text-sage-800">
          {formatSliderValue(featureKey, displayVal)}
        </span>
      </div>
      <input
        type="range"
        min={displayMin}
        max={displayMax}
        step={featureKey === "precision_action_rate" ? 1 : 0.5}
        value={displayVal}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(featureKey, featureKey === "precision_action_rate" ? v / 100 : v);
        }}
        aria-label={LABELS[featureKey] ?? featureKey}
        className="range-input mt-2 w-full"
      />
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-sage-400">
        <span>{formatBound(featureKey, displayMin)}</span>
        <span>{formatBound(featureKey, displayMax)}</span>
      </div>
    </div>
  );
}

export function YieldSimulator({ model }: { model: YieldModel }) {
  const [values, setValues] = useState({ ...model.defaults });

  const projected = useMemo(() => predict(values, model), [values, model]);
  const pctChange =
    ((projected - model.currentSeasonAvgYield) / model.currentSeasonAvgYield) * 100;
  const projectedRevenue = projected * model.avgMarketPricePerKg * 100; // scaled display

  const topKeys = model.featureNames.filter((k) => k.includes("cost"));
  const sideKeys = model.featureNames.filter((k) => !k.includes("cost"));

  const setFeature = (key: string, v: number) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  return (
    <div>
      <p className="text-sm text-sage-700">
        Move the sliders to see how different spending and management decisions would have
        changed your yield. Trained on GreenLeaf&apos;s experimental data.
      </p>

      {topKeys.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topKeys.map((key) => (
            <SliderField
              key={key}
              featureKey={key}
              values={values}
              bounds={model.bounds}
              onChange={setFeature}
            />
          ))}
        </div>
      )}

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_min(400px,42%)] lg:items-stretch lg:gap-6">
        <div className="grid gap-3">
          {sideKeys.map((key) => (
            <SliderField
              key={key}
              featureKey={key}
              values={values}
              bounds={model.bounds}
              onChange={setFeature}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-col lg:mt-0">
          <div className="flex flex-1 flex-col justify-center rounded-lg border border-sage-200 bg-white px-6 py-8 text-center shadow-sm lg:py-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">
              Projected yield
            </p>
            <p className="mt-4 text-4xl font-bold tabular-nums lg:text-5xl" style={{ color: COLORS.healthy }}>
              {projected.toFixed(1)} kg/m²
            </p>
            <p className="mt-3 text-sm text-sage-700">
              <span className={pctChange >= 0 ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>
                {pctChange >= 0 ? "+" : ""}
                {pctChange.toFixed(1)}%
              </span>{" "}
              vs season avg ({model.currentSeasonAvgYield.toFixed(1)} kg/m²)
            </p>
            <p className="mt-4 border-t border-sage-100 pt-4 text-sm text-sage-600">
              Est. revenue ~$
              {projectedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>

          <button
            type="button"
            className="mt-4 shrink-0 rounded-md border border-sage-200 bg-white px-3 py-2 text-sm font-medium text-sage-700 transition hover:border-sage-300 hover:bg-sage-50"
            onClick={() => setValues({ ...model.defaults })}
          >
            Reset to my actual values
          </button>
        </div>
      </div>
    </div>
  );
}
