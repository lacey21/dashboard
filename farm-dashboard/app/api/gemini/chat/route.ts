import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { USE_CASES } from "@/constants/useCases";

// Same fallback strategy as /api/gemini — first model that succeeds wins.
const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

function isRetryable(msg: string): boolean {
  return (
    msg.includes("404") ||
    msg.includes("not found") ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("503") ||
    msg.includes("overloaded")
  );
}

function friendlyError(raw: string, tried: string[]): string {
  const list = tried.join(", ");
  if (raw.includes("429") || raw.includes("quota") || raw.includes("RESOURCE_EXHAUSTED")) {
    return `All models hit quota limits (tried: ${list}). Enable billing at console.cloud.google.com or wait for the daily limit to reset.`;
  }
  if (raw.includes("404") || raw.includes("not found")) {
    return `No available models responded (tried: ${list}). Check ai.google.dev for current model names.`;
  }
  if (raw.includes("403") || raw.includes("API_KEY")) {
    return "Invalid or missing Gemini API key. Check GEMINI_API_KEY in .env.local.";
  }
  return `Chat failed after trying ${tried.length} model(s) (${list}): ${raw}`;
}

// ── Page catalog the model may link to. Single source of truth = USE_CASES. ──
type CatalogPage = {
  href: string;
  title: string;
  desc: string;
  figures?: { label: string; hash: string }[];
};

const PAGE_CATALOG: CatalogPage[] = [
  {
    href: "/",
    title: "Operation Overview",
    desc: "Farm-wide KPIs: health score, active alerts today, season ROI, precision action rate.",
  },
  ...USE_CASES.map((u) => ({
    href: u.href,
    title: u.title,
    desc: u.question,
    figures: u.figures,
  })),
  {
    href: "/stress-simulator",
    title: "Stress Outcome Simulator",
    desc: "Simulate how reducing plant stress would change yield and revenue.",
  },
];

const ALLOWED_BASE_PATHS = new Set(PAGE_CATALOG.map((p) => p.href));

function catalogForPrompt(): string {
  return PAGE_CATALOG.map((p) => {
    const figs =
      p.figures && p.figures.length
        ? `\n    Sections: ${p.figures.map((f) => `${p.href}#${f.hash} ("${f.label}")`).join(", ")}`
        : "";
    return `- ${p.href} — ${p.title}: ${p.desc}${figs}`;
  }).join("\n");
}

/** Reject hrefs that aren't internal dashboard pages from our catalog. */
function isValidLink(href: unknown): href is string {
  if (typeof href !== "string" || !href.startsWith("/")) return false;
  const base = href.split("#")[0];
  return ALLOWED_BASE_PATHS.has(base);
}

// ── Data loading + trimming ──────────────────────────────────────────────
// alert_triage.json is huge (plotDetails has thousands of plot×week entries),
// so we drop the heavy bits and keep only what's useful for answering questions.
type Json = Record<string, unknown>;

async function readJson(farm: string, file: string): Promise<Json | null> {
  try {
    const full = path.join(process.cwd(), "public", "data", farm, file);
    return JSON.parse(await readFile(full, "utf8"));
  } catch {
    return null;
  }
}

function compactAlertTriage(a: Json | null): Json | null {
  if (!a) return null;
  const defaultWeek = a.defaultWeek as string | undefined;
  const plotRankings = a.plotRankings as Record<string, unknown> | undefined;
  return {
    weeks: a.weeks,
    defaultWeek,
    weeklyStats: a.weeklyStats,
    // Only the current week's ranked plots — drop every other week + plotDetails.
    currentWeekPlotRankings: defaultWeek ? plotRankings?.[defaultWeek] : undefined,
    responseOverTime: a.responseOverTime,
    alertTypeBreakdown: a.alertTypeBreakdown,
    healthTrend: a.healthTrend,
    previouslyAtRisk: a.previouslyAtRisk,
  };
}

function compactSeasonal(s: Json | null): Json | null {
  if (!s) return null;
  const ym = s.yieldModel as Json | undefined;
  return {
    ...s,
    // The fitted model's coefficient arrays add noise; keep only the headline figures.
    yieldModel: ym
      ? {
          currentSeasonAvgYield: ym.currentSeasonAvgYield,
          avgMarketPricePerKg: ym.avgMarketPricePerKg,
        }
      : undefined,
  };
}

