"use client";

import { useFarm } from "@/contexts/FarmContext";

/**
 * Renders a sage-tinted info bar when a crop filter is active in the sidebar.
 * Returns null when no crop is selected, so callers can place it unconditionally.
 *
 * Props:
 *   filteredCount / totalCount — shown as "(69 of 120)" when provided
 *   aggregateNote             — extra sentence explaining what can't be filtered
 */
export function CropFilterBanner({
  filteredCount,
  totalCount,
  aggregateNote,
}: {
  filteredCount?: number;
  totalCount?: number;
  aggregateNote?: string;
}) {
  const { cropFilter, setCropFilter } = useFarm();
  if (!cropFilter) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-sage-200 bg-sage-50 px-3 py-2">
      {/* Funnel icon */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="shrink-0 text-sage-500"
      >
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>

      <span className="text-xs font-medium text-sage-700">
        Crop filter active — showing{" "}
        <span className="font-semibold text-sage-900">{cropFilter}</span> plots only
        {filteredCount !== undefined && totalCount !== undefined && (
          <> ({filteredCount} of {totalCount})</>
        )}
        {aggregateNote && (
          <span className="text-sage-500"> · {aggregateNote}</span>
        )}
      </span>

      <button
        type="button"
        className="ml-auto shrink-0 text-xs text-sage-400 underline hover:text-sage-700"
        onClick={() => setCropFilter(null)}
      >
        clear
      </button>
    </div>
  );
}
