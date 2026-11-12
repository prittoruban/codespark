"""Retrieval check: is a relevant passage in the top-k for each test question?

Usage: python -m ingest.eval.run_eval --questions ingest/eval/questions.jsonl [--k 5]

Each line: {"question": ..., "lang": ..., "crop": optional, "expect_any": [keywords or URL fragments]}.
A question is a hit when any expected string appears in a retrieved passage's text, title or URL.
Replace the example questions with ones written and checked by an agronomist.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from ..config import load_settings
from ..embed import Embedder
from ..store import Store


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--questions", type=Path, default=Path("ingest/eval/questions.jsonl"))
    ap.add_argument("--k", type=int, default=5)
    args = ap.parse_args()

    settings = load_settings()
    embedder, store = Embedder(settings), Store(settings)
    items = [json.loads(line) for line in args.questions.read_text(encoding="utf-8").splitlines() if line.strip()]

    hits = 0
    for item in items:
        results = store.search(item["question"], embedder.query(item["question"]), args.k, crop=item.get("crop"))
        haystack = " ".join(f"{r['content']} {r['title']} {r['url']}".lower() for r in results)
        ok = any(e.lower() in haystack for e in item["expect_any"])
        hits += ok
        top = f"{results[0]['source']} · {results[0]['title'][:60]}" if results else "no results"
        print(f"{'HIT ' if ok else 'MISS'} [{item.get('lang', 'en')}] {item['question'][:70]:<70}  top: {top}")

    print(f"\nhit@{args.k}: {hits}/{len(items)} ({(hits / len(items) * 100 if items else 0):.0f}%)")


if __name__ == "__main__":
    main()
