"use client";

import { useFarm } from "@/contexts/FarmContext";

const SELECT_CHEVRON = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#e8efe5"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"/></svg>',
)}")`;

/**
 * Global, dashboard-wide scope selector. Switching it re-fetches every page's
 * data for the chosen farm (or the aggregate "All Farms" view the dashboard
 * starts on).
 */
export function FarmSelector() {
  const { farm, setFarm, farms } = useFarm();

  return (
    <label className="block w-full">
      <span className="sr-only">Select farm</span>
      <select
        value={farm}
        onChange={(e) => setFarm(e.target.value)}
        style={{ backgroundImage: SELECT_CHEVRON }}
        className="w-full appearance-none rounded-md border border-sage-500 bg-sage-600 bg-[length:0.875rem] bg-[position:right_0.625rem_center] bg-no-repeat py-1.5 pl-2 pr-8 text-sm font-semibold text-white shadow-sm outline-none focus:ring-2 focus:ring-sage-300"
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
