# Knowledge base setup (Supabase + local embeddings)

This connects Krishi AI to a real knowledge base built from ICAR, TNAU, IMD, SHCP, KVK and PPQS documents.

```
ingest/ (Python)                                     Next.js app
crawl → parse → chunk → tag → embeddings (bge-m3) →  POST /api/rag
                                   Supabase pgvector ← embed question (same model)
                                                     ← hybrid_search (vector + keyword)
                                                     → answer (Gemini by default, JSON) → citation + dose checks
```

Providers are configurable in `.env.local`:

| Setting | Options | Default |
|---|---|---|
| `EMBED_PROVIDER` | `ollama` (local, free, no rate limits), `gemini`, `openrouter` | `ollama` with `bge-m3` (multilingual, 1024 dims) |
| `CHAT_PROVIDER` | `gemini`, `ollama` (local, slow on CPU), `openrouter` | `gemini` with `gemini-3.5-flash-lite` |

The embedding provider and model must be the same for ingestion and for search. The ingester refuses to mix models in one database.

Already built in the repo:

| Piece | Location |
|---|---|
| Database schema and `hybrid_search` function | `supabase/migrations/20261112000000_rag_knowledge_base.sql` |
| Ingestion pipeline | `ingest/` (`python -m ingest.run`) |
| Retrieval check | `ingest/eval/run_eval.py` |
| API route | `src/app/api/rag/route.ts` → `src/lib/server/` |
| App switch | `NEXT_PUBLIC_RAG_PROVIDER=supabase` |

## Steps to do yourself

### 1. Create the Supabase project
1. Create a project at supabase.com. Choose the Mumbai region for lower latency in India.
2. Apply the migrations **in order**, either way works:
   - **SQL Editor:** paste and run `supabase/migrations/20261112000000_rag_knowledge_base.sql`, then `supabase/migrations/20261113000000_embedding_dim_1024.sql`.
   - **CLI:** `npx supabase login`, `npx supabase link --project-ref <your-ref>`, `npx supabase db push`.
3. Check that the tables `documents` and `chunks` exist and that RLS shows as enabled on both.

### 2. Install the local embedding model
```bash
ollama pull bge-m3
```
Ollama must be running (`ollama serve`, or the desktop app) whenever you ingest or the app answers questions.

### 2b. Collect the keys
- **Supabase:** Project Settings → API → copy the Project URL and the `service_role` key (newer projects call it the *secret* key). This key bypasses row-level security: keep it server-side only.
- **Gemini (for answers):** create a key at Google AI Studio. Answer generation has its own free-tier limits, separate from embeddings.

### 3. Configure the environment
```bash
cp .env.example .env.local
```
Fill in `GEMINI_API_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and keep `EMBED_PROVIDER=ollama`. Leave `NEXT_PUBLIC_RAG_PROVIDER=demo` until the corpus is loaded.

### 4. Set up Python
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r ingest/requirements.txt
```
**OCR for Tamil, Hindi and Telugu PDFs (strongly recommended).** PDF text layers often lose Indic characters, so the pipeline OCRs Indic PDFs when Tesseract is installed:
```bash
sudo apt install tesseract-ocr tesseract-ocr-hin tesseract-ocr-tam tesseract-ocr-tel
pip install pytesseract
```

### 5. Build your source list
```bash
cp ingest/sources.example.yaml ingest/sources.yaml
```
Add one entry per page or PDF. Before adding a site, read its terms of use and robots.txt. The fetcher obeys robots.txt and waits 2 seconds between requests to a host. For sites that block automated downloads, save the PDF manually under `ingest/data/manual/` and set `path:`.

Where to look (verify each document yourself):

| Source | Starting point | What to take |
|---|---|---|
| TNAU | agritech.tnau.ac.in | Crop production, nutrient management and crop protection pages (English and Tamil) |
| ICAR | icar.org.in and institute sites (IIWBR, NRRI, IISS, IIMR, ...) | Package-of-practices guides, technical bulletins |
| PPQS | ppqs.gov.in | CIB&RC major uses of registered pesticides, IPM packages. **The only source for pesticide doses** |
| SHCP | soilhealth.dac.gov.in | Rating thresholds and soil-test-based recommendation guidance |
| IMD | mausam.imd.gov.in (Agromet Advisory Services) | District agromet bulletins; set `valid_until` |
| KVK | district KVK sites, ICAR-ATARI | District advisories, contingency plans |

