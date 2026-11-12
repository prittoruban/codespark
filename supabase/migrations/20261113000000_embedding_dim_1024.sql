-- Switch embeddings from 1536 to 1024 dimensions (local bge-m3 via Ollama).
-- Vectors from different models can't be converted, so existing rows are removed;
-- re-run `python -m ingest.run` afterwards.

delete from public.documents;   -- cascades to chunks

drop function if exists public.hybrid_search(text, extensions.vector, int, text, text, int);
drop index if exists public.chunks_embedding_hnsw;

alter table public.chunks
  alter column embedding type extensions.vector(1024);

create index chunks_embedding_hnsw on public.chunks using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.hybrid_search(
  query_text text,
  query_embedding extensions.vector(1024),
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
