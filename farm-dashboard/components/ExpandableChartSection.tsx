"use client";

import { useState, type ReactNode } from "react";

function PreviewStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-sage-200 bg-sage-50/80 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-sage-600">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-sage-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-sage-600">{hint}</p> : null}
    </div>
  );
}

export function ExpandableChartSection({
  title,
  description,
  preview,
  insight,
  children,
}: {
  title: string;
  description: string;
  preview: ReactNode;
  insight?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <h2 className="font-semibold text-sage-900">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-sage-700">{description}</p>

      {!open && (
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-3">{preview}</div>
          {insight ? (
            <p className="mt-3 rounded-md border-l-4 border-sage-400 bg-white px-3 py-2 text-sm text-sage-800">
              {insight}
            </p>
          ) : null}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-sage-800 underline-offset-2 hover:text-sage-900 hover:underline"
      >
        {open ? "Hide chart" : "View full chart"}
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="mt-4 rounded-lg border border-sage-200 bg-white p-4 shadow-sm">{children}</div>
      )}
    </section>
  );
}

export { PreviewStat };
