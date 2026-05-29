"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { FarmSelector } from "@/components/FarmSelector";
import { UseCaseHeader } from "@/components/UseCaseHeader";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar (desktop: static column · mobile: slide-over drawer) ── */}
      <aside className="hidden w-60 shrink-0 bg-sage-700 lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <Link
            href="/"
            className="block border-b border-sage-600 px-4 py-4 text-base font-bold tracking-tight text-white"
          >
            GreenLeaf CEA
          </Link>
          <Sidebar />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-sage-900/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-60 flex-col bg-sage-700 shadow-xl">
            <div className="flex items-center justify-between border-b border-sage-600 px-4 py-4">
              <span className="text-base font-bold tracking-tight text-white">GreenLeaf CEA</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded p-1 text-sage-100 hover:bg-sage-600 hover:text-white"
              >
                ✕
              </button>
            </div>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Persistent header stack: farm selector bar + (on use-case pages) story nav */}
        <div className="sticky top-0 z-40 shadow-sm">
          <header className="flex items-center gap-3 border-b border-sage-800 bg-sage-700 px-3 py-2 sm:px-5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded p-1 text-white hover:bg-sage-600 lg:hidden"
            >
              ☰
            </button>
            <span className="text-sm font-bold tracking-tight text-white lg:hidden">GreenLeaf CEA</span>
            <div className="ml-auto">
              <FarmSelector />
            </div>
          </header>
          <UseCaseHeader />
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
