"use client";

import { useFarm } from "@/contexts/FarmContext";

/**
 * Global, dashboard-wide scope selector. Switching it re-fetches every page's
 * data for the chosen farm (or the aggregate "All Farms" view the dashboard
 * starts on). Lives in the sticky header so it's available from any story.
 */
export function FarmSelector() {
  const { farm, setFarm, farms } = useFarm();

  return (
    <label className="flex shrink-0 items-center gap-1.5">
      <span className="sr-only">Select farm</span>
      <select
        value={farm}
        onChange={(e) => setFarm(e.target.value)}
        className="max-w-[10rem] rounded-md border border-sage-500 bg-sage-600 px-2 py-1 text-[11px] font-medium text-white shadow-sm outline-none focus:ring-2 focus:ring-sage-300 sm:max-w-none sm:text-xs"
        aria-label="Select farm to view"
      >
        {farms.map((f) => (
          <option key={f.id} value={f.id} className="text-sage-900">
            {f.id === "all" ? "🌐 All Farms" : f.name}
          </option>
        ))}
      </select>
    </label>
  );
}
