import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Tried in order — first one that succeeds wins.
// Names verified against /api/gemini-check — update if models are added/removed.
const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

// Errors that are worth retrying with a different model
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

function friendlyError(raw: string, triedModels: string[]): string {
  const tried = triedModels.join(", ");
  if (raw.includes("429") || raw.includes("quota") || raw.includes("RESOURCE_EXHAUSTED")) {
    return `All models hit quota limits (tried: ${tried}). Enable billing at console.cloud.google.com or wait for the daily limit to reset.`;
  }
  if (raw.includes("404") || raw.includes("not found")) {
    return `No available models responded (tried: ${tried}). Check ai.google.dev for current model names.`;
  }
  if (raw.includes("403") || raw.includes("API_KEY")) {
    return "Invalid or missing Gemini API key. Check GEMINI_API_KEY in .env.local.";
  }
  return `Generation failed after trying ${triedModels.length} model(s) (${tried}): ${raw}`;
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set. Add it to .env.local to enable GreenLeaf AI insights." },
      { status: 503 },
    );
  }

  const { prompt } = await req.json();
  const genai = new GoogleGenerativeAI(key);

  const triedModels: string[] = [];
  let lastError = "Unknown error";

  for (const modelName of MODEL_FALLBACK_CHAIN) {
    triedModels.push(modelName);
    try {
      const model = genai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      // Return which model actually answered (useful for debugging)
      return NextResponse.json({ text, model: modelName });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(`[gemini] ${modelName} failed: ${lastError.slice(0, 120)}`);
      if (!isRetryable(lastError)) {
        // Non-retryable (e.g. bad API key, malformed request) — stop immediately
        break;
      }
      // Retryable — try the next model
    }
  }

  return NextResponse.json(
    { error: friendlyError(lastError, triedModels) },
    { status: 500 },
  );
}
