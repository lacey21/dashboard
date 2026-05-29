"use client";

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

const CAT_COLORS: Record<string, string> = {
  Labor:      "#6B8F71",
  Fertilizer: "#87A878",
  Pesticide:  "#C46B5A",
  Energy:     "#B8953A",
  Water:      "#6B90A8",
};

export function CostBreakdown({ costs }: { costs: Costs }) {
  const total = costs.total;

  const categories = [
    { name: "Labor",      value: costs.labor },
    { name: "Fertilizer", value: costs.fertilizer },
    { name: "Pesticide",  value: costs.pesticide },
    { name: "Energy",     value: costs.energy },
    { name: "Water",      value: costs.water },
  ]
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const precisionPct = total > 0 ? Math.round((costs.precision / total) * 100) : 0;
  const routinePct   = 100 - precisionPct;
  const highPrecision = precisionPct >= 25;

  const topCat    = categories[0];
  const topPct    = topCat && total > 0 ? Math.round((topCat.value / total) * 100) : 0;
  const highPest  = total > 0 && costs.pesticide / total > 0.25;

  if (total === 0) {
    return <p className="text-sm text-sage-500 py-6 text-center">No cost data for this plot-week.</p>;
  }

  return (
    <div className="space-y-5">

      {/* ── Total ── */}
      <div>
        <p className="text-4xl font-bold text-sage-900">${total.toFixed(0)}</p>
        <p className="mt-0.5 text-sm text-sage-500">total spend this week</p>
      </div>

      {/* ── Precision vs Routine split ── */}
      <div>
        <div className="flex justify-between text-xs font-medium text-sage-600 mb-1.5">
          <span>Routine baseline</span>
          <span>Precision (alert-driven)</span>
        </div>

        {/* Stacked bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-sage-100">
          <div
            className="h-full rounded-l-full"
            style={{ width: `${routinePct}%`, backgroundColor: COLORS.routine }}
          />
          {precisionPct > 0 && (
            <div
              className="h-full rounded-r-full"
              style={{ width: `${precisionPct}%`, backgroundColor: COLORS.precision }}
            />
          )}
        </div>

        {/* Labels */}
        <div className="mt-1.5 flex justify-between text-xs text-sage-600">
          <span>
            <span className="font-semibold text-sage-800">${costs.routine.toFixed(0)}</span>
            {" "}({routinePct}%)
          </span>
          {precisionPct > 0 && (
            <span>
              <span className="font-semibold" style={{ color: COLORS.precision }}>
                ${costs.precision.toFixed(0)}
              </span>
              {" "}({precisionPct}%)
            </span>
          )}
        </div>
      </div>

      {/* ── Callout: high reactive spend ── */}
      {highPrecision && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
          <span className="font-semibold">{precisionPct}% of this week&apos;s spend was reactive.</span>{" "}
          Precision costs are elevated above the ~15% baseline — this plot needed more alert-driven
          interventions. Faster crew response typically brings this below 20%.
        </div>
      )}

      {/* ── Category breakdown ── */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sage-500">
          By category
        </p>
        <div className="space-y-2.5">
          {categories.map((cat) => {
            const pct = total > 0 ? (cat.value / total) * 100 : 0;
            const color = CAT_COLORS[cat.name] ?? COLORS.sage;
            return (
              <div key={cat.name} className="flex items-center gap-3">
                {/* Label */}
                <span className="w-20 flex-shrink-0 text-right text-xs text-sage-700">
                  {cat.name}
                </span>

                {/* Bar */}
                <div className="relative flex-1 h-2.5 rounded-full bg-sage-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>

                {/* Dollar + pct */}
                <div className="w-20 flex-shrink-0 text-right text-xs text-sage-700">
                  <span className="font-medium">${cat.value.toFixed(0)}</span>
                  <span className="text-sage-400 ml-1">({Math.round(pct)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom insight ── */}
      {topCat && (
        <div className="border-t border-sage-100 pt-3 text-xs text-sage-600 leading-relaxed space-y-1">
          <p>
            <span className="font-semibold text-sage-800">{topCat.name}</span> is the largest
            cost category at {topPct}% of weekly spend.
          </p>
          {highPest && (
            <p style={{ color: COLORS.warning }}>
              ⚠ Pesticide is above 25% of total — likely tied to an active pest pressure alert.
              Check the timeline for unresolved alerts.
            </p>
          )}
          {!highPrecision && precisionPct > 0 && (
            <p className="text-sage-400">
              Precision spend is within normal range ({precisionPct}% of total).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
