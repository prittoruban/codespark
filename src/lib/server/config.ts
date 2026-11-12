/**
 * Server-only configuration for the knowledge base. Never import this from a
 * client component: it reads secrets (service-role key, API keys).
 */

/** Must match vector(1024) in supabase/migrations and EMBED_DIM in ingest/config.py. */
export const EMBED_DIM = 1024;

export type EmbedProvider = "ollama" | "gemini" | "openrouter";
export type ChatProvider = "gemini" | "ollama" | "openrouter";

const DEFAULT_EMBED_MODEL: Record<EmbedProvider, string> = {
  ollama: "bge-m3",
  gemini: "gemini-embedding-001",
  openrouter: "openai/text-embedding-3-small",
};
const DEFAULT_CHAT_MODEL: Record<ChatProvider, string> = {
  gemini: "gemini-3.5-flash-lite",
  ollama: "llama3.1:8b",
  openrouter: "openai/gpt-4o-mini",
};

export interface RagConfig {
  embedProvider: EmbedProvider;
  embedModel: string;
  chatProvider: ChatProvider;
  chatModel: string;
  chatFallbackModels: string[]; // tried in order when the main chat model is busy or failing
  ollamaUrl: string;
  geminiApiKey: string;
  openrouterApiKey: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
}

export class NotConfiguredError extends Error {
  constructor(public missing: string[]) {
    super(`Knowledge base is not configured. Missing: ${missing.join(", ")}`);
  }
}

function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T, name: string): T {
  const v = (value || fallback).toLowerCase() as T;
  if (!allowed.includes(v)) throw new Error(`${name} must be one of ${allowed.join(", ")}`);
  return v;
}

export function getRagConfig(): RagConfig {
  const env = process.env;
  const embedProvider = pick<EmbedProvider>(env.EMBED_PROVIDER, ["ollama", "gemini", "openrouter"], "ollama", "EMBED_PROVIDER");
  const chatProvider = pick<ChatProvider>(env.CHAT_PROVIDER, ["gemini", "ollama", "openrouter"], "gemini", "CHAT_PROVIDER");

  const cfg: RagConfig = {
    embedProvider,
    embedModel: env.EMBED_MODEL || DEFAULT_EMBED_MODEL[embedProvider],
    chatProvider,
    // GEMINI_CHAT_MODEL is still honoured for existing .env.local files.
    chatModel: env.CHAT_MODEL || (chatProvider === "gemini" ? env.GEMINI_CHAT_MODEL : "") || DEFAULT_CHAT_MODEL[chatProvider],
    chatFallbackModels: (env.CHAT_FALLBACK_MODELS ?? (chatProvider === "gemini" ? "gemini-2.5-flash-lite,gemini-2.5-flash" : ""))
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean),
    ollamaUrl: (env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, ""),
    geminiApiKey: env.GEMINI_API_KEY ?? "",
    openrouterApiKey: env.OPENROUTER_API_KEY ?? "",
    supabaseUrl: env.SUPABASE_URL ?? "",
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };

  const required: [string, string][] = [
    ["SUPABASE_URL", cfg.supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", cfg.supabaseServiceKey],
  ];
  if (embedProvider === "gemini" || chatProvider === "gemini") required.push(["GEMINI_API_KEY", cfg.geminiApiKey]);
  if (embedProvider === "openrouter" || chatProvider === "openrouter") required.push(["OPENROUTER_API_KEY", cfg.openrouterApiKey]);
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new NotConfiguredError(missing);

  if (env.EMBED_DIM && Number(env.EMBED_DIM) !== EMBED_DIM) {
    throw new Error(`EMBED_DIM=${env.EMBED_DIM} but the database stores vector(${EMBED_DIM}).`);
  }
  return cfg;
}
