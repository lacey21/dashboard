import { NextResponse } from "next/server";

const OLLAMA_BASE = "http://127.0.0.1:11434";

// Tried in order — first model that responds wins.
const MODEL_FALLBACK_CHAIN = [
  "llama3.2",
  "llama3.2:1b",
  "gemma3:4b",
  "mistral",
  "phi4-mini",
];

function isRetryable(msg: string): boolean {
  return (
    msg.includes("404") ||
    msg.includes("not found") ||
    msg.includes("model") ||
    msg.includes("503") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("fetch failed")
  );
}

export async function POST(req: Request) {
  const { prompt } = await req.json();

  // Check Ollama is reachable before trying models
  try {
    await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
  } catch {
    return NextResponse.json(
      { error: "Ollama is not running. Start it with: ollama serve" },
      { status: 503 },
    );
  }

  const systemPrompt = `You are a precision agriculture advisor for a CEA operation.
Reply with bullet points only. Be specific with numbers from the data provided.
Maximum 6 bullets. No preamble, no sign-off.`;

  const triedModels: string[] = [];
  let lastError = "No models available";

  for (const model of MODEL_FALLBACK_CHAIN) {
    triedModels.push(model);
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: `${systemPrompt}\n\n${prompt}`,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        lastError = `${model}: HTTP ${res.status}`;
        console.warn(`[ollama] ${lastError}`);
        continue;
      }

      const data = await res.json() as { response?: string; error?: string };

      if (data.error) {
        lastError = `${model}: ${data.error}`;
        console.warn(`[ollama] ${lastError}`);
        if (isRetryable(data.error)) continue;
        break;
      }

      return NextResponse.json({ text: data.response, model });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(`[ollama] ${model} failed: ${lastError.slice(0, 100)}`);
      if (isRetryable(lastError)) continue;
      break;
    }
  }

  return NextResponse.json(
    {
      error: `Could not get a response from Ollama (tried: ${triedModels.join(", ")}). ` +
        `Run "ollama pull llama3.2" to install a model, then restart the dev server.`,
    },
    { status: 500 },
  );
}
