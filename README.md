# HARVEST ZERO · AGRENSE frontend

AI-powered multilingual agricultural advisory and sustainable fertilizer optimization. This is the frontend phase: every module is fully interactive, backed by mock services that sit behind typed interfaces.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Recharts and Lucide. The visual language follows the AGRENSE design skill and its reference image (`.claude/skills/agrense-design/`).

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Modules

| # | Module | Route | What works now |
|---|--------|-------|----------------|
| 1 | AI Advisory Chatbot (RAG) | `/krishi-ai` | Retrieval over an 11-document agronomy corpus, cited answers, follow-ups, tool chips, feedback, copy, `?q=` deep links |
| 2 | Soil Health Card OCR | `/soil` | Upload (image/PDF) or sample card, staged extraction pipeline, 12 structured parameters with confidence, inline correction, deficiency insights, history chart, JSON export, hand-off to the optimizer |
| 3 | Fertilizer Recommendation Engine | `/fertilizer` | Real computation: RDF × target-yield × soil-rating × OC adjustments → products, bags, split schedule, cost vs blanket dose, N₂O impact (IPCC Tier 1), model vs guideline labelling, weather-aware timing, CSV export |
| 4 | Real-Time Weather | `/weather` | Current conditions, 24 h and 7-day forecasts, rainfall, field advisories, fertilizer application windows. Simulated by default; live via Open-Meteo |
| 5 | Smart Tool-Routing Agent | `/agent` | Intent classification, entity extraction, ordered tool plan, step-by-step execution trace, grounded synthesis. The same router powers Krishi AI |
| 6 | Multilingual Voice Assistant | `/voice` (+ mic in chat) | English, Hindi, Tamil, Telugu. Web Speech API for speech in/out, with a labelled simulated fallback when the browser can't recognise speech |
| 7 | Crop Disease Detection | `/crop-doctor` | On-device colour segmentation (real) finds lesion hotspots and affected area. Classification across 14 diseases / 5 crops is simulated. Treatment tabs: organic, chemical, prevention |

Also included: Overview dashboard, My Farms, Reports, Knowledge Library, global search, notifications, language switcher, responsive layouts (sidebar → icon rail → bottom nav).

## Replacing mocks with real backends

All UI talks to services through `src/services/index.ts`. Swap an implementation there and keep the interface:

| Service | File | Replace with |
|---------|------|--------------|
| `ragService` | `services/rag.ts` | Embeddings + vector search + LLM generation returning `Citation[]` |
| `ocrService` | `services/ocr.ts` | OCR/layout model that returns a `SoilReport` |
| `fertilizerService` | `services/fertilizer.ts` | ML recommendation API that returns a `FertilizerPlan` |
| `weatherService` | `services/weather.ts` | Set `NEXT_PUBLIC_WEATHER_PROVIDER=open-meteo` for live data, or add your provider |
| `agent.route / executeStep` | `services/agent.ts` | LLM function-calling planner using the same `ToolName` contract |
| `listen / speak` | `services/voice.ts` | Server ASR/TTS (e.g. Bhashini) |
| `detectDisease` | `services/disease.ts` | CNN/ViT inference endpoint returning a `DiseaseResult` |

Shared domain types live in `src/lib/types.ts`. Values that are simulated carry a dashed **Demo data** tag in the UI.

## Structure

```
src/
  app/                 routes (one folder per module)
  components/
    layout/            AppShell, Sidebar, Header, MobileNav
    ui/                Card, Button, Badge, Field, Dropzone, Markdown, Progress, Toaster
    dashboard/ chat/ weather/ charts/
  services/            mock services + registry (index.ts)
  data/                demo farms and the knowledge corpus
  lib/                 types, i18n, app state, hooks, utils
public/images          agricultural photography (Unsplash License)
public/samples         sample Soil Health Card and illustrated leaf samples
```

Design tokens are CSS variables in `src/app/globals.css` and are exposed to Tailwind as `bg-olive`, `text-muted`, `border-line` and so on.
