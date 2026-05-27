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

export function GeminiInsight({
  prompt,
  label = "AI Insight",
  autoRun = false,
  variant = "default",
  riskLevel = "warning",
}: Props) {
  const { result, loading, error, generate } = useGemini();

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
    <div className="mt-4">
      {!autoRun && (
        <button
          type="button"
          onClick={() => generate(prompt)}
          className="text-sm font-medium text-sage-700 underline decoration-sage-400 hover:text-sage-900"
        >
          {loading ? "Generating…" : `Generate ${label}`}
        </button>
      )}
      {autoRun && loading && (
        <p className="text-sm text-sage-700">Generating personalized recommendations…</p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {result && (
        <div className={`mt-2 rounded border p-3 text-sm text-sage-900 ${bg}`}>
          <p className="mb-1 text-xs font-medium" style={{ color: COLORS.sageDark }}>
            AI-generated · based on your farm data
          </p>
          <div className="whitespace-pre-wrap">{result}</div>
        </div>
      )}
    </div>
  );
}
