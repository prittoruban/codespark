/**
 * Embedding and chat providers for the knowledge base.
 * - Embeddings must use the SAME provider/model as ingestion (see ingest/embed.py).
 * - Chat returns raw JSON text matching the given schema; the caller validates it.
 */
import { GoogleGenAI } from "@google/genai";
import { EMBED_DIM, type RagConfig } from "./config";

function normalise(v: number[]) {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum);
  return norm ? v.map((x) => x / norm) : v;
}

function checkDim(v: number[] | undefined, model: string): number[] {
  if (!v || v.length !== EMBED_DIM) {
    throw new Error(`${model} returned ${v?.length ?? 0} dimensions, expected ${EMBED_DIM}`);
  }
  return normalise(v);
}

let gemini: GoogleGenAI | null = null;
const geminiClient = (cfg: RagConfig) => (gemini ??= new GoogleGenAI({ apiKey: cfg.geminiApiKey, httpOptions: { timeout: 25_000 } }));

async function postJson<T>(url: string, body: unknown, headers: Record<string, string> = {}, timeoutMs = 120_000): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${new URL(url).host} ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

const openrouterHeaders = (cfg: RagConfig) => ({ Authorization: `Bearer ${cfg.openrouterApiKey}`, "X-Title": "AGRENSE" });

/* ---------------------------------------------------------------- embeddings */

export async function embedQuery(cfg: RagConfig, text: string): Promise<number[]> {
  switch (cfg.embedProvider) {
    case "ollama": {
      const data = await postJson<{ embeddings: number[][] }>(`${cfg.ollamaUrl}/api/embed`, { model: cfg.embedModel, input: text, truncate: true }, {}, 60_000);
      return checkDim(data.embeddings?.[0], cfg.embedModel);
    }
    case "gemini": {
      const res = await geminiClient(cfg).models.embedContent({
        model: cfg.embedModel,
        contents: text,
        config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: EMBED_DIM },
      });
      return checkDim(res.embeddings?.[0]?.values, cfg.embedModel);
    }
    case "openrouter": {
      const data = await postJson<{ data: { embedding: number[] }[] }>(
        "https://openrouter.ai/api/v1/embeddings",
        { model: cfg.embedModel, input: text, dimensions: EMBED_DIM },
        openrouterHeaders(cfg),
      );
      return checkDim(data.data?.[0]?.embedding, cfg.embedModel);
    }
  }
}

/* ---------------------------------------------------------------- chat (JSON) */

/** Busy / rate-limited / timed-out errors are worth retrying or sending to a backup model. */
function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status && [408, 429, 500, 502, 503, 504].includes(status)) return true;
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /\b(408|429|500|502|503|504)\b|UNAVAILABLE|DEADLINE|RESOURCE_EXHAUSTED|high demand|timed? ?out|Timeout|aborted/i.test(msg);
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Generates JSON with the main chat model, retrying transient errors once and then
 * trying each fallback model in turn. Throws the last error if every model fails.
 */
export async function generateJson(cfg: RagConfig, systemInstruction: string, prompt: string, schema: object): Promise<string> {
  const models = [cfg.chatModel, ...cfg.chatFallbackModels.filter((m) => m !== cfg.chatModel)];
  let lastError: unknown;
  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await generateWith({ ...cfg, chatModel: model }, systemInstruction, prompt, schema);
      } catch (err) {
        lastError = err;
        if (!isTransient(err)) break; // e.g. bad model name: go straight to the next model
        console.warn(`[rag] ${cfg.chatProvider}:${model} transient error (attempt ${attempt}):`, err instanceof Error ? err.message.slice(0, 120) : err);
        if (attempt === 1) await pause(1500);
      }
    }
  }
  throw lastError;
}

async function generateWith(cfg: RagConfig, systemInstruction: string, prompt: string, schema: object): Promise<string> {
  switch (cfg.chatProvider) {
    case "gemini": {
      const res = await geminiClient(cfg).models.generateContent({
        model: cfg.chatModel,
        contents: prompt,
        config: { systemInstruction, temperature: 0.2, responseMimeType: "application/json", responseJsonSchema: schema },
      });
      if (!res.text) throw new Error("Gemini returned an empty response");
      return res.text;
    }
    case "ollama": {
      // Ollama structured outputs: pass the JSON schema as `format`.
      const data = await postJson<{ message?: { content?: string } }>(
        `${cfg.ollamaUrl}/api/chat`,
        {
          model: cfg.chatModel,
          stream: false,
          format: schema,
          options: { temperature: 0.2 },
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt },
          ],
        },
        {},
        300_000, // local CPU generation can be slow
      );
      if (!data.message?.content) throw new Error("Ollama returned an empty response");
      return data.message.content;
    }
    case "openrouter": {
      const data = await postJson<{ choices?: { message?: { content?: string } }[] }>(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: cfg.chatModel,
          temperature: 0.2,
          response_format: { type: "json_schema", json_schema: { name: "rag_answer", strict: true, schema } },
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt },
          ],
        },
        openrouterHeaders(cfg),
      );
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("OpenRouter returned an empty response");
      return content;
    }
  }
}
