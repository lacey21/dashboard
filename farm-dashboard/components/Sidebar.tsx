"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { USE_CASES } from "@/constants/useCases";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());

  function toggleFigures(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-1 p-3">
      {/* Overview — the top of the story */}
      <Link
        href="/"
        onClick={onNavigate}
        aria-current={isActive(pathname, "/") ? "page" : undefined}
        className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition ${
          isActive(pathname, "/")
            ? "bg-sage-600 text-white shadow-sm"
            : "text-sage-100 hover:bg-sage-600/40 hover:text-white"
        }`}
      >
        <span aria-hidden className="text-base leading-tight">
          📊
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Overview</span>
          <span
            className={`block text-[11px] leading-tight ${
              isActive(pathname, "/") ? "text-sage-100" : "text-sage-300"
            }`}
          >
            Aggregate results
          </span>
        </span>
      </Link>

      {/* The three use cases that branch off the overview */}
      <p className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-sage-300">
        Use cases of the overview
      </p>
      <div className="ml-4 border-l border-sage-600 pl-2">
        {USE_CASES.map((item, i) => {
          const active = isActive(pathname, item.href);
          const figuresExpanded = expandedSections.has(item.id);
          const hasFigures = item.figures.length > 0;

          return (
            <div key={item.href}>
              <div className="group relative flex items-stretch gap-0.5">
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
                    <span aria-hidden>{item.icon}</span>
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
                  className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-2 w-52 -translate-y-1/2 rounded-lg border border-sage-500 bg-sage-800 px-3 py-2 text-[11px] italic leading-relaxed text-sage-100 shadow-xl group-hover:visible"
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
                        onClick={onNavigate}
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
    </nav>
  );
}
