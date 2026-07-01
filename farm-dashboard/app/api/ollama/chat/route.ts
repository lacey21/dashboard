import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { USE_CASES } from "@/constants/useCases";
import { ensureOllamaReachable, ollamaChat } from "@/lib/ollama";

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

// One compact line per page. We deliberately omit the per-figure "#anchor"
// sections: they roughly doubled the catalog's token count, and on a local CPU
// model every prompt token adds to a quadratic prefill cost. Links to the page
// itself still work; the model just can't deep-link to a section anchor.
function catalogForPrompt(): string {
  return PAGE_CATALOG.map((p) => `- ${p.href} — ${p.title}: ${p.desc}`).join("\n");
}

/** Reject hrefs that aren't internal dashboard pages from our catalog. */
function isValidLink(href: unknown): href is string {
  if (typeof href !== "string" || !href.startsWith("/")) return false;
  const base = href.split("#")[0];
  return ALLOWED_BASE_PATHS.has(base);
}

type Json = Record<string, unknown>;

// On a local CPU model the prompt's prefill is the dominant cost and grows
// super-linearly with token count, so we boil each data file down to the handful
// of figures the chat actually needs. We send a flat, rounded summary (top 5
// plots, no time-series, no model internals) instead of the raw dashboard JSON.
const TOP_PLOTS = 5;

/** Round to `d` decimals; drop anything that isn't a finite number. */
function num(v: unknown, d = 1): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? Number(v.toFixed(d)) : undefined;
}

function topPlotsByUrgency(raw: unknown, n: number): Json[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const plots = raw.filter((p): p is Json => typeof p === "object" && p != null);
  plots.sort(
    (a, b) =>
      (typeof b.urgency_score === "number" ? b.urgency_score : 0) -
      (typeof a.urgency_score === "number" ? a.urgency_score : 0),
  );
  const top = plots.slice(0, n).map((p) => ({
    // `label` already includes the crop and farm name, so we skip those fields.
    plot: p.plot_id,
    label: p.label,
    urgency: num(p.urgency_score, 2),
    stress: num(p.plant_stress_index, 2),
    alert: p.alert_type,
    note: p.oneliner,
  }));
  return top.length ? top : undefined;
}

async function readJson(farm: string, file: string): Promise<Json | null> {
  try {
    const full = path.join(process.cwd(), "public", "data", farm, file);
    return JSON.parse(await readFile(full, "utf8"));
  } catch {
    return null;
  }
}

function compactHome(h: Json | null): Json | null {
  if (!h) return null;
  const b = (h.banner ?? {}) as Json;
  const k = (h.kpis ?? {}) as Json;
  return {
    healthScore: num(k.farmHealthScore),
    healthDelta: num(k.farmHealthDelta),
    activeAlerts: k.activeAlerts,
    criticalPlots: b.criticalPlots,
    unactionedAlerts: b.unactionedAlerts,
    seasonRoiPct: num(k.seasonRoiPct),
    precisionActionRatePct: num(k.precisionActionRate),
  };
}

function compactAlertTriage(a: Json | null): Json | null {
  if (!a) return null;
  const defaultWeek = a.defaultWeek as string | undefined;
  const plotRankings = a.plotRankings as Record<string, unknown> | undefined;
  const weeklyStats = a.weeklyStats as Record<string, unknown> | undefined;
  const rankingsRaw = defaultWeek ? plotRankings?.[defaultWeek] : undefined;
  const stats = (defaultWeek && weeklyStats ? weeklyStats[defaultWeek] : {}) as Json;
  const totalRanked = Array.isArray(rankingsRaw) ? rankingsRaw.length : 0;
  const byType = Array.isArray(a.alertTypeBreakdown)
    ? (a.alertTypeBreakdown as Json[]).slice(0, 4).map((t) => ({
        type: t.alert_type,
        count: t.count,
        resolvedPct: num(t.resolution_rate),
      }))
    : undefined;

  return {
    week: defaultWeek,
    responseRatePct: num(stats.responseRate),
    avgResponseDays: num(stats.avgResponseDays, 2),
    highStressEvents: stats.highStressEvents,
    byType,
    topUrgentPlots: topPlotsByUrgency(rankingsRaw, TOP_PLOTS),
    totalUrgentPlots: totalRanked > TOP_PLOTS ? totalRanked : undefined,
  };
}

function compactSeasonal(s: Json | null): Json | null {
  if (!s) return null;
  const f = (s.financials ?? {}) as Json;
  return {
    totalRevenue: num(f.totalRevenue, 0),
    totalCost: num(f.totalCost, 0),
    precisionBenefit: num(f.precisionBenefit, 0),
    precisionSpend: num(f.precisionSpend, 0),
    roiPct: num(f.meanRoiPct),
    benefitPerDollar: num(f.benefitPerDollar, 2),
    avgYieldKgM2: num(f.avgYield, 2),
    controlYieldKgM2: num(f.controlYield, 2),
  };
}

function compactSustainability(s: Json | null): Json | null {
  if (!s) return null;
  const sub = (s.subscores ?? {}) as Json;
  return {
    overallScore: num(s.overallScore),
    label: s.scoreLabel,
    subscores: Object.fromEntries(Object.entries(sub).map(([k, v]) => [k, num(v)])),
    weakest: { category: s.weakestCategory, score: num(s.weakestScore) },
    strongest: { category: s.strongestCategory, score: num(s.strongestScore) },
    topRisks: Array.isArray(s.risks)
      ? (s.risks as Json[]).slice(0, 3).map((r) => `${r.title} (${r.level}): ${r.oneliner}`)
      : undefined,
  };
}

