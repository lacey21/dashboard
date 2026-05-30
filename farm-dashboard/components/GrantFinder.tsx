"use client";

import { useState } from "react";
import { CtaCard, CtaModal } from "@/components/CtaModal";

/**
 * Sustainability call-to-action: matches the farm's sustainability metrics to
 * real Canadian/BC agricultural funding programs and keeps a copy-ready metrics
 * block on hand for applications. Grant links are official program landing
 * pages — starting points; eligibility still has to be verified.
 */

type CategoryKey =
  | "waterEfficiency"
  | "energyIntensity"
  | "chemicalLoad"
  | "carbonEmissions"
  | "naturalDisasterRisk";

const CATEGORY_TAG: Record<CategoryKey, string> = {
  waterEfficiency: "Water",
  energyIntensity: "Energy",
  chemicalLoad: "Chemical / IPM",
  carbonEmissions: "Carbon",
  naturalDisasterRisk: "Resilience",
};

type Grant = {
  name: string;
  funder: string;
  blurb: string;
  url: string;
  categories: CategoryKey[];
};

const GRANTS: Grant[] = [
  {
    name: "On-Farm Climate Action Fund",
    funder: "Agriculture and Agri-Food Canada",
    blurb: "Cost-share for nitrogen management, cover cropping, and rotational practices that cut emissions.",
    url: "https://agriculture.canada.ca/en/programs/agricultural-climate-solutions-on-farm-climate-action-fund",
    categories: ["carbonEmissions", "chemicalLoad", "waterEfficiency"],
  },
  {
    name: "Agricultural Clean Technology (ACT) Program",
    funder: "Agriculture and Agri-Food Canada",
    blurb: "Funding for energy-efficient and clean-tech equipment — lighting, heating, and precision systems.",
    url: "https://agriculture.canada.ca/en/programs/agricultural-clean-technology",
    categories: ["energyIntensity", "carbonEmissions"],
  },
  {
    name: "Sustainable Canadian Agricultural Partnership",
    funder: "Federal–Provincial (Sustainable CAP)",
    blurb: "Broad cost-share for environmental stewardship, resilience, and on-farm efficiency projects.",
    url: "https://agriculture.canada.ca/en/about-our-department/key-departmental-initiatives/sustainable-canadian-agricultural-partnership",
    categories: ["waterEfficiency", "energyIntensity", "chemicalLoad", "carbonEmissions", "naturalDisasterRisk"],
  },
  {
    name: "BC Environmental Farm Plan + BMP",
    funder: "ARDCorp / BC Ministry of Agriculture",
    blurb: "Free farm plan plus Beneficial Management Practices funding for water, soil, and pest stewardship.",
    url: "https://www.bcefp.ca/",
    categories: ["waterEfficiency", "chemicalLoad", "naturalDisasterRisk"],
  },
  {
    name: "FCC Sustainability Incentive Program",
    funder: "Farm Credit Canada",
    blurb: "Cash-back on lending for farms that complete an EFP or report verified sustainability metrics.",
    url: "https://www.fcc-fac.ca/en/about-fcc/sustainability.html",
    categories: ["waterEfficiency", "energyIntensity", "chemicalLoad", "carbonEmissions", "naturalDisasterRisk"],
  },
];

export type GrantMetrics = {
  farmName: string;
  overallScore: number;
  scoreLabel: string;
  subscores: Record<string, number>;
  benchmarks: { energyPerKg: number; waterPerKg: number };
  carbonEmissionsKgCO2e: number;
  carbonKgPerKgYield: number;
  weakestCategory: string;
  weakestScore: number;
  strongestCategory: string;
  strongestScore: number;
};

