import { NextResponse } from "next/server";

export const OLLAMA_BASE = process.env.OLLAMA_BASE ?? "http://127.0.0.1:11434";

/** Tried in order — first model that responds wins. */
export const MODEL_FALLBACK_CHAIN = [
  "llama3.2",
  "llama3.2:1b",
  "gemma3:4b",
  "mistral",
  "phi4-mini",
] as const;

export function isRetryableOllamaError(msg: string): boolean {
  return (
    msg.includes("404") ||
    msg.includes("not found") ||
    msg.includes("model") ||
    msg.includes("503") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("fetch failed")
  );
}

export function ollamaUnavailableResponse() {
  return NextResponse.json(
    { error: "Ollama is not running. Start it with: ollama serve" },
    { status: 503 },
  );
}

export async function ensureOllamaReachable(): Promise<NextResponse | null> {
  try {
    await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return null;
  } catch {
    return ollamaUnavailableResponse();
  }
}

type OllamaMessage = { role: "system" | "user" | "assistant"; content: string };

export async function ollamaGenerate(
  prompt: string,
  options?: { timeoutMs?: number; numPredict?: number },
): Promise<{ ok: true; text: string; model: string } | { ok: false; error: string }> {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const tried: string[] = [];
  let lastError = "No models available";

  for (const model of MODEL_FALLBACK_CHAIN) {
    tried.push(model);
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          ...(options?.numPredict != null ? { options: { num_predict: options.numPredict } } : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        lastError = `${model}: HTTP ${res.status}`;
        console.warn(`[ollama] ${lastError}`);
        continue;
      }

      const data = (await res.json()) as { response?: string; error?: string };
      if (data.error) {
        lastError = `${model}: ${data.error}`;
        console.warn(`[ollama] ${lastError}`);
        if (isRetryableOllamaError(data.error)) continue;
        break;
      }

      return { ok: true, text: data.response ?? "", model };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(`[ollama] ${model} failed: ${lastError.slice(0, 100)}`);
      if (isRetryableOllamaError(lastError)) continue;
      break;
    }
  }

  return {
    ok: false,
    error:
      `Could not get a response from Ollama (tried: ${tried.join(", ")}). ` +
      `Run "ollama pull llama3.2" to install a model, then restart the dev server.`,
  };
}

export async function ollamaChat(
  messages: OllamaMessage[],
  options?: { timeoutMs?: number; jsonFormat?: boolean },
): Promise<{ ok: true; text: string; model: string } | { ok: false; error: string }> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const tried: string[] = [];
  let lastError = "No models available";

  for (const model of MODEL_FALLBACK_CHAIN) {
    tried.push(model);
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          ...(options?.jsonFormat ? { format: "json" } : {}),
          options: { temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        lastError = `${model}: HTTP ${res.status}`;
        console.warn(`[ollama-chat] ${lastError}`);
        continue;
      }

      const data = (await res.json()) as {
        message?: { content?: string };
        error?: string;
      };

      if (data.error) {
        lastError = `${model}: ${data.error}`;
        console.warn(`[ollama-chat] ${lastError}`);
        if (isRetryableOllamaError(data.error)) continue;
        break;
      }

      return { ok: true, text: data.message?.content ?? "", model };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(`[ollama-chat] ${model} failed: ${lastError.slice(0, 100)}`);
      if (isRetryableOllamaError(lastError)) continue;
      break;
    }
  }

  return {
    ok: false,
    error:
      `Chat failed with Ollama (tried: ${tried.join(", ")}). ` +
      `Ensure Ollama is running and run "ollama pull llama3.2".`,
  };
}
