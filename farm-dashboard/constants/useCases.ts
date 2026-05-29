/**
 * The three use cases that branch off the operation Overview. This is the single
 * source of truth for their order, labels, and storytelling framing — shared by the
 * sidebar, the overview page, and the per-page "use case N of 3" story navigation.
 */
export type UseCase = {
  id: string;
  href: string;
  title: string;
  /** The storytelling question this use case answers, framed for its audience. */
  question: string;
  audience: string;
  icon: string;
};

export const USE_CASES: UseCase[] = [
  {
    id: "alert-triage",
    href: "/alert-triage",
    title: "Alert Triage",
    question: "Where do I send my crew this morning?",
    audience: "Operations manager",
    icon: "🚨",
  },
  {
    id: "seasonal",
    href: "/seasonal-evaluation",
    title: "Seasonal Evaluation",
    question: "Is this system worth financing?",
    audience: "Farm owner + lender",
    icon: "💰",
  },
  {
    id: "sustainability",
    href: "/sustainability",
    title: "Sustainability",
    question: "How resilient is this operation?",
    audience: "Long-term planning",
    icon: "🌱",
  },
];
