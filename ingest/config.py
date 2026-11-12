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

# pgvector HNSW indexes support at most 2000 dimensions; the SQL schema is vector(1536).
EMBED_DIM = 1536

USER_AGENT = "AGRENSE-KnowledgeBot/0.1 (agricultural advisory research; respects robots.txt)"
REQUEST_DELAY_SECONDS = 2.0


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str
    embed_model: str
    supabase_url: str
    supabase_key: str

    @property
    def embed_model_tag(self) -> str:
        return f"{self.embed_model}@{EMBED_DIM}"


def load_settings(require_keys: bool = True) -> Settings:
    settings = Settings(
        gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
        embed_model=os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001"),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
    )
    if require_keys:
        missing = [
            name
            for name, value in [
                ("GEMINI_API_KEY", settings.gemini_api_key),
                ("SUPABASE_URL", settings.supabase_url),
                ("SUPABASE_SERVICE_ROLE_KEY", settings.supabase_key),
            ]
            if not value
        ]
        if missing:
            raise SystemExit(f"Missing environment variables: {', '.join(missing)}. Copy .env.example to .env.local and fill them in.")
    dim = os.getenv("GEMINI_EMBED_DIM")
    if dim and int(dim) != EMBED_DIM:
        raise SystemExit(f"GEMINI_EMBED_DIM={dim} but the database schema stores vector({EMBED_DIM}). Keep them equal.")
    return settings
