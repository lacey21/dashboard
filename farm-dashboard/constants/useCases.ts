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

export type UseCase = {
  id: string;
  href: string;
  title: string;
  /** The storytelling question this use case answers, framed for its audience. */
  question: string;
  audience: string;
  /** Icon image under public/images (e.g. /images/alert.png). */
  icon: string;
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
    icon: "/images/alert.png",
    figures: [
      { label: "Plots critical", hash: "critical" },
      { label: "High-stress plots", hash: "high-stress" },
      { label: "Alerts responded", hash: "response-rate" },
      { label: "Avg response delay", hash: "response-delay" },
    ],
  },
  {
    id: "seasonal",
    href: "/seasonal-evaluation",
    title: "Seasonal Evaluation",
    question: "Is this system worth financing?",
    audience: "Farm owner + lender",
    icon: "/images/finance.png",
    figures: [
      { label: "Total revenue", hash: "total-revenue" },
      { label: "Precision benefit", hash: "precision-benefit" },
      { label: "Spend vs return", hash: "spend-return" },
      { label: "Yield benchmark", hash: "yield-benchmark" },
    ],
  },
  {
    id: "sustainability",
    href: "/sustainability",
    title: "Sustainability",
    question: "How resilient is this operation?",
    audience: "Long-term planning",
    icon: "/images/sustainability.png",
    figures: [
      { label: "Overall score", hash: "overall-score" },
      { label: "Water efficiency", hash: "water-efficiency" },
      { label: "Energy intensity", hash: "energy-intensity" },
      { label: "Carbon emissions", hash: "carbon-emissions" },
    ],
  },
];
