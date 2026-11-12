import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RagConfig } from "./config";

let client: SupabaseClient | null = null;

/** Service-role client: bypasses RLS. Server use only. */
export function supabaseAdmin(cfg: RagConfig): SupabaseClient {
  client ??= createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export interface Passage {
  id: number;
  content: string;
  heading: string | null;
  crop: string | null;
  topic: string | null;
  state: string | null;
  language: string;
  source: string; // ICAR | TNAU | IMD | SHCP | KVK | PPQS
  title: string;
  url: string;
  similarity: number;
  score: number;
}

export async function hybridSearch(
  cfg: RagConfig,
  args: { queryText: string; queryEmbedding: number[]; matchCount?: number; crop?: string; state?: string },
): Promise<Passage[]> {
  const { data, error } = await supabaseAdmin(cfg).rpc("hybrid_search", {
    query_text: args.queryText,
    query_embedding: args.queryEmbedding,
    match_count: args.matchCount ?? 5,
    filter_crop: args.crop ?? null,
    filter_state: args.state ?? null,
  });
  if (error) throw new Error(`hybrid_search failed: ${error.message}`);
  return (data ?? []) as Passage[];
}
