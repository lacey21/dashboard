"use client";

import { useEffect } from "react";
import { useGemini } from "@/hooks/useGemini";
import { COLORS } from "@/constants/colors";

type Props = {
  prompt: string;
  label?: string;
  autoRun?: boolean;
  variant?: "default" | "risk";
  riskLevel?: "critical" | "warning" | "healthy";
};

function inlineFormat(text: string): React.ReactNode {
  // Handle **bold** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-sage-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i} className="italic text-sage-800">{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let consecutiveEmpty = 0;

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    // Empty line — add breathing room between sections (max one gap)
    if (!trimmed) {
      consecutiveEmpty++;
      if (consecutiveEmpty === 1) nodes.push(<div key={`gap-${i}`} className="h-2" />);
      return;
    }
    consecutiveEmpty = 0;

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      nodes.push(<hr key={i} className="border-sage-100 my-1" />);
      return;
    }

    // H2 heading: ## text
    if (trimmed.startsWith("## ")) {
      nodes.push(
        <p key={i} className="mt-3 mb-1 text-xs font-bold uppercase tracking-widest text-sage-500 first:mt-0">
          {trimmed.slice(3).replace(/:$/, "")}
        </p>,
      );
      return;
    }

    // H3 heading: ### text
    if (trimmed.startsWith("### ")) {
      nodes.push(
        <p key={i} className="mt-2 mb-0.5 text-sm font-semibold text-sage-800">
          {trimmed.slice(4).replace(/:$/, "")}
        </p>,
      );
      return;
    }

    // Indented sub-bullet (2+ spaces or tab before - )
    const subBulletMatch = line.match(/^[ \t]{2,}[-•*]\s+(.*)/);
    if (subBulletMatch) {
      nodes.push(
        <div key={i} className="ml-5 flex gap-2 text-sm text-sage-700">
          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-sage-300" />
          <span className="leading-relaxed">{inlineFormat(subBulletMatch[1])}</span>
        </div>,
      );
      return;
    }

    // Top-level bullet: - / • / *
    const bulletMatch = trimmed.match(/^[-•*]\s+(.*)/);
    if (bulletMatch) {
      nodes.push(
        <div key={i} className="flex gap-2.5 text-sm text-sage-800">
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sage-400" />
          <span className="leading-relaxed">{inlineFormat(bulletMatch[1])}</span>
        </div>,
      );
      return;
    }

    // Numbered list item: 1. text
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      nodes.push(
        <div key={i} className="flex gap-3 text-sm text-sage-800">
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sage-100 text-[11px] font-bold text-sage-600">
            {numberedMatch[1]}
          </span>
          <span className="leading-relaxed pt-0.5">{inlineFormat(numberedMatch[2])}</span>
        </div>,
      );
      return;
    }

    // Bold-only line acting as a pseudo-heading (e.g. **Root cause:**)
    const boldHeadingMatch = trimmed.match(/^\*\*([^*]+)\*\*:?$/);
    if (boldHeadingMatch) {
      nodes.push(
        <p key={i} className="mt-2 text-sm font-semibold text-sage-800">
          {boldHeadingMatch[1].replace(/:$/, "")}
        </p>,
      );
      return;
    }

    // Regular paragraph
    nodes.push(
      <p key={i} className="text-sm text-sage-700 leading-relaxed">
        {inlineFormat(trimmed)}
      </p>,
    );
  });

  return <div className="space-y-1">{nodes}</div>;
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-sage-400 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
      <span className="ml-1.5 text-sm text-sage-500">Generating advice…</span>
    </div>
  );
}

export function GeminiInsight({
  prompt,
  label = "AI Insight",
  autoRun = false,
  variant = "default",
  riskLevel = "warning",
}: Props) {
  const { result, loading, error, generate, setResult } = useGemini();

  useEffect(() => {
    if (autoRun) generate(prompt);
  }, [autoRun, prompt, generate]);

  const bg =
    variant === "risk"
      ? riskLevel === "critical"
        ? "bg-red-50 border-red-200"
        : riskLevel === "warning"
          ? "bg-amber-50 border-amber-200"
          : "bg-sage-50 border-sage-300"
      : "bg-white border-sage-200";

  return (
    <div className="space-y-3">
      {/* Trigger button — shown when not auto-run and no result yet */}
      {!autoRun && !result && (
        <button
          type="button"
          onClick={() => generate(prompt)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-sage-300 bg-white px-4 py-2 text-sm font-medium text-sage-800 shadow-sm transition hover:bg-sage-50 hover:border-sage-400 disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-sage-400 border-t-transparent animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.93 2.93l1.41 1.41M9.66 9.66l1.41 1.41M2.93 11.07l1.41-1.41M9.66 4.34l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Generate {label}
            </>
          )}
        </button>
      )}

      {/* Loading state (autoRun only) */}
      {autoRun && loading && <LoadingDots />}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <p className="font-medium">Could not generate advice</p>
          <p className="mt-0.5 text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-lg border p-4 ${bg}`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="6" stroke={COLORS.sageDark} strokeWidth="1.2" />
                <path d="M4.5 6.5h4M6.5 4.5v4" stroke={COLORS.sageDark} strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="text-xs font-semibold" style={{ color: COLORS.sageDark }}>
                AI-generated · based on your farm data
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setResult(null); generate(prompt); }}
              disabled={loading}
              className="text-xs text-sage-400 hover:text-sage-700 underline decoration-sage-200 disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>
          <RenderMarkdown text={result} />
        </div>
      )}
    </div>
  );
}
