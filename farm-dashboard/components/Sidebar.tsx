"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { USE_CASES } from "@/constants/useCases";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

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
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition ${
                active
                  ? "bg-sage-600 text-white shadow-sm"
                  : "text-sage-100 hover:bg-sage-600/40 hover:text-white"
              }`}
            >
              <span aria-hidden className="mt-0.5 text-[10px] font-bold text-sage-300">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <span aria-hidden>{item.icon}</span>
                  {item.title}
                </span>
                <span
                  className={`block text-[11px] leading-tight ${
                    active ? "text-sage-100" : "text-sage-300"
                  }`}
                >
                  {item.question}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
