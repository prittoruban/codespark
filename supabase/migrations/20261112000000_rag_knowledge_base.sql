-- AGRENSE knowledge base for Krishi AI (RAG).
-- Vectors come from a Gemini embedding model at 1536 dimensions (normalised).
-- pgvector's HNSW index supports at most 2000 dims on `vector`, so never store 3072.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Source documents (one row per page / PDF)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id bigint generated always as identity primary key,
  source text not null check (source in ('ICAR', 'TNAU', 'IMD', 'SHCP', 'KVK', 'PPQS')),
  title text not null,
  url text not null unique,
  language text not null default 'en' check (language in ('en', 'hi', 'ta', 'te')),
  published_on date,
  content_hash text not null,            -- skip re-embedding unchanged documents
  fetched_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Retrievable passages
-- ---------------------------------------------------------------------------
create table if not exists public.chunks (
  id bigint generated always as identity primary key,
  document_id bigint not null references public.documents (id) on delete cascade,
  chunk_index int not null,
  heading text,
  content text not null,
  token_estimate int not null,
  crop text,                             -- lowercase, e.g. 'wheat'; null = applies to all crops
  topic text check (topic in ('fertilizer', 'pest', 'disease', 'irrigation', 'seeding', 'soil', 'weather', 'general')),
  state text,                            -- e.g. 'Tamil Nadu'; null = national
  district text,
  season text,
  language text not null default 'en',
  valid_until date,                      -- IMD bulletins expire
  embed_model text not null,             -- e.g. 'gemini-embedding-001@1536'
  embedding extensions.vector(1536) not null,
  fts tsvector generated always as (to_tsvector('simple', coalesce(heading, '') || ' ' || content)) stored,
  unique (document_id, chunk_index)
);

create index if not exists chunks_embedding_hnsw on public.chunks using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists chunks_fts_gin on public.chunks using gin (fts);
create index if not exists chunks_filters on public.chunks (crop, state, topic);

-- Server-only access: RLS on, no policies. The service-role key bypasses RLS;
-- the anon key can read nothing.
alter table public.documents enable row level security;
alter table public.chunks enable row level security;

-- ---------------------------------------------------------------------------
-- Hybrid search: vector similarity + keyword match, merged with
-- reciprocal rank fusion. Returns passages with their source document.
-- ---------------------------------------------------------------------------
create or replace function public.hybrid_search(
  query_text text,
  query_embedding extensions.vector(1536),
  match_count int default 5,
  filter_crop text default null,
  filter_state text default null,
  rrf_k int default 50
)
returns table (
  id bigint,
  content text,
  heading text,
  crop text,
  topic text,
  state text,
  language text,
  source text,
  title text,
  url text,
  similarity float,
  score float
)
language sql
stable
set search_path = public, extensions
as $$
  with semantic as (
    select c.id,
           1 - (c.embedding <=> query_embedding) as similarity,
           row_number() over (order by c.embedding <=> query_embedding) as rank_ix
    from chunks c
    where (filter_crop is null or c.crop = filter_crop or c.crop is null)
      and (filter_state is null or c.state = filter_state or c.state is null)
      and (c.valid_until is null or c.valid_until >= current_date)
    order by c.embedding <=> query_embedding
    limit match_count * 4
  ),
  keyword as (
    select c.id,
           row_number() over (order by ts_rank_cd(c.fts, websearch_to_tsquery('simple', query_text)) desc) as rank_ix
    from chunks c
    where c.fts @@ websearch_to_tsquery('simple', query_text)
      and (filter_crop is null or c.crop = filter_crop or c.crop is null)
      and (filter_state is null or c.state = filter_state or c.state is null)
      and (c.valid_until is null or c.valid_until >= current_date)
    order by ts_rank_cd(c.fts, websearch_to_tsquery('simple', query_text)) desc
    limit match_count * 4
  )
  select c.id, c.content, c.heading, c.crop, c.topic, c.state, c.language,
         d.source, d.title, d.url,
         coalesce(s.similarity, 0) as similarity,
         coalesce(1.0 / (rrf_k + s.rank_ix), 0) + coalesce(1.0 / (rrf_k + k.rank_ix), 0) as score
  from semantic s
  full outer join keyword k on s.id = k.id
  join chunks c on c.id = coalesce(s.id, k.id)
  join documents d on d.id = c.document_id
  order by score desc
  limit match_count;
$$;

revoke execute on function public.hybrid_search from public, anon, authenticated;
grant execute on function public.hybrid_search to service_role;
