/**
 * Server-only configuration for the knowledge base. Never import this from a
 * client component: it reads secrets (service-role key, Gemini key).
 */

/** Must match vector(1536) in supabase/migrations and EMBED_DIM in ingest/config.py. */
export const EMBED_DIM = 1536;

export interface RagConfig {
  geminiApiKey: string;
  embedModel: string;
  chatModel: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
}

export class NotConfiguredError extends Error {
  constructor(public missing: string[]) {
    super(`Knowledge base is not configured. Missing: ${missing.join(", ")}`);
  }
}

export function getRagConfig(): RagConfig {
  const env = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
    SUPABASE_URL: process.env.SUPABASE_URL ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
  const missing = Object.entries(env)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) throw new NotConfiguredError(missing);

  const dim = process.env.GEMINI_EMBED_DIM;
  if (dim && Number(dim) !== EMBED_DIM) {
    throw new Error(`GEMINI_EMBED_DIM=${dim} but the database stores vector(${EMBED_DIM}).`);
  }

  return {
    geminiApiKey: env.GEMINI_API_KEY,
    embedModel: process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001",
    chatModel: process.env.GEMINI_CHAT_MODEL || "gemini-flash-latest",
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
