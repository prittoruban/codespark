import { GoogleGenAI } from "@google/genai";
import { EMBED_DIM, type RagConfig } from "./config";

let client: GoogleGenAI | null = null;
function gemini(cfg: RagConfig) {
  client ??= new GoogleGenAI({ apiKey: cfg.geminiApiKey });
  return client;
}

function normalise(v: number[]) {
  const norm = Math.hypot(...v);
  return norm ? v.map((x) => x / norm) : v;
}

/** Embeds a search query. Must use the same model and dimension as ingestion. */
export async function embedQuery(cfg: RagConfig, text: string): Promise<number[]> {
  const res = await gemini(cfg).models.embedContent({
    model: cfg.embedModel,
    contents: text,
    config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: EMBED_DIM },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values || values.length !== EMBED_DIM) {
    throw new Error(`Embedding model returned ${values?.length ?? 0} dimensions, expected ${EMBED_DIM}`);
  }
  return normalise(values);
}

/** Generates a JSON response that follows `schema`. Returns the raw JSON text. */
export async function generateJson(cfg: RagConfig, systemInstruction: string, prompt: string, schema: object): Promise<string> {
  const res = await gemini(cfg).models.generateContent({
    model: cfg.chatModel,
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
    },
  });
  const text = res.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}