Start small: about 20 documents for wheat, paddy, maize and groundnut in Tamil Nadu.

### 6. Dry run (no keys or cost)
```bash
python -m ingest.run --manifest ingest/sources.yaml --dry-run
```
Open the previews in `ingest/data/preview/*.jsonl` and check:
- Chunks read cleanly (no menus or footers, no garbled Tamil or Hindi).
- Dose tables are whole.
- `crop` and `topic` tags look right. If not, set `crop:` / `topic:` on that manifest entry.

Remove the example.org sample entry once you have real sources.

### 7. Ingest for real
```bash
python -m ingest.run --manifest ingest/sources.yaml
```
Unchanged documents are skipped on later runs. Use `--force` to re-embed, `--refresh` to re-download, and `--only TNAU` to run one source.

### 8. Check retrieval
```bash
cp ingest/eval/questions.example.jsonl ingest/eval/questions.jsonl
python -m ingest.eval.run_eval --questions ingest/eval/questions.jsonl
```
Replace the example questions with 50+ written and checked by an agronomist, in all four languages. Aim for most questions to be hits before switching the app over.

### 9. Switch the app to the knowledge base
In `.env.local` set `NEXT_PUBLIC_RAG_PROVIDER=supabase`, then restart `npm run dev`. `NEXT_PUBLIC_` values are read at build time, so a running server won't pick up the change.

Test the API directly:
```bash
curl -s localhost:3000/api/rag -H 'content-type: application/json' \
  -d '{"query":"How much nitrogen should I apply to wheat at tillering?","lang":"en","crop":"wheat"}'
```
In Krishi AI, answers now show sources with a **View source** link to the original document.

### 10. Keep it fresh
Schedule ingestion with cron or GitHub Actions:
- IMD bulletins: twice a week, with a new manifest entry and `valid_until` per bulletin.
- KVK advisories: weekly.
- ICAR, TNAU, PPQS: monthly with `--refresh`.

### 11. Deploying
Set the same variables in your hosting provider's environment settings, for example Vercel → Project → Settings → Environment Variables. Only `NEXT_PUBLIC_*` values may be exposed to the browser.

Hosted platforms such as Vercel can't run Ollama, but every question must be embedded with the same `bge-m3` model used for ingestion. Point `OLLAMA_URL` at a server running Ollama, or host `bge-m3` elsewhere (for example Cloudflare Workers AI or Hugging Face) behind the same interface.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `/api/rag` returns 503 `not_configured` | A key is missing from `.env.local`, or the server wasn't restarted |
| App still shows demo answers | `NEXT_PUBLIC_RAG_PROVIDER` isn't `supabase`, or the server wasn't restarted; check the browser console for a fallback warning |
| `permission denied for function hybrid_search` | You used the anon key; use the service_role key |
| `returned N dimensions; the database expects 1024` | The embedding model's output size differs; use `bge-m3`, or a model/provider that supports 1024 dimensions |
| `Can't reach Ollama` / model not found | Start Ollama (`ollama serve`) and run `ollama pull bge-m3` |
| `contains chunks embedded with ...` | The tables hold vectors from another model; clear them (below) before re-ingesting |
| Gemini 429 during ingestion | Free-tier limit of 30,000 tokens/minute; use `EMBED_PROVIDER=ollama`, or set `EMBED_TOKENS_PER_MINUTE=25000` |
| Model not found (404) | Update `GEMINI_EMBED_MODEL` / `GEMINI_CHAT_MODEL` to a model your key can access |
| `no usable text found` | Scanned PDF: install Tesseract (step 4) |
| Garbled Tamil or Hindi in previews | Same as above: OCR fixes broken PDF text layers |
| Answer says "check the product label" instead of a dose | Working as intended: pesticide doses need a cited PPQS passage. Add the PPQS document |

## Changing the embedding model later
The provider, model and dimension are stored on every chunk (`embed_model`, e.g. `ollama:bge-m3@1024`). To switch models:
1. Clear the tables in the Supabase SQL Editor: `delete from documents;` (chunks are removed with them).
2. Update `EMBED_PROVIDER` / `EMBED_MODEL`. If the new model's size isn't 1024, the column and `EMBED_DIM` must change too (write a migration like `20261113000000_embedding_dim_1024.sql`).
3. Run `python -m ingest.run` again.
