"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { USE_CASES, useCaseIconSize } from "@/constants/useCases";
import { AiIcon } from "@/components/AiIcon";
import { FarmSelector } from "@/components/FarmSelector";
import { UseCaseIcon } from "@/components/UseCaseIcon";
import { useFarm, type FarmOption } from "@/contexts/FarmContext";
import { useChat } from "@/contexts/ChatContext";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatArea(m2: number) {
  return `${Math.round(m2).toLocaleString()} m²`;
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-xs leading-snug">
      <span className="shrink-0 text-sage-300">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-sage-100">{value}</span>
    </div>
  );
}

function SingleFarmStats({ farm }: { farm: FarmOption }) {
  return (
    <>
      <StatLine label="Area" value={farm.areaM2 != null ? formatArea(farm.areaM2) : "—"} />
      <StatLine label="Region" value={farm.region} />
      <StatLine label="Climate" value={farm.climateZone ?? "—"} />
      <StatLine label="System" value={farm.productionSystem ?? "—"} />
    </>
  );
}

function AggregateStats({ farms }: { farms: FarmOption[] }) {
  const regions = [...new Set(farms.map((f) => f.region))].sort();
  const climateZones = [
    ...new Set(farms.map((f) => f.climateZone).filter(Boolean) as string[]),
  ].sort();

  return (
    <>
      <StatLine label="Farms" value={String(farms.length)} />
      <StatLine label="Regions" value={regions.length ? regions.join(", ") : "—"} />
      <StatLine label="Climate" value={climateZones.length ? climateZones.join(", ") : "—"} />
    </>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { farm, farms, selected, cropFilter, setCropFilter } = useFarm();
  const { openChat } = useChat();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());
  const individualFarms = farms.filter((f) => f.id !== "all");
  const isAggregate = farm === "all";

  function toggleFigures(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 overflow-visible p-3">
      <Link
        href="/"
        onClick={onNavigate}
        aria-current={isActive(pathname, "/") ? "page" : undefined}
        className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
          isActive(pathname, "/")
            ? "bg-sage-600 text-white shadow-sm"
            : "text-sage-100 hover:bg-sage-600/40 hover:text-white"
        }`}
      >
        Overview
      </Link>

      <button
        type="button"
        onClick={() => {
          openChat();
          onNavigate?.();
        }}
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-sage-100 transition hover:bg-sage-600/40 hover:text-white"
      >
        <AiIcon className="h-4 w-4 text-sage-300" />
        Ask GreenLeaf AI
      </button>

      <p className="mt-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-sage-300">
        Use cases
      </p>
      <div className="ml-4 overflow-visible border-l border-sage-600 pl-2">
        {USE_CASES.map((item, i) => {
          const active = isActive(pathname, item.href);
          const figuresExpanded = expandedSections.has(item.id);
          const hasFigures = item.figures.length > 0;

          return (
            <div key={item.href} className="overflow-visible">
              <div className="group relative z-0 flex items-stretch gap-0.5 hover:z-[100]">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`min-w-0 flex-1 flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition ${
                    active
                      ? "bg-sage-600 text-white shadow-sm"
                      : "text-sage-100 hover:bg-sage-600/40 hover:text-white"
                  }`}
                >
                  <span aria-hidden className="mt-0.5 text-[10px] font-bold text-sage-300">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex items-center gap-1.5 text-sm font-semibold">
                    <UseCaseIcon src={item.icon} size={useCaseIconSize(28, item.iconScale)} />
                    {item.title}
                  </span>
                </Link>

                {hasFigures && (
                  <button
                    type="button"
                    onClick={() => toggleFigures(item.id)}
                    aria-expanded={figuresExpanded}
                    aria-label={`${figuresExpanded ? "Hide" : "Show"} ${item.title} figures`}
                    className={`shrink-0 rounded-lg px-2 transition ${
                      active
                        ? "text-sage-100 hover:bg-sage-700"
                        : "text-sage-300 hover:bg-sage-600/40 hover:text-white"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`block text-xs transition-transform ${figuresExpanded ? "rotate-90" : ""}`}
                    >
                      ▸
                    </span>
                  </button>
                )}

                <div
                  role="tooltip"
                  className="pointer-events-none invisible absolute left-full top-1/2 z-[200] ml-2 w-52 -translate-y-1/2 rounded-lg border border-sage-500 bg-sage-800 px-3 py-2 text-[11px] italic leading-relaxed text-sage-100 shadow-xl group-hover:visible"
                >
                  “{item.question}”
                </div>
              </div>

              {hasFigures && figuresExpanded && (
                <ul className="mb-2 ml-7 border-l border-sage-600/60 pl-2.5">
                  {item.figures.map((fig) => (
                    <li key={fig.hash}>
                      <Link
                        href={`${item.href}#${fig.hash}`}
                        onClick={(e) => {
                          if (isActive(pathname, item.href)) {
                            e.preventDefault();
                            const target = `#${fig.hash}`;
                            if (window.location.hash === target) {
                              window.dispatchEvent(new HashChangeEvent("hashchange"));
                            } else {
                              window.location.hash = fig.hash;
                            }
                          }
                          onNavigate?.();
                        }}
                        className="block rounded px-2 py-1 text-[11px] leading-tight text-sage-300 transition hover:bg-sage-600/40 hover:text-white"
                      >
                        {fig.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="relative z-10 mt-auto overflow-visible border-t border-sage-600 px-1 pb-2 pt-6"
        aria-label={isAggregate ? "Aggregate fleet profile" : `Current farm: ${selected.name}`}
      >
        <div className="min-w-0 space-y-3 overflow-visible">
          <div className="relative min-w-0 space-y-2 overflow-visible">
            <FarmSelector />
            <p className="truncate text-xs text-sage-300">
              {cropFilter
                ? `All farms · ${cropFilter}`
                : isAggregate ? "Aggregate analysis" : selected.id}
            </p>

            {/* Crop-type filter — either/or with farm selection */}
            <div className="pt-0.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sage-400">
                Filter by crop
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(["Tomato", "Pepper", "Strawberry", "Cucumber"] as const).map((crop) => {
                  const active = cropFilter === crop;
                  return (
                    <button
                      key={crop}
                      type="button"
                      onClick={() => setCropFilter(active ? null : crop)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        active
                          ? "bg-sage-100 text-sage-900"
                          : "text-sage-400 hover:bg-sage-600/40 hover:text-sage-100"
                      }`}
                    >
                      {crop}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            {isAggregate ? (
              <AggregateStats farms={individualFarms} />
            ) : (
              <SingleFarmStats farm={selected} />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
