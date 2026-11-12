"""Ingest documents listed in a manifest into the Supabase knowledge base.

Usage (from the repo root):
    python -m ingest.run --manifest ingest/sources.yaml --dry-run   # parse + chunk only, no keys needed
    python -m ingest.run --manifest ingest/sources.yaml             # embed with Gemini and store in Supabase
Options: --only TNAU   --force (re-embed unchanged docs)   --refresh (re-download cached files)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

from .chunk import chunk, embedding_text
from .config import PIPELINE_VERSION, PREVIEW_DIR, load_settings
from .fetch import load
from .manifest import load_manifest
from .parse import parse
from .tag import tag

SAMPLE_HOSTS = {"example.org", "example.com"}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--manifest", type=Path, default=Path("ingest/sources.yaml"))
    ap.add_argument("--dry-run", action="store_true", help="parse and chunk only; write previews to ingest/data/preview")
    ap.add_argument("--only", help="ingest only this source (ICAR, TNAU, IMD, SHCP, KVK, PPQS)")
    ap.add_argument("--force", action="store_true", help="re-embed documents even if unchanged")
    ap.add_argument("--refresh", action="store_true", help="re-download instead of using cached files")
    args = ap.parse_args()

    if not args.manifest.exists():
        print(f"Manifest not found: {args.manifest}. Copy ingest/sources.example.yaml to ingest/sources.yaml first.")
        return 1

    settings = load_settings(require_keys=not args.dry_run)
    specs = load_manifest(args.manifest)
    if args.only:
        specs = [s for s in specs if s.source == args.only.upper()]
    print(f"{len(specs)} document(s) in {args.manifest}{' (dry run)' if args.dry_run else ''}\n")

    embedder = store = None
    if not args.dry_run:
        from .embed import Embedder
        from .store import Store

        embedder, store = Embedder(settings), Store(settings)

    stats = Counter()
    failures: list[str] = []
    for spec in specs:
        print(f"[{spec.source}] {spec.url}")
        try:
            parsed = parse(load(spec, refresh=args.refresh))
            chunks = chunk(parsed)
            if not chunks:
                print("    no usable text found (scanned PDF without OCR, or an index page?) - skipped\n")
                stats["empty"] += 1
                continue

            rows = []
            for c in chunks:
                rows.append({"chunk_index": c.index, "heading": c.heading, "content": c.content, "token_estimate": c.tokens, **tag(c.content, c.heading, spec)})

            fingerprint = json.dumps({"v": PIPELINE_VERSION, "model": settings.embed_model_tag, "title": parsed.title, "rows": rows}, ensure_ascii=False, sort_keys=True)
            content_hash = hashlib.sha256(fingerprint.encode()).hexdigest()
            crops = Counter(r["crop"] or "all" for r in rows)
            topics = Counter(r["topic"] for r in rows)
            avg = sum(c.tokens for c in chunks) // len(chunks)
            print(f"    “{parsed.title}” → {len(chunks)} chunks (avg {avg} tokens) · crops {dict(crops)} · topics {dict(topics)}")

            if args.dry_run:
                PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
                out = PREVIEW_DIR / f"{spec.source.lower()}-{hashlib.sha256(spec.url.encode()).hexdigest()[:10]}.jsonl"
                with out.open("w", encoding="utf-8") as fh:
                    for r in rows:
                        fh.write(json.dumps({"title": parsed.title, **r}, ensure_ascii=False) + "\n")
                print(f"    preview → {out.relative_to(Path.cwd()) if out.is_relative_to(Path.cwd()) else out}\n")
                stats["previewed"] += 1
                continue

            if urlparse(spec.url).hostname in SAMPLE_HOSTS:
                print("    sample document (example.org) - not stored. Remove it from your manifest.\n")
                stats["sample"] += 1
                continue
            if not args.force and store.existing_hash(spec.url) == content_hash:
                print("    unchanged since last run - skipped\n")
                stats["unchanged"] += 1
                continue

            vectors = embedder.documents([embedding_text(parsed.title, c) for c in chunks])
            for r, v in zip(rows, vectors):
                r["embedding"] = v
                r["embed_model"] = settings.embed_model_tag
            doc_row = {"source": spec.source, "title": parsed.title, "url": spec.url, "language": spec.language, "published_on": spec.published_on}
            doc_id = store.save(doc_row, rows, content_hash)
            print(f"    stored as document {doc_id}\n")
            stats["stored"] += 1
        except Exception as exc:  # keep going; report at the end
            print(f"    FAILED: {exc}\n")
            failures.append(f"{spec.url}: {exc}")

    print("Summary:", dict(stats) or "nothing processed", f"· failed: {len(failures)}")
    for f in failures:
        print("  -", f)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
