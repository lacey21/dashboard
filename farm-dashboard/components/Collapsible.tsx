"use client";

import { useState, type ReactNode } from "react";

export function Collapsible({
  title,
  summary,
  defaultOpen = false,
  openLabel = "Open",
  closeLabel = "Hide",
  children,
}: {
  title: string;
  summary: ReactNode;
  defaultOpen?: boolean;
  openLabel?: string;
  closeLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-sage-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-lg p-5 text-left transition hover:bg-sage-50/60"
      >
        <div>
          <h3 className="text-lg font-semibold text-sage-900">{title}</h3>
          <p className="mt-1 text-sm text-sage-700">{summary}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-sage-700">
          {open ? closeLabel : openLabel}
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
        </span>
      </button>
      {open && <div className="border-t border-sage-100 p-5 pt-4">{children}</div>}
    </div>
  );
}
