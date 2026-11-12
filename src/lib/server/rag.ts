import { FALLBACK_ANSWER } from "@/data/knowledge-base";
import type { Language, RagAnswer, RagRequest } from "@/lib/types";
import { getRagConfig } from "./config";
import { embedQuery, generateJson } from "./gemini";
import { enforcePesticideRule, finaliseCitations } from "./rag-postprocess";
import { hybridSearch, type Passage } from "./supabase";

const LANGUAGE_NAME: Record<Language, string> = { en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu" };

const SYSTEM_INSTRUCTION = `You are Krishi AI, an agricultural advisor for Indian farmers.

Rules:
- Answer ONLY from the numbered passages provided. Do not use outside knowledge.
- Put the passage number in square brackets after every factual sentence, e.g. "Apply 25 kg/ha zinc sulphate [2]."
- Include units for every dose, rate or quantity (kg/ha, ml/L, g/L, days after sowing).
- Pesticide, fungicide and herbicide doses may come ONLY from passages whose source is PPQS. If no PPQS passage gives the dose, say the farmer should follow the product label or ask their local KVK, and give no number.
- If the passages do not answer the question, set "grounded" to false and keep "answer" to one short sentence.
- Be concise and practical: a short opening sentence, then up to 5 bullet points starting with "- ".
- Write the answer and follow-up questions in the language requested.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string", description: "Markdown answer with [n] passage markers." },
    citations: { type: "array", items: { type: "integer" }, description: "Passage numbers used." },
    followUps: { type: "array", items: { type: "string" }, description: "2-3 short follow-up questions." },
    grounded: { type: "boolean", description: "False if the passages do not answer the question." },
  },
  required: ["answer", "citations", "followUps", "grounded"],
};

const FALLBACK_FOLLOW_UPS = ["How much nitrogen does wheat need?", "How do I fix acidic soil?", "Upload my Soil Health Card"];

function fallback(lang: Language): RagAnswer {
  return { text: FALLBACK_ANSWER[lang], citations: [], followUps: FALLBACK_FOLLOW_UPS, grounded: false, backend: "knowledge-base" };
}

function buildPrompt(req: RagRequest, passages: Passage[]) {
  const blocks = passages.map((p, i) => {
    const where = [p.source, p.title, p.heading].filter(Boolean).join(" · ");
    return `[${i + 1}] (${where})\n${p.content}`;
  });
  return `Answer language: ${LANGUAGE_NAME[req.lang]}\n\nQuestion: ${req.query}\n\nPassages:\n\n${blocks.join("\n\n---\n\n")}`;
}

/* ---------- Pipeline ---------- */

export async function answerQuestion(req: RagRequest): Promise<RagAnswer> {
  const cfg = getRagConfig();
  const embedding = await embedQuery(cfg, req.query);
  const passages = await hybridSearch(cfg, { queryText: req.query, queryEmbedding: embedding, matchCount: 5, crop: req.crop, state: req.state });
  if (!passages.length) return fallback(req.lang);

  const raw = await generateJson(cfg, SYSTEM_INSTRUCTION, buildPrompt(req, passages), RESPONSE_SCHEMA);
  let parsed: { answer?: unknown; citations?: unknown; followUps?: unknown; grounded?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }
  const answer = typeof parsed.answer === "string" ? parsed.answer : "";
  const declared = Array.isArray(parsed.citations) ? parsed.citations.map(Number) : [];
  const followUps = Array.isArray(parsed.followUps) ? parsed.followUps.filter((f): f is string => typeof f === "string" && !!f.trim()).slice(0, 3) : [];

  if (parsed.grounded === false || !answer.trim()) return { ...fallback(req.lang), followUps: followUps.length ? followUps : FALLBACK_FOLLOW_UPS };

  const safe = enforcePesticideRule(answer, passages, req.lang);
  const { text, citations } = finaliseCitations(safe.text, declared, passages);
  if (!citations.length) return fallback(req.lang); // never show an uncited answer

  return { text, citations, followUps, grounded: true, backend: "knowledge-base" };
}

