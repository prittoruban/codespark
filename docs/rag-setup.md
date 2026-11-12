# Knowledge base setup (Supabase + Gemini)

This connects Krishi AI to a real knowledge base built from ICAR, TNAU, IMD, SHCP, KVK and PPQS documents.

```
ingest/ (Python)                                    Next.js app
crawl → parse → chunk → tag → Gemini embeddings →   POST /api/rag
                                   Supabase pgvector ← embed question (Gemini)
                                                     ← hybrid_search (vector + keyword)
                                                     → Gemini answer (JSON) → citation + dose checks
```

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
2. Apply the migration, either way works:
   - **SQL Editor:** paste the contents of `supabase/migrations/20261112000000_rag_knowledge_base.sql` and run it.
   - **CLI:** `npx supabase login`, `npx supabase link --project-ref <your-ref>`, `npx supabase db push`.
3. Check that the tables `documents` and `chunks` exist and that RLS shows as enabled on both.

### 2. Collect the keys
- **Supabase:** Project Settings → API → copy the Project URL and the `service_role` key (newer projects call it the *secret* key). This key bypasses row-level security: keep it server-side only.
- **Gemini:** create a key at Google AI Studio. Check that your key can use the embedding model in `GEMINI_EMBED_MODEL` and note the free-tier rate limits.

### 3. Configure the environment
```bash
cp .env.example .env.local
```
Fill in `GEMINI_API_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Leave `NEXT_PUBLIC_RAG_PROVIDER=demo` until the corpus is loaded.

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

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `/api/rag` returns 503 `not_configured` | A key is missing from `.env.local`, or the server wasn't restarted |
| App still shows demo answers | `NEXT_PUBLIC_RAG_PROVIDER` isn't `supabase`, or the server wasn't restarted; check the browser console for a fallback warning |
| `permission denied for function hybrid_search` | You used the anon key; use the service_role key |
| `expected 1536 dimensions` | The embedding model doesn't support `outputDimensionality`; choose a Gemini embedding model that does |
| Model not found (404) | Update `GEMINI_EMBED_MODEL` / `GEMINI_CHAT_MODEL` to a model your key can access |
| `no usable text found` | Scanned PDF: install Tesseract (step 4) |
| Garbled Tamil or Hindi in previews | Same as above: OCR fixes broken PDF text layers |
| Gemini 429 errors | Rate limit; the ingester retries with backoff. Ingest in smaller batches with `--only` |
| Answer says "check the product label" instead of a dose | Working as intended: pesticide doses need a cited PPQS passage. Add the PPQS document |

## Changing the embedding model later
The model and dimension are stored on every chunk (`embed_model`). To switch models, update `GEMINI_EMBED_MODEL` and run `python -m ingest.run --force` so every chunk is re-embedded. Mixed models in one table return poor search results.
