"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { USE_CASES } from "@/constants/useCases";
import { UseCaseIcon } from "@/components/UseCaseIcon";

/**
 * Persistent breadcrumb + story navigation for the three use-case pages. Rendered
 * inside the AppShell's sticky header so it stays pinned while scrolling. Shows
 * "Overview / [Title] · Use case N of 3" plus prev/next arrows that flip through the
 * use cases. Renders nothing on pages that aren't one of the use cases.
 */
export function UseCaseHeader() {
  const pathname = usePathname();
  const n = USE_CASES.length;
  const index = USE_CASES.findIndex(
    (u) => pathname === u.href || pathname.startsWith(`${u.href}/`),
  );
  if (index === -1) return null;

  const current = USE_CASES[index];
  const prev = USE_CASES[(index - 1 + n) % n];
  const next = USE_CASES[(index + 1) % n];

  return (
    <div className="flex items-center gap-3 border-b border-sage-200 bg-white px-3 py-2 sm:px-5">
      {/* Breadcrumb — this is a use case of the overview */}
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Link href="/" className="shrink-0 text-sage-600 hover:text-sage-900">
          Overview
        </Link>
        <span aria-hidden className="text-sage-300">
          /
        </span>
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-sage-900">
          <UseCaseIcon src={current.icon} size={22} />
          <span className="truncate">{current.title}</span>
        </span>
        <span className="hidden shrink-0 rounded-full bg-sage-100 px-2 py-0.5 text-[11px] font-medium text-sage-600 sm:inline">
          Use case {index + 1} of {n}
        </span>
      </div>

      {/* Story navigation — flip between use cases */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Link
          href={prev.href}
          aria-label={`Previous use case: ${prev.title}`}
          className="flex items-center gap-1 rounded-md border border-sage-200 px-2 py-1 text-xs font-medium text-sage-700 transition hover:border-sage-400 hover:bg-sage-50"
        >
          <span aria-hidden>←</span>
          <span className="hidden lg:inline">{prev.title}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex" aria-hidden>
          {USE_CASES.map((u, i) => (
            <Link
              key={u.id}
              href={u.href}
              aria-label={`Go to ${u.title}`}
              aria-current={i === index ? "page" : undefined}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-sage-600" : "w-2 bg-sage-300 hover:bg-sage-500"
              }`}
            />
          ))}
        </div>

        <Link
          href={next.href}
          aria-label={`Next use case: ${next.title}`}
          className="flex items-center gap-1 rounded-md border border-sage-200 px-2 py-1 text-xs font-medium text-sage-700 transition hover:border-sage-400 hover:bg-sage-50"
        >
          <span className="hidden lg:inline">{next.title}</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
