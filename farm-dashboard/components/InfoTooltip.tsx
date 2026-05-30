"use client";

import { type ReactNode } from "react";

export function InfoIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <circle cx="7" cy="7" r="5.5" />
      <path strokeLinecap="round" d="M7 6.2V9.8M7 4.4v.1" />
    </svg>
  );
}

type Placement = "top" | "bottom";

function TooltipBubble({
  title,
  children,
  placement,
  align = "center",
}: {
  title?: string;
  children: ReactNode;
  placement: Placement;
  align?: "center" | "left" | "right";
}) {
  const position =
    placement === "top" ? "bottom-full mb-2" : "top-full mt-2";
  const alignClass =
    align === "left"
      ? "left-0 translate-x-0"
      : align === "right"
        ? "right-0 left-auto translate-x-0"
        : "left-1/2 -translate-x-1/2";
  const arrowPosition =
    align === "left"
      ? "left-4"
      : align === "right"
        ? "right-4 left-auto"
        : "left-1/2 -translate-x-1/2";
  const arrow =
    placement === "top"
      ? `${arrowPosition} -bottom-1.5 border-b border-r`
      : `${arrowPosition} -top-1.5 border-t border-l`;

  return (
    <div
      role="tooltip"
      className={`pointer-events-none invisible absolute z-30 w-64 rounded-xl border border-sage-200 bg-white p-3.5 text-left shadow-xl group-hover/tip:visible group-focus-within/tip:visible ${position} ${alignClass}`}
    >
      <div
        className={`absolute h-2.5 w-2.5 rotate-45 bg-white ${arrow} border-sage-200`}
        aria-hidden
      />
      {title ? <p className="text-sm font-semibold text-sage-900">{title}</p> : null}
      <div className={`text-sm leading-relaxed text-sage-600 ${title ? "mt-1.5" : ""}`}>
        {children}
      </div>
    </div>
  );
}

/** Small (i) icon — tooltip on hover/focus. */
export function InfoTip({
  title,
  children,
  placement = "top",
}: {
  title?: string;
  children: ReactNode;
  placement?: Placement;
}) {
  return (
    <span className="group/tip relative inline-flex shrink-0">
      <button
        type="button"
        tabIndex={0}
        aria-label={title ? `About ${title}` : "More information"}
        className="rounded-full p-0.5 text-sage-400 transition-colors hover:text-sage-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
        onClick={(e) => e.preventDefault()}
      >
        <InfoIcon />
      </button>
      <TooltipBubble title={title} placement={placement}>
        {children}
      </TooltipBubble>
    </span>
  );
}

/** Wrap any control — tooltip on hover/focus of the whole area. */
export function HoverTip({
  title,
  children,
  tip,
  placement = "top",
  align = "center",
  className = "",
}: {
  title?: string;
  children: ReactNode;
  tip: ReactNode;
  placement?: Placement;
  align?: "center" | "left" | "right";
  className?: string;
}) {
  return (
    <div className={`group/tip relative ${className}`}>
      {children}
      <TooltipBubble title={title} placement={placement} align={align}>
        {tip}
      </TooltipBubble>
    </div>
  );
}

/** Stat card with hover tooltip — matches dashboard KPI pattern. */
export function StatTip({
  value,
  label,
  tip,
  title,
}: {
  value: ReactNode;
  label: string;
  tip: ReactNode;
  title?: string;
}) {
  return (
    <div className="group/tip relative cursor-help rounded border border-sage-100 bg-sage-50 p-3 text-center">
      <span className="absolute right-2 top-2 text-sage-300 transition-colors group-hover/tip:text-sage-500">
        <InfoIcon className="h-3 w-3" />
      </span>
      <p className="font-bold">{value}</p>
      <p className="text-sage-600">{label}</p>
      <TooltipBubble title={title ?? label} placement="top">
        {tip}
      </TooltipBubble>
    </div>
  );
}
