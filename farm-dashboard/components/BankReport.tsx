"use client";

import { useState } from "react";
import { CtaCard, CtaModal } from "@/components/CtaModal";
import { useFarm } from "@/contexts/FarmContext";

/**
 * Seasonal-evaluation call-to-action: packages the season's financials into a
 * one-page report a farm owner can hand to a lender, downloadable as a
 * standalone HTML file or printed straight to PDF from the browser.
 */

export type ReportFinancials = {
  totalRevenue: number;
  totalCost: number;
  precisionSpend: number;
  precisionBenefit: number;
  avgYield: number;
  controlYield: number;
  meanRoiPct: number;
  benefitPerDollar: number;
};

export type ReportTreatment = { treatment: string; avg_cost: number; avg_revenue: number };

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function buildReportHtml(
  f: ReportFinancials,
  treatments: ReportTreatment[],
  farm: { name: string; region: string; primaryCrop: string },
): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const net = f.totalRevenue - f.totalCost;
  const margin = f.totalRevenue > 0 ? (net / f.totalRevenue) * 100 : 0;
  const yieldLift = f.controlYield > 0 ? ((f.avgYield - f.controlYield) / f.controlYield) * 100 : 0;

  const kpi = (label: string, value: string, sub: string) => `
    <div class="kpi">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-sub">${sub}</div>
    </div>`;

  const treatmentRows = treatments
    .map((t) => {
      const m = t.avg_revenue - t.avg_cost;
      return `<tr>
        <td>${t.treatment}</td>
        <td class="num">${usd(t.avg_cost)}</td>
        <td class="num">${usd(t.avg_revenue)}</td>
        <td class="num ${m >= 0 ? "pos" : "neg"}">${m >= 0 ? "+" : ""}${usd(m)}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>GreenLeaf: Seasonal Financial Summary (${farm.name})</title>
<style>
  :root { --ink:#2D3B2E; --muted:#5C6B5E; --sage:#5A7354; --line:#D8E0D4; --wash:#F4F7F2; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: var(--ink); margin: 0; background: #fff; }
  .page { max-width: 760px; margin: 0 auto; padding: 48px 56px; }
  header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid var(--sage); padding-bottom: 18px; }
  .brand { font-size: 20px; font-weight: 800; color: var(--sage); letter-spacing: -0.01em; }
  .brand small { display:block; font-size: 11px; font-weight:600; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2px; }
  .meta { text-align:right; font-size: 12px; color: var(--muted); line-height: 1.6; }
  h1 { font-size: 22px; margin: 26px 0 2px; }
  .subhead { color: var(--muted); font-size: 13px; margin: 0 0 24px; }
  .kpis { display:grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0 26px; }
  .kpi { border:1px solid var(--line); border-radius: 10px; padding: 12px 14px; background: var(--wash); }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight:700; }
  .kpi-value { font-size: 20px; font-weight: 800; margin-top: 4px; }
  .kpi-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sage); margin: 28px 0 10px; }
  table { width:100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align:left; padding: 9px 10px; border-bottom: 1px solid var(--line); }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { font-weight: 800; border-top: 2px solid var(--ink); border-bottom: none; }
  .pos { color: #2f7d4f; } .neg { color: #b04a3a; }
  .callout { border-left: 4px solid var(--sage); background: var(--wash); padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 13px; }
  .callout strong { color: var(--sage); }
  footer { margin-top: 34px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 10px; color: var(--muted); line-height: 1.6; }
  @media print { .page { padding: 24px 28px; } @page { margin: 14mm; } }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="brand">GreenLeaf CEA<small>Seasonal Financial Summary</small></div>
    <div class="meta">
      <div><strong>${farm.name}</strong></div>
      <div>${farm.region} · ${farm.primaryCrop}</div>
      <div>Prepared ${today}</div>
    </div>
  </header>

  <h1>Does the precision system pay for itself?</h1>
  <p class="subhead">Prepared for lender review. Season-to-date operating results.</p>

  <div class="kpis">
    ${kpi("Total revenue", usd(f.totalRevenue), "season to date")}
    ${kpi("Net operating result", `${net >= 0 ? "+" : ""}${usd(net)}`, `${margin.toFixed(0)}% margin`)}
    ${kpi("Season ROI", `${f.meanRoiPct.toFixed(1)}%`, "avg across plots")}
    ${kpi("Return on precision", `$${f.benefitPerDollar.toFixed(2)}`, "per $1 spent")}
  </div>

  <h2>Operating summary</h2>
  <table>
    <tbody>
      <tr><td>Total revenue</td><td class="num">${usd(f.totalRevenue)}</td></tr>
      <tr><td>Total operating cost</td><td class="num">(${usd(f.totalCost)})</td></tr>
      <tr class="total"><td>Net operating result</td><td class="num">${net >= 0 ? "+" : ""}${usd(net)}</td></tr>
      <tr><td>&nbsp;</td><td></td></tr>
      <tr><td>Precision program spend</td><td class="num">${usd(f.precisionSpend)}</td></tr>
      <tr><td>Measured precision benefit</td><td class="num pos">+${usd(f.precisionBenefit)}</td></tr>
      <tr class="total"><td>Return per $1 of precision spend</td><td class="num">$${f.benefitPerDollar.toFixed(2)}</td></tr>
    </tbody>
  </table>

  <div class="callout">
    <strong>Bottom line.</strong> For every $1 invested in precision actions this season, the operation
    returned <strong>$${f.benefitPerDollar.toFixed(2)}</strong> in measurable benefit, and yield ran
    ${yieldLift >= 0 ? "+" : ""}${yieldLift.toFixed(0)}% above the untreated control
    (${f.avgYield.toFixed(1)} vs ${f.controlYield.toFixed(1)} kg/m²).
  </div>

  <h2>Spend vs return by treatment</h2>
  <table>
    <thead>
      <tr><th>Treatment</th><th class="num">Avg cost / plot</th><th class="num">Avg revenue / plot</th><th class="num">Margin</th></tr>
    </thead>
    <tbody>${treatmentRows}</tbody>
  </table>

  <footer>
    Generated by GreenLeaf CEA analytics for ${farm.name}. Figures are season-to-date and derived from
    operational sensor and cost data; they are unaudited and provided for discussion purposes. Yield comparison
    is against matched control plots.
  </footer>
</div>
</body>
</html>`;
}

export function BankReport({
  financials,
  treatments,
}: {
  financials: ReportFinancials;
  treatments: ReportTreatment[];
}) {
  const { selected } = useFarm();
  const [open, setOpen] = useState(false);

  const farm = { name: selected.name, region: selected.region, primaryCrop: selected.primaryCrop };
  const html = () => buildReportHtml(financials, treatments, farm);

  const slug = selected.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const stamp = new Date().toISOString().slice(0, 10);

  const download = () => {
    const blob = new Blob([html()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GreenLeaf-Financial-Report-${slug}-${stamp}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    w.document.write(html());
    w.document.close();
    w.focus();
    // Give the new document a tick to lay out before printing.
    setTimeout(() => w.print(), 350);
  };

  const f = financials;
  const net = f.totalRevenue - f.totalCost;

  return (
    <>
      <CtaCard
        eyebrow="Take action"
        title="Generate your bank-meeting report"
        description="A clean one-page financial summary for your lender. Download or save as PDF."
        buttonLabel="Create financial report →"
        onClick={() => setOpen(true)}
        icon={<IconDoc />}
      />

      <CtaModal
        open={open}
        onClose={() => setOpen(false)}
        title="Seasonal financial summary"
        subtitle={`${farm.name} · ${farm.region} · prepared for lender review`}
        icon={<IconDoc />}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-sage-500">Standalone file. Opens in any browser, prints to PDF.</span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={print}
                className="rounded-lg border border-sage-300 bg-white px-4 py-2 text-sm font-semibold text-sage-800 transition hover:bg-sage-50"
              >
                Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={download}
                className="rounded-lg bg-sage-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-800"
              >
                Download report
              </button>
            </span>
          </div>
        }
      >
        {/* Lightweight preview of what the report contains */}
        <p className="text-sm text-sage-600">Your report will include:</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PreviewStat label="Total revenue" value={usd(f.totalRevenue)} />
          <PreviewStat label="Net result" value={`${net >= 0 ? "+" : ""}${usd(net)}`} accent />
          <PreviewStat label="Season ROI" value={`${f.meanRoiPct.toFixed(1)}%`} />
          <PreviewStat label="Per $1 precision" value={`$${f.benefitPerDollar.toFixed(2)}`} accent />
        </div>

        <ul className="mt-5 space-y-2 text-sm text-sage-700">
          <ReportLine>Operating summary (revenue, cost, net result, margin)</ReportLine>
          <ReportLine>Precision program spend and measured return per dollar</ReportLine>
          <ReportLine>Spend vs return broken out across all {treatments.length} treatments</ReportLine>
          <ReportLine>Yield vs untreated control, with a plain-English bottom line</ReportLine>
        </ul>
      </CtaModal>
    </>
  );
}

function PreviewStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-sage-300 bg-sage-50" : "border-sage-200 bg-white"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-sage-900">{value}</p>
    </div>
  );
}

function ReportLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 shrink-0 text-sage-600" aria-hidden="true">
        <path d="M3 8.5l3 3 7-7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function IconDoc() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 2.5h6l4 4V17a1 1 0 01-1 1H5a1 1 0 01-1-1V3.5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M11 2.5V6.5h4M7 11h6M7 13.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
