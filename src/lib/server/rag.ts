import { FALLBACK_ANSWER } from "@/data/knowledge-base";
import type { Language, RagAnswer, RagRequest } from "@/lib/types";
import { getRagConfig, type RagConfig } from "./config";
import { embedQuery, generateJson } from "./providers";
import { enforcePesticideRule, finaliseCitations, normaliseBullets } from "./rag-postprocess";
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
  additionalProperties: false,
};

const GENERAL_INSTRUCTION = `You are Krishi AI, a practical agricultural advisor for Indian farmers.
Answer from general, widely accepted agronomic practice for Indian conditions.

Rules:
- Give safe, practical, conservative advice. Prefer cultural, mechanical and integrated (IPM / INM) practices.
- Never give pesticide, fungicide or herbicide doses. Name the pest or problem and say to follow the product label or ask the local Krishi Vigyan Kendra (KVK) for the approved product and dose.
- Fertilizer advice should be general (e.g. split nitrogen, follow soil test) unless a figure is standard and well established; include units.
- Do not mention documents, sources, databases or any system limitations. Just answer helpfully.
- Be concise: a short opening sentence, then up to 5 bullet points starting with "- ".
- Write the answer and follow-up questions in the language requested.`;

const GENERAL_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string", description: "Markdown answer." },
    followUps: { type: "array", items: { type: "string" }, description: "2-3 short follow-up questions." },
  },
  required: ["answer", "followUps"],
  additionalProperties: false,
};

const FALLBACK_FOLLOW_UPS = ["How much nitrogen does wheat need?", "How do I fix acidic soil?", "Upload my Soil Health Card"];

/** Last resort when no model is reachable: a neutral, helpful message. */
function staticFallback(lang: Language): RagAnswer {
  return { text: FALLBACK_ANSWER[lang], citations: [], followUps: FALLBACK_FOLLOW_UPS, grounded: false, mode: "general", backend: "knowledge-base" };
}

const cleanFollowUps = (v: unknown) => (Array.isArray(v) ? v.filter((f): f is string => typeof f === "string" && !!f.trim()).slice(0, 3) : []);

/**
 * General answer from the chat model when the knowledge base doesn't cover the
 * question. No sources, so the pesticide rule removes any dose.
 */
async function generalAnswer(cfg: RagConfig, req: RagRequest): Promise<RagAnswer> {
  try {
    const prompt = `Answer language: ${LANGUAGE_NAME[req.lang]}\n${req.crop ? `Crop: ${req.crop}\n` : ""}${req.state ? `Region: ${req.state}\n` : ""}\nQuestion: ${req.query}`;
    const parsed = await generateParsed(cfg, prompt, GENERAL_INSTRUCTION, GENERAL_SCHEMA);
    const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
    if (!answer) return staticFallback(req.lang);
    const safe = enforcePesticideRule(normaliseBullets(answer.replace(/\s?\[\d+\]/g, "")), [], req.lang);
    const followUps = cleanFollowUps(parsed.followUps);
    return { text: safe.text, citations: [], followUps: followUps.length ? followUps : FALLBACK_FOLLOW_UPS, grounded: false, mode: "general", backend: "knowledge-base" };
  } catch (err) {
    console.error("[rag] general answer failed:", err);
    return staticFallback(req.lang);
  }
}

function buildPrompt(req: RagRequest, passages: Passage[]) {
  const blocks = passages.map((p, i) => {
    const where = [p.source, p.title, p.heading].filter(Boolean).join(" · ");
    return `[${i + 1}] (${where})\n${p.content}`;
  });
  return `Answer language: ${LANGUAGE_NAME[req.lang]}\n\nQuestion: ${req.query}\n\nPassages:\n\n${blocks.join("\n\n---\n\n")}`;
}

/* ---------- Pipeline ---------- */

type ModelJson = { answer?: unknown; citations?: unknown; followUps?: unknown; grounded?: unknown };

/** Some models wrap JSON in ``` fences or add a sentence around it. */
function parseModelJson(raw: string): ModelJson {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = fenced ? fenced[1] : raw;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
}

async function generateParsed(cfg: RagConfig, prompt: string, instruction = SYSTEM_INSTRUCTION, schema: object = RESPONSE_SCHEMA): Promise<ModelJson> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await generateJson(cfg, instruction, prompt, schema);
    try {
      return parseModelJson(raw);
    } catch {
      if (attempt === 2) throw new Error(`${cfg.chatProvider} returned invalid JSON twice`);
    }
  }
  throw new Error("unreachable");
}

export async function answerQuestion(req: RagRequest): Promise<RagAnswer> {
  const cfg = getRagConfig();

  // 1. Retrieve. If the knowledge base is unreachable, answer generally instead of failing.
  let passages: Passage[] = [];
  try {
    const embedding = await embedQuery(cfg, req.query);
    passages = await hybridSearch(cfg, { queryText: req.query, queryEmbedding: embedding, matchCount: 5, crop: req.crop, state: req.state });
  } catch (err) {
    console.error("[rag] retrieval failed, using general answer:", err);
    return generalAnswer(cfg, req);
  }
  if (!passages.length) return generalAnswer(cfg, req);

  // 2. Grounded answer from the passages.
  let parsed: ModelJson;
  try {
    parsed = await generateParsed(cfg, buildPrompt(req, passages));
  } catch (err) {
    console.error("[rag] grounded generation failed, using general answer:", err);
    return generalAnswer(cfg, req);
  }
  const answer = typeof parsed.answer === "string" ? parsed.answer : "";
  const declared = Array.isArray(parsed.citations) ? parsed.citations.map(Number) : [];
  const followUps = cleanFollowUps(parsed.followUps);

  if (parsed.grounded === false || !answer.trim()) return generalAnswer(cfg, req);

  const safe = enforcePesticideRule(normaliseBullets(answer), passages, req.lang);
  const { text, citations } = finaliseCitations(safe.text, declared, passages);
  if (!citations.length) return generalAnswer(cfg, req); // never show an uncited answer as verified

  return { text, citations, followUps, grounded: true, mode: "grounded", backend: "knowledge-base" };
}
