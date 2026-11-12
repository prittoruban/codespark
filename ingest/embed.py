"""Gemini embeddings: batched, retried, checked for size and normalised to unit length."""

from __future__ import annotations

import math
import time

from google import genai
from google.genai import errors, types

from .config import EMBED_DIM, Settings

BATCH_SIZE = 50
MAX_ATTEMPTS = 6


def normalise(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vector))
    return [v / norm for v in vector] if norm else vector


class Embedder:
    def __init__(self, settings: Settings):
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = settings.embed_model

    def _call(self, texts: list[str], task_type: str) -> list[list[float]]:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                result = self.client.models.embed_content(
                    model=self.model,
                    contents=texts,
                    config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=EMBED_DIM),
                )
                vectors = [e.values or [] for e in (result.embeddings or [])]
                if len(vectors) != len(texts):
                    raise RuntimeError(f"Expected {len(texts)} embeddings, got {len(vectors)}")
                for v in vectors:
                    if len(v) != EMBED_DIM:
                        raise RuntimeError(f"Model returned {len(v)} dimensions, expected {EMBED_DIM}. Check GEMINI_EMBED_MODEL supports output_dimensionality.")
                return [normalise(v) for v in vectors]
            except errors.APIError as exc:
                retryable = exc.code in (429, 500, 502, 503, 504)
                if not retryable or attempt == MAX_ATTEMPTS:
                    raise
                delay = min(60, 2**attempt)
                print(f"    Gemini API {exc.code}; retrying in {delay}s")
                time.sleep(delay)
        raise RuntimeError("unreachable")

    def documents(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), BATCH_SIZE):
            out.extend(self._call(texts[i : i + BATCH_SIZE], "RETRIEVAL_DOCUMENT"))
        return out

    def query(self, text: str) -> list[float]:
        return self._call([text], "RETRIEVAL_QUERY")[0]
