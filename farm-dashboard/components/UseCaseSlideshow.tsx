"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";

export type SlideConfig = {
  id: string;
  title: string;
  audience: string;
  stat: string;
  content: ReactNode;
};

type Props = {
  slides: SlideConfig[];
  index: number;
  onIndexChange: (index: number) => void;
};

export function UseCaseSlideshow({ slides, index, onIndexChange }: Props) {
  const count = slides.length;

  const go = useCallback(
    (next: number) => {
      if (next === index) return;
      onIndexChange(next);
    },
    [index, onIndexChange],
  );

  const prev = () => go((index - 1 + count) % count);
  const next = () => go((index + 1) % count);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go((index - 1 + count) % count);
      if (e.key === "ArrowRight") go((index + 1) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, go]);

  const slide = slides[index];

  return (
    <section className="mt-10" aria-label="Use case stories">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-sage-700">
        Your next decisions
      </h2>

      {/* Slide picker — replaces top nav + nav cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(i)}
            className={`rounded-lg border p-4 text-left transition ${
              i === index
                ? "border-sage-500 bg-white shadow-md ring-2 ring-sage-400"
                : "border-sage-200 bg-white/80 hover:border-sage-400 hover:bg-white"
            }`}
          >
            <p className="text-sm font-semibold text-sage-900">{s.title}</p>
            <p className="mt-1 text-xs text-sage-600">For: {s.audience}</p>
            <p className="mt-2 text-sm font-medium text-sage-800">{s.stat}</p>
          </button>
        ))}
      </div>

      {/* Slideshow frame */}
      <div className="relative mt-6 overflow-hidden rounded-xl border border-sage-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-sage-100 bg-sage-50 px-4 py-3">
          <button
            type="button"
            onClick={prev}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-sage-800 hover:bg-sage-200"
            aria-label="Previous story"
          >
            ← Prev
          </button>
          <div className="flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to ${s.title}`}
                className={`h-2.5 rounded-full transition-all ${
                  i === index ? "w-8 bg-sage-600" : "w-2.5 bg-sage-300 hover:bg-sage-500"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-sage-800 hover:bg-sage-200"
            aria-label="Next story"
          >
            Next →
          </button>
        </div>

        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((s) => (
              <div
                key={s.id}
                className="max-h-[min(75vh,900px)] w-full shrink-0 overflow-y-auto px-4 py-6 sm:px-6"
                aria-hidden={s.id !== slide.id}
              >
                <div key={`${s.id}-${index}`} className="transition-opacity duration-300">
                  {s.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="border-t border-sage-100 px-4 py-2 text-center text-xs text-sage-600">
          {index + 1} of {count} · Use arrow keys or dots to move between stories
        </p>
      </div>
    </section>
  );
}
