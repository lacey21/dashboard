/**
 * The three use cases that branch off the operation Overview. This is the single
 * source of truth for their order, labels, and storytelling framing — shared by the
 * sidebar, the overview page, and the per-page "use case N of 3" story navigation.
 */
/** A headline KPI or figure on a use-case page, used to build deep links. */
export type UseCaseFigure = {
  /** Short label shown in the sidebar index. */
  label: string;
  /** Anchor id on the target page — combined with href as `${href}#${hash}`. */
  hash: string;
};

/** Bump when replacing files under public/images to bust browser cache. */
export const USE_CASE_ICON_VERSION = "2";

export function useCaseIconSize(base: number, iconScale = 1): number {
  return Math.round(base * iconScale);
}

export type UseCase = {
  id: string;
  href: string;
  title: string;
  /** The storytelling question this use case answers, framed for its audience. */
  question: string;
  audience: string;
  /** Icon image under public/images (e.g. /images/alert.png). */
  icon: string;
  /** Multiplier on rendered icon size (default 1). */
  iconScale?: number;
  /** The main KPIs/figures this section covers, each deep-linkable from the sidebar. */
  figures: UseCaseFigure[];
};

export const USE_CASES: UseCase[] = [
  {
    id: "alert-triage",
    href: "/alert-triage",
    title: "Alert Triage",
    question: "Where do I send my crew this morning?",
    audience: "Operations manager",
    icon: `/images/alert.png?v=${USE_CASE_ICON_VERSION}`,
    iconScale: 0.9,
    figures: [
      { label: "Plots critical", hash: "critical" },
      { label: "High-stress plots", hash: "high-stress" },
    ],
  },
  {
    id: "seasonal",
    href: "/seasonal-evaluation",
    title: "Seasonal Evaluation",
    question: "Is this system worth financing?",
    audience: "Farm owner + lender",
    icon: `/images/finance.png?v=${USE_CASE_ICON_VERSION}`,
    iconScale: 0.9,
    figures: [
      { label: "Total revenue", hash: "total-revenue" },
      { label: "Precision benefit", hash: "precision-benefit" },
      { label: "Spend vs return", hash: "spend-return" },
      { label: "Yield vs Canadian norm", hash: "yield-benchmark" },
    ],
  },
  {
    id: "sustainability",
    href: "/sustainability",
    title: "Sustainability",
    question: "How resilient is this operation?",
    audience: "Long-term planning",
    icon: `/images/sustainability.png?v=${USE_CASE_ICON_VERSION}`,
    figures: [
      { label: "Overall score", hash: "overall-score" },
      { label: "Score breakdown", hash: "score-breakdown" },
      { label: "All dimensions vs control", hash: "all-dimensions-vs-control" },
      { label: "Risk watchlist", hash: "risk-watchlist" },
    ],
  },
];
