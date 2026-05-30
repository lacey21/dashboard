import { NextResponse } from "next/server";
import { ensureOllamaReachable, ollamaGenerate } from "@/lib/ollama";

export async function POST(req: Request) {
  const unavailable = await ensureOllamaReachable();
  if (unavailable) return unavailable;

  const { prompt } = await req.json();

  const systemPrompt = `You are a precision agriculture advisor for a CEA operation.
Write a plain-English executive summary in exactly 3-4 sentences as a single paragraph (not bullet points).
Be specific with numbers from the data provided and highlight what needs attention first.
No preamble, no sign-off, no bullet lists.`;

  const result = await ollamaGenerate(`${systemPrompt}\n\n${prompt}`, {
    numPredict: 256,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ text: result.text, model: result.model });
}
