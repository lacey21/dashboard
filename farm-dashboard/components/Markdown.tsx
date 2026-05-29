"use client";

import type { ReactNode } from "react";

/** Renders inline **bold** and *italic* within a line of text. */
export function inlineFormat(text: string): ReactNode {
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

/**
 * Lightweight markdown renderer for AI-generated text — headings, bullets,
 * numbered lists, rules, and inline emphasis. Shared by the AI insight cards
 * and the GreenLeaf AI chat so both render model output consistently.
 */
export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
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
