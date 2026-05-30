"use client";

import { useEffect, type ReactNode } from "react";
import { useOllama } from "@/hooks/useOllama";
import { AiIcon } from "@/components/AiIcon";
import { Markdown } from "@/components/Markdown";
import { COLORS } from "@/constants/colors";

type Props = {
  prompt: string;
  label?: string;
  /** Header shown above the generated text. Defaults to "GreenLeaf AI-generated · based on your farm data". */
  headerLabel?: string;
  showRegenerate?: boolean;
  /** When set, shown instead of the default error UI if generation fails. */
  errorFallback?: string;
  /** Optional content rendered at the bottom of the card, below the generated text. */
  footer?: ReactNode;
  autoRun?: boolean;
  variant?: "default" | "risk";
  riskLevel?: "critical" | "warning" | "healthy";
};

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

export function OllamaInsight({
  prompt,
  label = "GreenLeaf AI Insight",
  headerLabel = "GreenLeaf AI-generated · based on your farm data",
  showRegenerate = true,
  errorFallback,
  footer,
  autoRun = false,
  variant = "default",
  riskLevel = "warning",
}: Props) {
  const { result, loading, error, generate, setResult } = useOllama();

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
      {!autoRun && !result && (
        <button
          type="button"
          onClick={() => generate(prompt)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 hover:text-sage-900 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-sage-400 border-t-transparent animate-spin" />
              Generating…
            </>
          ) : (
            `Generate ${label}`
          )}
        </button>
      )}

      {autoRun && loading && <LoadingDots />}

      {error && errorFallback ? (
        <div className={`rounded-lg border p-4 ${bg}`}>
          <p className="text-sm text-sage-600">{errorFallback}</p>
          {footer && <div className="mt-4">{footer}</div>}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <p className="font-medium">Could not generate advice</p>
          <p className="mt-0.5 text-xs text-red-500">{error}</p>
        </div>
      ) : null}

      {result && (
        <div className={`rounded-lg border p-4 ${bg}`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span style={{ color: COLORS.sageDark }}>
                <AiIcon size={13} />
              </span>
              <span className="text-xs font-semibold" style={{ color: COLORS.sageDark }}>
                {headerLabel}
              </span>
            </div>
            {showRegenerate && (
              <button
                type="button"
                onClick={() => { setResult(null); generate(prompt); }}
                disabled={loading}
                className="text-xs text-sage-400 hover:text-sage-700 underline decoration-sage-200 disabled:opacity-50"
              >
                Regenerate
              </button>
            )}
          </div>
          <Markdown text={result} />
          {footer && <div className="mt-4">{footer}</div>}
        </div>
      )}
    </div>
  );
}
