"use client";

import { useEffect, useState } from "react";

/**
 * Tracks how far the main KPI block has scrolled past the fixed header.
 * 0 = big KPI cards still visible; 1 = scrolled past them.
 *
 * Returns a callback ref to attach to the KPI section and the 0 → 1 progress.
 * Using a callback ref (instead of a RefObject) is important: the KPI section
 * is rendered conditionally after data loads, so the element does not exist on
 * first mount. The state-backed callback ref re-runs the effect once the
 * element actually mounts, ensuring the scroll listeners get attached.
 */
export function useKpiScrollProgress(headerHeight = 40) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!el) return;

    let raf = 0;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const h = headerHeight;

      let next: number;
      if (rect.bottom > h + 24) {
        // KPI section still fully below header
        next = 0;
      } else if (rect.top <= h - 8) {
        // KPI section has cleared the header
        next = 1;
      } else {
        // Smooth handoff while the KPI row passes under the header
        const range = rect.height + 32;
        next = 1 - (rect.bottom - h) / range;
        next = Math.min(1, Math.max(0, next));
      }

      setProgress((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [el, headerHeight]);

  return [setEl, progress] as const;
}
