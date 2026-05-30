"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Minimal centered popup used by the use-case calls-to-action (crew dispatch,
 * bank report, grant finder). Keeps the page surface quiet — a single trigger
 * button on the page opens this for the focused action. Closes on backdrop
 * click or Escape.
 */
export function CtaModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`relative my-auto w-full ${maxWidth} rounded-2xl border border-sage-200 bg-white shadow-2xl`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-sage-100 p-5">
            <div className="flex items-start gap-3">
              {icon && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-700">
                  {icon}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-sage-900">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-sage-600">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-sage-400 transition hover:bg-sage-100 hover:text-sage-700"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>

          {/* Footer */}
          {footer && <div className="border-t border-sage-100 bg-sage-50/60 p-4">{footer}</div>}
        </div>
      </div>
    </>
  );
}

/**
 * The quiet bottom-of-page trigger card every use case shares. One line of
 * context plus a primary button — the heavy lifting happens in the modal.
 */
export function CtaCard({
  eyebrow,
  title,
  description,
  buttonLabel,
  onClick,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-sage-200 bg-gradient-to-br from-sage-50 to-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white">
            {icon}
          </span>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">{eyebrow}</p>
          <p className="mt-0.5 text-base font-semibold text-sage-900">{title}</p>
          <p className="mt-0.5 text-sm text-sage-600">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 rounded-xl bg-sage-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:ring-offset-2"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
