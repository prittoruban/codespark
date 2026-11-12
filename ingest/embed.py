"""Embedding providers: local Ollama (default), Gemini or OpenRouter.

All providers return unit-length vectors of EMBED_DIM values. Cloud providers are
paced to a tokens-per-minute budget and honour the server's requested retry delay.
"""

from __future__ import annotations

import math
import re
import time
from collections import deque

import requests

from .chunk import estimate_tokens
from .config import EMBED_DIM, Settings

MAX_ATTEMPTS = 8


def normalise(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vector))
    return [v / norm for v in vector] if norm else vector


class RateLimited(Exception):
    def __init__(self, retry_after: float | None, message: str):
        super().__init__(message)
        self.retry_after = retry_after


class Pacer:
    """Keeps a rolling one-minute token budget so requests stay under the provider's limit."""

    def __init__(self, tokens_per_minute: int):
        self.limit = tokens_per_minute
        self.window: deque[tuple[float, int]] = deque()

    def wait(self, tokens: int) -> None:
        if not self.limit:
            return
        while True:
            now = time.monotonic()
            while self.window and now - self.window[0][0] > 60:
                self.window.popleft()
            used = sum(t for _, t in self.window)
            if used + tokens <= self.limit or not self.window:
                self.window.append((now, tokens))
                return
            time.sleep(max(0.5, 60 - (now - self.window[0][0])))


class Embedder:
    def __init__(self, settings: Settings):
        self.s = settings
        self.pacer = Pacer(settings.embed_tokens_per_minute)
        self.batch_size = 16 if settings.embed_provider == "ollama" else 50
        if settings.embed_provider == "gemini":
            from google import genai

            self.gemini = genai.Client(api_key=settings.gemini_api_key)

    # ------------------------------------------------------------ providers

    def _ollama(self, texts: list[str]) -> list[list[float]]:
        try:
            r = requests.post(f"{self.s.ollama_url}/api/embed", json={"model": self.s.embed_model, "input": texts, "truncate": True}, timeout=600)
        except requests.ConnectionError as exc:
            raise SystemExit(f"Can't reach Ollama at {self.s.ollama_url}. Start it with `ollama serve`.") from exc
        if r.status_code == 404:
            raise SystemExit(f"Ollama model '{self.s.embed_model}' not found. Run `ollama pull {self.s.embed_model}`.")
        r.raise_for_status()
        return r.json()["embeddings"]

    def _gemini(self, texts: list[str], task_type: str) -> list[list[float]]:
        from google.genai import errors, types

        try:
            res = self.gemini.models.embed_content(
                model=self.s.embed_model,
                contents=texts,
                config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=EMBED_DIM),
            )
        except errors.APIError as exc:
            if exc.code == 429:
                m = re.search(r"retry in ([\d.]+)s", str(exc))
                raise RateLimited(float(m.group(1)) if m else None, str(exc)[:200]) from exc
            if exc.code in (500, 502, 503, 504):
                raise RateLimited(None, f"Gemini {exc.code}") from exc
            raise
        return [e.values or [] for e in (res.embeddings or [])]

    def _openrouter(self, texts: list[str]) -> list[list[float]]:
        r = requests.post(
            "https://openrouter.ai/api/v1/embeddings",
            headers={"Authorization": f"Bearer {self.s.openrouter_api_key}", "X-Title": "AGRENSE"},
            json={"model": self.s.embed_model, "input": texts, "dimensions": EMBED_DIM},
            timeout=120,
        )
        if r.status_code == 402:
            raise SystemExit("OpenRouter: out of credits (402). Add credits or switch EMBED_PROVIDER.")
        if r.status_code in (429, 500, 502, 503, 504):
            ra = r.headers.get("retry-after")
            raise RateLimited(float(ra) if ra and ra.replace(".", "", 1).isdigit() else None, f"OpenRouter {r.status_code}")
        r.raise_for_status()
        data = sorted(r.json()["data"], key=lambda d: d["index"])
        return [d["embedding"] for d in data]

    # ------------------------------------------------------------ public

    def _call(self, texts: list[str], task_type: str) -> list[list[float]]:
        self.pacer.wait(sum(estimate_tokens(t) for t in texts))
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                if self.s.embed_provider == "ollama":
                    vectors = self._ollama(texts)
                elif self.s.embed_provider == "gemini":
                    vectors = self._gemini(texts, task_type)
                else:
                    vectors = self._openrouter(texts)
                break
            except RateLimited as exc:
                if attempt == MAX_ATTEMPTS:
                    raise RuntimeError(f"Still rate-limited after {MAX_ATTEMPTS} attempts: {exc}") from exc
                delay = min(120.0, (exc.retry_after or 2**attempt) + 1)
                print(f"    rate limited; waiting {delay:.0f}s")
                time.sleep(delay)
        if len(vectors) != len(texts):
            raise RuntimeError(f"Expected {len(texts)} embeddings, got {len(vectors)}")
        for v in vectors:
            if len(v) != EMBED_DIM:
                raise RuntimeError(f"{self.s.embed_model} returned {len(v)} dimensions; the database expects {EMBED_DIM}.")
        return [normalise(v) for v in vectors]

    def documents(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), self.batch_size):
            out.extend(self._call(texts[i : i + self.batch_size], "RETRIEVAL_DOCUMENT"))
        return out

    def query(self, text: str) -> list[float]:
        return self._call([text], "RETRIEVAL_QUERY")[0]
