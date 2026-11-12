/**
 * Post-processing of Gemini answers: pure functions, no I/O (unit-tested).
 * - Pesticide doses must be backed by a cited PPQS passage, or they are replaced with a label note.
 * - Citation markers are validated against the retrieved passages and renumbered 1..n.
 */
import type { Citation, Language } from "@/lib/types";
import type { Passage } from "./supabase";

const LABEL_NOTE: Record<Language, string> = {
  en: "Check the product label or your local KVK for the approved dose.",
  hi: "स्वीकृत मात्रा के लिए उत्पाद लेबल देखें या अपने नज़दीकी KVK से पूछें।",
  ta: "அங்கீகரிக்கப்பட்ட அளவுக்கு தயாரிப்பு லேபிளைப் பார்க்கவும் அல்லது அருகிலுள்ள KVK-ஐ அணுகவும்.",
  te: "ఆమోదించిన మోతాదు కోసం ఉత్పత్తి లేబుల్ చూడండి లేదా మీ దగ్గరి KVK ను సంప్రదించండి.",
};

/* ---------- Safety: pesticide doses must be backed by a cited PPQS passage ---------- */

const DOSE = /\d+(?:\.\d+)?\s*(?:ml|g|gm|kg|l|litre|liter)\s*(?:\/|per)\s*(?:l|litre|liter|ha|hectare|acre|kg)\b/i;
const PESTICIDE_HINT = /\b(?:EC|SC|WP|WG|WDG|SL|SP|CS|ZC|insecticide|fungicide|herbicide|pesticide|spray)\b|(?:azole|thrin|carb|chlor|phos|mectin|toram|zeb|metrozine|imid|cypermethrin)/i;

export function enforcePesticideRule(text: string, passages: Passage[], lang: Language) {
  let removed = 0;
  const lines = text.split("\n").map((line) => {
    // Sentence-level within a line (bullets are single lines).
    const sentences = line.split(/(?<=[.!?।])\s+/);
    return sentences
      .map((s) => {
        if (!DOSE.test(s) || !PESTICIDE_HINT.test(s)) return s;
        const cited = [...s.matchAll(/\[(\d+)\]/g)].map((m) => passages[Number(m[1]) - 1]).filter(Boolean);
        const doses = s.match(new RegExp(DOSE.source, "gi")) ?? [];
        const numbers = doses.flatMap((d) => d.match(/\d+(?:\.\d+)?/g) ?? []);
        const backed = cited.some((p) => p.source === "PPQS" && numbers.every((n) => p.content.includes(n)));
        if (backed) return s;
        removed++;
        return (s.trimStart().startsWith("- ") ? "- " : "") + LABEL_NOTE[lang];
      })
      .join(" ");
  });
  return { text: lines.join("\n"), removed };
}

/* ---------- Citations: keep only valid markers, renumber 1..n in order of use ---------- */

export function finaliseCitations(answer: string, declared: number[], passages: Passage[]) {
  const valid = (n: number) => Number.isInteger(n) && n >= 1 && n <= passages.length;
  const order: number[] = [];
  for (const m of answer.matchAll(/\[(\d+)\]/g)) {
    const n = Number(m[1]);
    if (valid(n) && !order.includes(n)) order.push(n);
  }
  for (const n of declared) if (valid(n) && !order.includes(n)) order.push(n);

  const renumber = new Map(order.map((n, i) => [n, i + 1]));
  const text = answer.replace(/\s?\[(\d+)\]/g, (match, d) => (renumber.has(Number(d)) ? ` [${renumber.get(Number(d))}]` : ""));
  const citations: Citation[] = order.map((n) => {
    const p = passages[n - 1];
    return {
      id: String(p.id),
      title: p.heading ? `${p.title} · ${p.heading.split(" › ").pop()}` : p.title,
      source: p.source,
      url: p.url,
      snippet: p.content.length > 420 ? `${p.content.slice(0, 420).trimEnd()}…` : p.content,
      score: Math.round(Math.max(0, Math.min(1, p.similarity)) * 100) / 100,
    };
  });
  return { text: text.trim(), citations };
}

