"use client";

import { useEffect, useRef, useState } from "react";
import { useFarm } from "@/contexts/FarmContext";

function farmLabel(id: string, name: string) {
  return id === "all" ? "🌐 All Farms" : name;
}

/**
 * Global, dashboard-wide scope selector. Switching it re-fetches every page's
 * data for the chosen farm (or the aggregate "All Farms" view the dashboard
 * starts on).
 */
export function FarmSelector() {
  const { farm, setFarm, farms, selected } = useFarm();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative z-10 w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select farm to view"
        className="relative z-0 flex w-full items-center justify-between gap-2 rounded-md border border-sage-500 bg-sage-600 py-1.5 pl-2 pr-2.5 text-sm font-semibold text-white shadow-sm outline-none focus:ring-2 focus:ring-sage-300"
      >
        <span className="min-w-0 truncate">{farmLabel(selected.id, selected.name)}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 shrink-0 text-sage-100 transition-transform ${open ? "rotate-180" : ""}`}
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-20 w-full pb-1">
          <ul
            role="listbox"
            aria-label="Farm options"
            className="rounded-sm border border-sage-500 bg-sage-700 py-1 shadow-xl"
          >
            {farms.map((f) => (
              <li key={f.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={farm === f.id}
                  onClick={() => setFarm(f.id)}
                  className={`block w-full truncate px-2.5 py-1.5 text-left text-sm transition ${
                    farm === f.id
                      ? "bg-sage-600 font-semibold text-white"
                      : "text-sage-100 hover:bg-sage-600/60 hover:text-white"
                  }`}
                >
                  {farmLabel(f.id, f.name)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
