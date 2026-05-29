"use client";

import { useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import { FarmChat } from "@/components/FarmChat";
import { COLORS } from "@/constants/colors";

/** Right-hand slide-over chat panel, opened from the sidebar's "Ask AI" button. */
export function ChatOverlay() {
  const { open, closeChat, messages, reset } = useChat();

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeChat]);

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={closeChat}
        className={`absolute inset-0 bg-sage-900/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="GreenLeaf AI chat"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-sage-50 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-sage-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-100" style={{ color: COLORS.sageDark }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M8 1.5l1.4 3.6L13 6.5l-3.6 1.4L8 11.5 6.6 7.9 3 6.5l3.6-1.4L8 1.5z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-sage-900">GreenLeaf AI</p>
              <p className="text-xs text-sage-500">Insights from your farm data</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg px-2 py-1 text-xs font-medium text-sage-500 transition hover:bg-sage-100 hover:text-sage-800"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={closeChat}
              aria-label="Close chat"
              className="rounded-lg p-1.5 text-sage-500 transition hover:bg-sage-100 hover:text-sage-900"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          {/* Mount the chat only while open so the textarea autofocus/scroll behaves. */}
          {open && <FarmChat variant="overlay" onNavigate={closeChat} />}
        </div>
      </div>
    </div>
  );
}
