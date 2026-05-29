import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    );
    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ status: res.status, error: json }, { status: res.status });
    }
    // Return just the model names that support generateContent
    const models = (json.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes("generateContent"),
      )
      .map((m: { name: string }) => m.name);
    return NextResponse.json({ ok: true, generateContentModels: models });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
