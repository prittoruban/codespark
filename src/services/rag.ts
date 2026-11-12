import { FALLBACK_ANSWER, KNOWLEDGE_BASE, type KnowledgeChunk } from "@/data/knowledge-base";
import type { Citation, Language } from "@/lib/types";
import { round } from "@/lib/utils";

/**
 * Retrieval-augmented generation service.
 * The mock uses keyword and term-overlap scoring over the bundled corpus and
 * returns the pre-written grounded answer for the best chunk. In production:
 * embed the query → vector search → rerank → LLM generation with citations.
 */
export interface RagService {
  retrieve(query: string, k?: number): RetrievedChunk[];
  answer(query: string, lang: Language): { text: string; citations: Citation[]; followUps: string[]; grounded: boolean };
}

export interface RetrievedChunk {
  chunk: KnowledgeChunk;
  score: number;
}

const STOP = new Set(["the", "a", "an", "is", "to", "of", "in", "my", "i", "and", "for", "what", "how", "should", "do", "it", "on", "at", "much", "can", "with", "this", "that", "are", "be", "when", "which"]);

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));

function score(query: string, chunk: KnowledgeChunk) {
  const q = query.toLowerCase();
  const qTokens = new Set(tokenize(query));
  let s = 0;
  for (const kw of chunk.keywords) {
    if (!q.includes(kw.toLowerCase())) continue;
    // Regional-language aliases are precise topic words, so weight them like long English terms.
    s += /[^\x00-\x7F]/.test(kw) || kw.length > 4 ? 3 : 2;
  }
  const body = new Set(tokenize(chunk.text + " " + chunk.title));
  for (const t of qTokens) if (body.has(t)) s += 1;
  return s;
}

export const mockRagService: RagService = {
  retrieve(query, k = 3) {
    return KNOWLEDGE_BASE.map((chunk) => ({ chunk, score: score(query, chunk) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  },
  answer(query, lang) {
    const hits = this.retrieve(query);
    const top = hits[0];
    if (!top || top.score < 3) {
      return { text: FALLBACK_ANSWER[lang], citations: [], followUps: ["How much nitrogen does wheat need?", "How do I fix acidic soil?", "Upload my Soil Health Card"], grounded: false };
    }
    const max = top.score;
    const citations: Citation[] = hits
      .filter((h) => h.score >= max * 0.4)
      .map((h) => ({ id: h.chunk.id, title: h.chunk.title, source: h.chunk.source, snippet: h.chunk.text, score: round(Math.min(0.98, 0.55 + (h.score / (max + 2)) * 0.45), 2) }));
    return { text: top.chunk.answer[lang], citations, followUps: top.chunk.followUps, grounded: true };
  },
};
