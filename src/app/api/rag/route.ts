import { NotConfiguredError } from "@/lib/server/config";
import { answerQuestion } from "@/lib/server/rag";
import type { Language, RagRequest } from "@/lib/types";
import { NextResponse } from "next/server";

const LANGS: Language[] = ["en", "hi", "ta", "te"];

/** POST /api/rag  { query, lang, crop?, state? }  →  RagAnswer */
export async function POST(request: Request) {
  let body: Partial<RagRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body: { query, lang }" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query || query.length > 1000) {
    return NextResponse.json({ error: "query must be 1–1000 characters" }, { status: 400 });
  }
  const lang = LANGS.includes(body.lang as Language) ? (body.lang as Language) : "en";
  const crop = typeof body.crop === "string" && body.crop ? body.crop.toLowerCase().slice(0, 40) : undefined;
  const state = typeof body.state === "string" && body.state ? body.state.slice(0, 60) : undefined;

  try {
    const answer = await answerQuestion({ query, lang, crop, state });
    return NextResponse.json(answer);
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return NextResponse.json({ error: err.message, code: "not_configured" }, { status: 503 });
    }
    console.error("[api/rag]", err);
    return NextResponse.json({ error: "The knowledge service is unavailable. Try again shortly.", code: "upstream_error" }, { status: 502 });
  }
}
