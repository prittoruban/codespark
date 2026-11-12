"""Settings shared by the ingestion scripts. Values come from .env.local / .env at the repo root."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(__file__).resolve().parent / "data"
RAW_DIR = DATA_DIR / "raw"
PREVIEW_DIR = DATA_DIR / "preview"

# Later files do not override earlier ones: .env.local wins over .env.
load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

# Bump when parsing or chunking changes, so every document is re-embedded.
PIPELINE_VERSION = "1"

# pgvector HNSW indexes support at most 2000 dimensions; the SQL schema is vector(1024).
# Must match supabase/migrations and src/lib/server/config.ts.
EMBED_DIM = 1024

DEFAULT_EMBED_MODELS = {"ollama": "bge-m3", "gemini": "gemini-embedding-001", "openrouter": "openai/text-embedding-3-small"}

USER_AGENT = "AGRENSE-KnowledgeBot/0.1 (agricultural advisory research; respects robots.txt)"
REQUEST_DELAY_SECONDS = 2.0


@dataclass(frozen=True)
class Settings:
    embed_provider: str  # ollama | gemini | openrouter
    embed_model: str
    ollama_url: str
    gemini_api_key: str
    openrouter_api_key: str
    embed_tokens_per_minute: int  # pacing for cloud providers (0 = no pacing)
    supabase_url: str
    supabase_key: str

    @property
    def embed_model_tag(self) -> str:
        return f"{self.embed_provider}:{self.embed_model}@{EMBED_DIM}"


def load_settings(require_keys: bool = True) -> Settings:
    provider = os.getenv("EMBED_PROVIDER", "ollama").lower()
    if provider not in DEFAULT_EMBED_MODELS:
        raise SystemExit(f"EMBED_PROVIDER must be one of {sorted(DEFAULT_EMBED_MODELS)}, got {provider!r}")
    settings = Settings(
        embed_provider=provider,
        embed_model=os.getenv("EMBED_MODEL") or DEFAULT_EMBED_MODELS[provider],
        ollama_url=os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/"),
        gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY", ""),
        embed_tokens_per_minute=int(os.getenv("EMBED_TOKENS_PER_MINUTE", "25000" if provider == "gemini" else "0")),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
    )
    if require_keys:
        needed = [("SUPABASE_URL", settings.supabase_url), ("SUPABASE_SERVICE_ROLE_KEY", settings.supabase_key)]
        if provider == "gemini":
            needed.append(("GEMINI_API_KEY", settings.gemini_api_key))
        if provider == "openrouter":
            needed.append(("OPENROUTER_API_KEY", settings.openrouter_api_key))
        missing = [name for name, value in needed if not value]
        if missing:
            raise SystemExit(f"Missing environment variables: {', '.join(missing)}. Copy .env.example to .env.local and fill them in.")
    dim = os.getenv("EMBED_DIM")
    if dim and int(dim) != EMBED_DIM:
        raise SystemExit(f"EMBED_DIM={dim} but the database schema stores vector({EMBED_DIM}). Keep them equal.")
    return settings