function metricsText(m: GrantMetrics): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const tag = (k: string) => CATEGORY_TAG[k as CategoryKey] ?? k;
  return [
    `GreenLeaf CEA — Sustainability Metrics`,
    `${m.farmName} · prepared ${today}`,
    ``,
    `Overall sustainability score: ${m.overallScore}/100 (${m.scoreLabel})`,
    `• Water efficiency: ${m.subscores.waterEfficiency ?? "—"}/100 (${m.benchmarks.waterPerKg.toFixed(1)} L/kg yield)`,
    `• Energy intensity: ${m.subscores.energyIntensity ?? "—"}/100 (${m.benchmarks.energyPerKg.toFixed(2)} kWh/kg yield)`,
    `• Chemical load: ${m.subscores.chemicalLoad ?? "—"}/100`,
    `• Carbon emissions: ${m.subscores.carbonEmissions ?? "—"}/100 (${m.carbonKgPerKgYield.toFixed(3)} kg CO2e/kg, total ${m.carbonEmissionsKgCO2e.toLocaleString()} kg CO2e)`,
    `• Natural disaster resilience: ${m.subscores.naturalDisasterRisk ?? "—"}/100`,
    ``,
    `Strongest area: ${tag(m.strongestCategory)} (${m.strongestScore}/100)`,
    `Biggest opportunity: ${tag(m.weakestCategory)} (${m.weakestScore}/100)`,
  ].join("\n");
}

export function GrantFinder({ metrics }: { metrics: GrantMetrics }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Grants that target the farm's weakest dimension float to the top.
  const ranked = [...GRANTS].sort((a, b) => {
    const aMatch = a.categories.includes(metrics.weakestCategory as CategoryKey) ? 1 : 0;
    const bMatch = b.categories.includes(metrics.weakestCategory as CategoryKey) ? 1 : 0;
    return bMatch - aMatch;
  });

  const weakestTag = CATEGORY_TAG[metrics.weakestCategory as CategoryKey] ?? metrics.weakestCategory;

  const copyMetrics = async () => {
    try {
      await navigator.clipboard.writeText(metricsText(metrics));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <>
      <CtaCard
        eyebrow="Take action"
        title="Apply for grants & funding"
        description="Turn these scores into money — matched programs plus your metrics ready to paste."
        buttonLabel="Find funding →"
        onClick={() => setOpen(true)}
        icon={<IconLeaf />}
      />

      <CtaModal
        open={open}
        onClose={() => setOpen(false)}
        title="Funding & grant finder"
        subtitle={`Programs matched to your sustainability profile · weakest area: ${weakestTag}`}
        icon={<IconLeaf />}
        maxWidth="max-w-3xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-sage-500">
              Links are official program pages — verify current eligibility and intake dates.
            </span>
            <button
              type="button"
              onClick={copyMetrics}
              className="rounded-lg bg-sage-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-800"
            >
              {copied ? "Copied ✓" : "Copy metrics for application"}
            </button>
          </div>
        }
      >
        {/* Metrics handy — what most applications ask for */}
        <div className="rounded-xl border border-sage-200 bg-sage-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">Your metrics, ready to cite</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            <Metric label="Overall" value={`${metrics.overallScore}/100`} />
            <Metric label="Water" value={`${metrics.subscores.waterEfficiency ?? "—"}/100`} />
            <Metric label="Energy" value={`${metrics.subscores.energyIntensity ?? "—"}/100`} />
            <Metric label="Chemical load" value={`${metrics.subscores.chemicalLoad ?? "—"}/100`} />
            <Metric label="Carbon" value={`${metrics.subscores.carbonEmissions ?? "—"}/100`} />
            <Metric label="Resilience" value={`${metrics.subscores.naturalDisasterRisk ?? "—"}/100`} />
          </div>
        </div>

        {/* Matched programs */}
        <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-sage-500">
          {ranked.length} matched programs
        </p>
        <div className="space-y-3">
          {ranked.map((g) => {
            const matchesWeakest = g.categories.includes(metrics.weakestCategory as CategoryKey);
            return (
              <a
                key={g.name}
                href={g.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-sage-200 bg-white p-4 transition hover:border-sage-400 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-sage-900">
                      {g.name}
                      {matchesWeakest && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          Targets {weakestTag}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-sage-500">{g.funder}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-sage-600 group-hover:text-sage-900">
                    Apply ↗
                  </span>
                </div>
                <p className="mt-2 text-sm text-sage-700">{g.blurb}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {g.categories.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-sage-100 px-2 py-0.5 text-[11px] font-medium text-sage-700"
                    >
                      {CATEGORY_TAG[c]}
                    </span>
                  ))}
                </div>
              </a>
            );
          })}
        </div>
      </CtaModal>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-sage-100 pb-1">
      <span className="text-sage-600">{label}</span>
      <span className="font-semibold text-sage-900">{value}</span>
    </div>
  );
}

function IconLeaf() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16 4c0 7-4.5 11-10 11 0-6 4-11 10-11z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6 15c1.5-3.5 4-6 7.5-7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
