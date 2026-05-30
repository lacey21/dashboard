export const STRESS_THRESHOLD = 0.6;

/** Annual marketable fresh weight (kg) per m² of production (cropped) area. */
export type YieldBenchmarkTier = {
  typical: number;
  aspirational: number;
};

export const YIELD_BENCHMARK_TIERS: Record<string, YieldBenchmarkTier> = {
  Tomato: { typical: 57.5, aspirational: 67.5 },
  Cucumber: { typical: 67.5, aspirational: 97.5 },
  Pepper: { typical: 25, aspirational: 29 },
  Strawberry: { typical: 10, aspirational: 13.5 },
};

export const YIELD_BENCHMARK_DEFAULT: YieldBenchmarkTier = { typical: 50, aspirational: 65 };

/** Below this fraction of typical, surface a units mismatch warning instead of red. */
export const YIELD_UNITS_CHECK_RATIO = 0.3;

/** Within ±10% of typical counts as on-benchmark. */
export const YIELD_TYPICAL_TOLERANCE = 0.1;

export const YIELD_LEGEND_SOURCES: Record<string, string> = {
  "GreenLeaf avg":
    "Mean season_yield_kg_m2 across plots in the selected farm scope (annual marketable kg per production m²).",
  "Typical Canadian norm":
    "Alberta extension attainable targets and Canada StatCan 2024 implied yields (production ÷ harvested area). Midpoint of typical commercial range per crop.",
  "Aspirational target":
    "Strong-operator / lender stretch targets per crop (research and top commercial ranges, e.g. Alberta CDC and StatCan-implied ceilings). Values differ by crop; bars show each crop’s aspirational kg/m².",
};

export type YieldBenchmarkStatus = "check_units" | "on_or_above" | "below_typical" | "well_below";

export function getYieldBenchmarkTier(crop: string): YieldBenchmarkTier {
  return YIELD_BENCHMARK_TIERS[crop] ?? YIELD_BENCHMARK_DEFAULT;
}

/** Any reported annual greenhouse yield below this is treated as a units mismatch. */
export const YIELD_IMPLAUSIBLE_FLOOR = 12;

export function getYieldBenchmarkStatus(avgYield: number, typical: number): YieldBenchmarkStatus {
  if (avgYield < typical * YIELD_UNITS_CHECK_RATIO || avgYield < YIELD_IMPLAUSIBLE_FLOOR) {
    return "check_units";
  }
  if (avgYield >= typical * (1 - YIELD_TYPICAL_TOLERANCE)) return "on_or_above";
  if (avgYield >= typical * 0.7) return "below_typical";
  return "well_below";
}
