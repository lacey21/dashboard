import { NextResponse } from "next/server";
import { MODEL_FALLBACK_CHAIN, OLLAMA_BASE } from "@/lib/ollama";

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Ollama returned HTTP ${res.status}` },
        { status: res.status },
      );
    }
    const json = (await res.json()) as { models?: { name: string }[] };
    const installed = (json.models ?? []).map((m) => m.name);
    const preferredAvailable = MODEL_FALLBACK_CHAIN.filter((name) =>
      installed.some((m) => m === name || m.startsWith(`${name}:`)),
    );
    return NextResponse.json({
      ok: true,
      baseUrl: OLLAMA_BASE,
      installedModels: installed,
      preferredAvailable,
    });
  } catch {
    return NextResponse.json(
      { error: "Ollama is not running. Start it with: ollama serve" },
      { status: 503 },
    );
  }
}
