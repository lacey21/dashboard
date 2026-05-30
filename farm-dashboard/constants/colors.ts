/** Sage-green palette — semantic + brand tokens */
export const COLORS = {
  // Brand
  sage: "#87A878",
  sageDark: "#5A7354",
  sageDeeper: "#3D5240",
  sageLight: "#E8EFE5",
  sageMuted: "#C5D4C0",
  sageWash: "#F4F7F2",

  // Surfaces & text (always pair dark text on white/light sage)
  white: "#FFFFFF",
  canvas: "#F4F7F2",
  text: "#2D3B2E",
  textMuted: "#5C6B5E",

  // Semantic (harmonized with sage, still distinguishable)
  critical: "#C46B5A",
  warning: "#B8953A",
  healthy: "#5A8F65",
  precision: "#6B8F71",
  routine: "#8B9A88",

  /** Muted chart series (sage-adjacent green / slate blue / terracotta red) */
  chartGreen: "#5A8F65",
  chartBlue: "#6E8A9A",
  chartRed: "#C46B5A",
} as const;

export function urgencyColor(score: number): string {
  if (score > 0.7) return COLORS.critical;
  if (score >= 0.4) return COLORS.warning;
  return COLORS.healthy;
}

export function scoreColor(score: number): string {
  if (score >= 75) return COLORS.healthy;
  if (score >= 50) return COLORS.warning;
  return COLORS.critical;
}