type ScopeNode = {
  id: string;
  name?: string;
  level?: string;
  region?: string;
  primaryCrop?: string;
  children?: ScopeNode[];
};

/** Depth-first search for a scope (farm / greenhouse / plot) in the tree. */
function findScope(nodes: ScopeNode[], id: string): ScopeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const hit = node.children ? findScope(node.children, id) : null;
    if (hit) return hit;
  }
  return null;
}

async function buildContext(farm: string) {
  const [scopesRaw, farmsRaw, home, alert, seasonal, sustainability] = await Promise.all([
    readJson("", "scopes.json").catch(() => null),
    readJson("", "farms.json").catch(() => null),
    readJson(farm, "home.json"),
    readJson(farm, "alert_triage.json"),
    readJson(farm, "seasonal_evaluation.json"),
    readJson(farm, "sustainability.json"),
  ]);

  const farms = Array.isArray(farmsRaw) ? (farmsRaw as { id: string; name?: string }[]) : [];
  const tree = Array.isArray(scopesRaw) ? (scopesRaw as ScopeNode[]) : [];
  // Resolve from the full hierarchy first (covers greenhouses & plots), then the
  // flat farm list, then a bare id fallback.
  const meta =
    findScope(tree, farm) ?? farms.find((f) => f.id === farm) ?? { id: farm };

  return {
    scope: {
      id: meta.id,
      name: meta.name,
      region: (meta as { region?: string }).region,
      primaryCrop: (meta as { primaryCrop?: string }).primaryCrop,
    },
    asOf: home?.latestDate,
    overview: compactHome(home),
    alerts: compactAlertTriage(alert),
    finance: compactSeasonal(seasonal),
    sustainability: compactSustainability(sustainability),
  };
}

type ChatTurn = { role: "user" | "assistant"; text: string };

/**
 * Build the system prompt for a farm, or null if the farm has no data.
 * Shared by the chat and warm-up paths so both produce a byte-identical prefix —
 * that lets Ollama's prompt cache reuse the (expensive) prefill of this prompt
 * across the warm-up ping and the real question.
 */
async function buildSystemPrompt(farm: string): Promise<string | null> {
  const context = await buildContext(farm);
  if (!context.overview && !context.alerts && !context.finance && !context.sustainability) {
    return null;
  }

  const scopeName =
    farm === "all"
      ? "All Farms (fleet-wide aggregate of every farm)"
      : `${(context.scope as { name?: string }).name ?? farm}`;

  return `You are GreenLeaf AI, an assistant embedded in a precision-agriculture dashboard for greenhouse/controlled-environment farms. You help farmers understand their own farm data and guide them to the right dashboard page.

CURRENT SCOPE: ${scopeName}.

You are given this scope's current dashboard data as JSON. Rules:
- Answer ONLY using the data below. If it doesn't contain the answer, say so plainly — never invent numbers.
- Be concise, practical, and farmer-friendly. A sentence or two, or a few short bullets. Use plain English, no jargon.
- Always cite the specific numbers you used so the farmer can trust the answer.
- When a dashboard page would help the farmer explore or act on the answer, recommend exactly one — the most relevant.

PAGES YOU MAY LINK TO (use these exact hrefs only):
${catalogForPrompt()}

Respond with ONLY a valid JSON object — no markdown fences, no extra keys. Use exactly this shape:
{"answer": "your plain-text response (bold with **word**, italic with *word*)", "link": {"label": "short button text", "href": "/exact-href"} | null}
Example: {"answer": "Health score is 78. Three plots need attention.", "link": {"label": "View alert triage", "href": "/alert-triage"}}
Set "link" to null when no page is clearly relevant. Never use an href not in the list above. Never output HTML tags.

DASHBOARD DATA (JSON):
${JSON.stringify(context, null, 0)}`;
}

export async function POST(req: Request) {
  const unavailable = await ensureOllamaReachable();
  if (unavailable) return unavailable;

  const body = (await req.json()) as { farm?: string; messages?: ChatTurn[]; warm?: boolean };
  const farm = body.farm ?? "all";
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!/^[A-Za-z0-9_-]+$/.test(farm)) {
    return NextResponse.json({ error: "Invalid farm id." }, { status: 400 });
  }

  // Warm-up ping: prime the model + Ollama's prefix cache for this farm so the
  // user's first real question returns in seconds instead of paying the full
  // prompt prefill (which is slow on a local CPU model). Fire-and-forget.
  if (body.warm) {
    const systemPrompt = await buildSystemPrompt(farm);
    if (!systemPrompt) return NextResponse.json({ warmed: false });
    await ollamaChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "ready?" },
      ],
      { jsonFormat: true, timeoutMs: 120_000, numPredict: 1 },
    );
    return NextResponse.json({ warmed: true });
  }

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "No question provided." }, { status: 400 });
  }

  const systemPrompt = await buildSystemPrompt(farm);
  if (!systemPrompt) {
    return NextResponse.json({ error: `No data found for "${farm}".` }, { status: 404 });
  }

  const ollamaMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: m.text,
    })),
  ];

  const result = await ollamaChat(ollamaMessages, {
    jsonFormat: true,
    // After a warm-up ping the prefix is cached and this returns in seconds. The
    // 120s ceiling only matters for a cold first question on a slow CPU box; it
    // still fails far faster (and with a clear message) than the old 180s.
    timeoutMs: 120_000,
    numPredict: 350,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const parsed = parseAnswer(result.text);
  return NextResponse.json({ ...parsed, model: result.model });
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
    return { answer: cleaned, link: null };
  }
}
