"""Loads the list of documents to ingest (ingest/sources.yaml)."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml

SOURCES = {"ICAR", "TNAU", "IMD", "SHCP", "KVK", "PPQS"}
LANGUAGES = {"en", "hi", "ta", "te"}
TOPICS = {"fertilizer", "pest", "disease", "irrigation", "seeding", "soil", "weather", "general"}


@dataclass
class DocSpec:
    source: str
    url: str  # canonical public URL; used as the unique key and the citation link
    path: Path | None = None  # local copy (PDF/HTML) to read instead of downloading
    title: str | None = None
    language: str = "en"
    state: str | None = None
    district: str | None = None
    season: str | None = None
    crop: str | None = None  # default when a chunk doesn't name exactly one crop
    topic: str | None = None  # default when keyword tagging is inconclusive
    published_on: str | None = None  # YYYY-MM-DD
    valid_until: str | None = None  # YYYY-MM-DD, for time-bound advisories (IMD)
    tags: dict = field(default_factory=dict)


def load_manifest(path: Path) -> list[DocSpec]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    defaults = data.get("defaults", {}) or {}
    specs: list[DocSpec] = []
    for i, raw in enumerate(data.get("documents", []) or [], start=1):
        entry = {**defaults, **raw}
        where = f"{path.name} entry #{i}"
        source = str(entry.get("source", "")).upper()
        if source not in SOURCES:
            raise SystemExit(f"{where}: source must be one of {sorted(SOURCES)}, got {entry.get('source')!r}")
        url = entry.get("url")
        if not url:
            raise SystemExit(f"{where}: 'url' is required (the public page the citation should link to)")
        language = entry.get("language", "en")
        if language not in LANGUAGES:
            raise SystemExit(f"{where}: language must be one of {sorted(LANGUAGES)}")
        topic = entry.get("topic")
        if topic and topic not in TOPICS:
            raise SystemExit(f"{where}: topic must be one of {sorted(TOPICS)}")
        local = entry.get("path")
        local_path = (path.parent / local).resolve() if local and not Path(local).is_absolute() else (Path(local) if local else None)
        if local_path and not local_path.exists():
            raise SystemExit(f"{where}: local file not found: {local_path}")
        specs.append(
            DocSpec(
                source=source,
                url=str(url),
                path=local_path,
                title=entry.get("title"),
                language=language,
                state=entry.get("state"),
                district=entry.get("district"),
                season=entry.get("season"),
                crop=(entry.get("crop") or None) and str(entry["crop"]).lower(),
                topic=topic,
                published_on=str(entry["published_on"]) if entry.get("published_on") else None,
                valid_until=str(entry["valid_until"]) if entry.get("valid_until") else None,
            )
        )
    return specs