async function buildContext(farm: string) {
  const [farmsRaw, home, alert, seasonal, sustainability] = await Promise.all([
    readJson("", "farms.json").catch(() => null),
    readJson(farm, "home.json"),
    readJson(farm, "alert_triage.json"),
    readJson(farm, "seasonal_evaluation.json"),
    readJson(farm, "sustainability.json"),
  ]);

  const farms = Array.isArray(farmsRaw) ? (farmsRaw as { id: string }[]) : [];
  const meta = farms.find((f) => f.id === farm) ?? { id: farm };

  return {
    scope: meta,
    home,
    alertTriage: compactAlertTriage(alert),
    seasonalEvaluation: compactSeasonal(seasonal),
    sustainability,
  };
}

type ChatTurn = { role: "user" | "assistant"; text: string };

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set. Add it to .env.local to enable the GreenLeaf AI chat." },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { farm?: string; messages?: ChatTurn[] };
  const farm = body.farm ?? "all";
  const messages = Array.isArray(body.messages) ? body.messages : [];

  // Guard against path traversal — farm ids are like "all" or "F01".
  if (!/^[A-Za-z0-9_-]+$/.test(farm)) {
    return NextResponse.json({ error: "Invalid farm id." }, { status: 400 });
  }
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "No question provided." }, { status: 400 });
  }

  const context = await buildContext(farm);
  if (!context.home && !context.alertTriage && !context.seasonalEvaluation && !context.sustainability) {
    return NextResponse.json(
      { error: `No data found for "${farm}".` },
      { status: 404 },
    );
  }

  const scopeName =
    farm === "all"
      ? "All Farms (fleet-wide aggregate of every farm)"
      : `${(context.scope as { name?: string }).name ?? farm}`;

  const systemPrompt = `You are GreenLeaf AI, an assistant embedded in a precision-agriculture dashboard for greenhouse/controlled-environment farms. You help farmers understand their own farm data and guide them to the right dashboard page.

CURRENT SCOPE: ${scopeName}.

You are given this scope's current dashboard data as JSON. Rules:
- Answer ONLY using the data below. If it doesn't contain the answer, say so plainly — never invent numbers.
- Be concise, practical, and farmer-friendly. A sentence or two, or a few short bullets. Use plain English, no jargon.
- Always cite the specific numbers you used so the farmer can trust the answer.
- When a dashboard page would help the farmer explore or act on the answer, recommend exactly one — the most relevant. Prefer a specific section anchor when one fits.

PAGES YOU MAY LINK TO (use these exact hrefs only):
${catalogForPrompt()}

Respond with ONLY a JSON object, no markdown fences, of this exact shape:
{"answer": "<your answer in light markdown>", "link": {"label": "<short button label, e.g. 'View alert triage'>", "href": "<one href from the list, optionally with #anchor>"} | null}
Set "link" to null when no page is clearly relevant. Never use an href that is not in the list above.

DASHBOARD DATA (JSON):
${JSON.stringify(context, null, 0)}`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  const genai = new GoogleGenerativeAI(key);
  const tried: string[] = [];
  let lastError = "Unknown error";

  for (const modelName of MODEL_FALLBACK_CHAIN) {
    tried.push(modelName);
    try {
      const model = genai.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      });
      const result = await model.generateContent({ contents });
      const raw = result.response.text();
      const parsed = parseAnswer(raw);
      return NextResponse.json({ ...parsed, model: modelName });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(`[gemini-chat] ${modelName} failed: ${lastError.slice(0, 120)}`);
      if (!isRetryable(lastError)) break;
    }
  }

  return NextResponse.json({ error: friendlyError(lastError, tried) }, { status: 500 });
}

/** Parse the model's JSON, tolerating stray code fences, and validate the link. */
function parseAnswer(raw: string): { answer: string; link: { label: string; href: string } | null } {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const obj = JSON.parse(cleaned) as {
      answer?: string;
      link?: { label?: string; href?: string } | null;
    };
    const answer = typeof obj.answer === "string" ? obj.answer : cleaned;
    const link =
      obj.link && isValidLink(obj.link.href)
        ? { label: obj.link.label?.trim() || "Open page", href: obj.link.href }
        : null;
    return { answer, link };
  } catch {
    // Model didn't return valid JSON — surface its text as the answer.
    return { answer: cleaned, link: null };
  }
}
