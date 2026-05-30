"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useChat, type ChatMessage } from "@/contexts/ChatContext";
import { useFarm } from "@/contexts/FarmContext";
import { Markdown } from "@/components/Markdown";
import { AiIcon } from "@/components/AiIcon";
import { COLORS } from "@/constants/colors";

const SUGGESTIONS = [
  "Which plots need attention right now?",
  "Is the precision system paying off this season?",
  "What's hurting my sustainability score?",
  "How fast is my crew responding to alerts?",
];

function LinkPill({ link, onNavigate }: { link: { label: string; href: string }; onNavigate?: () => void }) {
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-sage-300 bg-sage-50 px-3 py-1.5 text-xs font-semibold text-sage-700 transition hover:border-sage-400 hover:bg-sage-100 hover:text-sage-900"
    >
      {link.label}
      <span aria-hidden>→</span>
    </Link>
  );
}

function MessageBubble({ msg, onNavigate }: { msg: ChatMessage; onNavigate?: () => void }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-sage-600 px-3.5 py-2 text-sm text-white shadow-sm">
          {msg.text}
        </div>
      </div>
    );
  }

  if (msg.isError) {
    return (
      <div className="rounded-2xl rounded-bl-sm border border-red-200 bg-red-50 px-3.5 py-2.5">
        <p className="text-sm font-medium text-red-700">Could not get an answer</p>
        <p className="mt-0.5 text-xs text-red-500">{msg.text}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-sage-200 bg-white px-3.5 py-2.5 shadow-sm">
      <Markdown text={msg.text} />
      {msg.link && <LinkPill link={msg.link} onNavigate={onNavigate} />}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex max-w-[60%] items-center gap-1.5 rounded-2xl rounded-bl-sm border border-sage-200 bg-white px-3.5 py-3 shadow-sm">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-sage-400 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

type Props = {
  /** "overlay" = full-height slide-over; "inline" = embedded card on the overview. */
  variant?: "inline" | "overlay";
  /** Called when an in-answer link is clicked (e.g. to close the overlay). */
  onNavigate?: () => void;
};

export function FarmChat({ variant = "inline", onNavigate }: Props) {
  const { messages, loading, send } = useChat();
  const { selected } = useFarm();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0;

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function submit(text: string) {
    if (!text.trim() || loading) return;
    send(text);
    setInput("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  }

  const scopeLabel =
    selected.id === "all" ? "all farms" : selected.name;

  return (
    <div className={variant === "overlay" ? "flex h-full flex-col" : "flex h-[30rem] flex-col rounded-xl border border-sage-200 bg-sage-50/60 shadow-sm"}>
      {/* Header (inline variant only — overlay has its own header) */}
      {variant === "inline" && (
        <div className="flex items-center gap-2 border-b border-sage-200 px-4 py-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-100" style={{ color: COLORS.sageDark }}>
            <AiIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sage-900">Ask GreenLeaf AI</p>
            <p className="truncate text-xs text-sage-500">Answers from your {scopeLabel} data</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col justify-center">
            <p className="text-sm text-sage-600">
              Ask anything about <strong className="font-semibold text-sage-800">{scopeLabel}</strong> — alerts,
              finances, sustainability. I’ll answer from your data and point you to the right page.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border border-sage-200 bg-white px-3 py-1.5 text-xs text-sage-700 transition hover:border-sage-400 hover:text-sage-900"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <MessageBubble key={i} msg={m} onNavigate={onNavigate} />)
        )}
        {loading && <TypingDots />}
      </div>

      {/* Composer */}
      <div className="border-t border-sage-200 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-sage-200 bg-white px-3 py-2 focus-within:border-sage-400">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about your farm data…"
            className="max-h-28 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm leading-5 text-sage-900 placeholder:text-sage-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => submit(input)}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sage-600 text-white transition hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M2 8l12-5.5L9.5 14 7.5 9 2 8z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-sage-400">
          GreenLeaf AI-generated from your dashboard data · may make mistakes
        </p>
      </div>
    </div>
  );
}
