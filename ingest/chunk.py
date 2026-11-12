"""Heading-aware chunker.

Rules:
- Passages target ~500 tokens and never exceed ~800, except a single table row group.
- A new heading starts a new chunk; each chunk remembers its heading path.
- Tables are never split mid-row. Very large tables are split by rows, repeating the header.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass

from .parse import Block, ParsedDoc

TARGET_TOKENS = 500
MAX_TOKENS = 800
TABLE_SPLIT_TOKENS = 1200  # embedding input limit is ~2048 tokens; stay well under


def estimate_tokens(text: str) -> int:
    """Rough token estimate. Indic scripts use more tokens per character than English."""
    if not text:
        return 0
    non_ascii = sum(1 for ch in text if ord(ch) > 127) / len(text)
    chars_per_token = 4.0 - 1.5 * non_ascii  # ~4 for English, ~2.5 for Tamil/Hindi/Telugu
    return math.ceil(len(text) / chars_per_token)


@dataclass
class Chunk:
    index: int
    heading: str | None
    content: str
    tokens: int


def _split_table(md: str) -> list[str]:
    lines = md.split("\n")
    # Repeat any lead-in lines ("Columns: ..." or a section title) plus the markdown header.
    first_row = next((i for i, line in enumerate(lines) if line.startswith("|")), 0)
    header, rows = lines[: first_row + 2], lines[first_row + 2 :]
    parts, current = [], []
    for row in rows:
        candidate = "\n".join(header + current + [row])
        if current and estimate_tokens(candidate) > TABLE_SPLIT_TOKENS:
            parts.append("\n".join(header + current))
            current = []
        current.append(row)
    if current:
        parts.append("\n".join(header + current))
    return parts or [md]


def chunk(doc: ParsedDoc) -> list[Chunk]:
    chunks: list[Chunk] = []
    heading_path: list[tuple[int, str]] = []
    buffer: list[str] = []

    def heading_label() -> str | None:
        return " › ".join(text for _, text in heading_path) or None

    def flush() -> None:
        if not buffer:
            return
        content = "\n\n".join(buffer).strip()
        if content:
            chunks.append(Chunk(len(chunks), heading_label(), content, estimate_tokens(content)))
        buffer.clear()

    def buffered_tokens() -> int:
        return estimate_tokens("\n\n".join(buffer))

    for block in doc.blocks:
        if block.kind == "heading":
            flush()
            heading_path = [(lvl, text) for lvl, text in heading_path if lvl < block.level]
            heading_path.append((block.level, block.text))
            continue

        pieces = _split_table(block.text) if block.kind == "table" and estimate_tokens(block.text) > TABLE_SPLIT_TOKENS else [block.text]
        for piece in pieces:
            piece_tokens = estimate_tokens(piece)
            if block.kind == "table":
                # Tables stand alone with any short lead-in text kept beside them.
                if buffer and buffered_tokens() + piece_tokens > MAX_TOKENS:
                    flush()
                buffer.append(piece)
                if buffered_tokens() >= TARGET_TOKENS:
                    flush()
                continue
            if piece_tokens > MAX_TOKENS:
                # Long paragraph: split on sentence boundaries.
                flush()
                sentences = [s.strip() for s in piece.replace("\n", " ").split(". ") if s.strip()]
                for sentence in sentences:
                    buffer.append(sentence if sentence.endswith(".") else sentence + ".")
                    if buffered_tokens() >= TARGET_TOKENS:
                        flush()
                continue
            if buffer and buffered_tokens() + piece_tokens > MAX_TOKENS:
                flush()
            buffer.append(piece)
            if buffered_tokens() >= TARGET_TOKENS:
                flush()
    flush()

    # Safety cap: split anything still far over the limit (e.g. a table row of prose).
    capped: list[Chunk] = []
    for c in chunks:
        if c.tokens <= MAX_TOKENS * 1.5:
            capped.append(c)
            continue
        piece: list[str] = []
        for line in re.split(r"(?<=[.!?।])\s+|\n", c.content):
            if piece and estimate_tokens(" ".join(piece + [line])) > MAX_TOKENS:
                text = "\n".join(piece)
                capped.append(Chunk(0, c.heading, text, estimate_tokens(text)))
                piece = []
            while estimate_tokens(line) > MAX_TOKENS:  # a single huge line: hard split
                cut = len(line) * MAX_TOKENS // estimate_tokens(line)
                capped.append(Chunk(0, c.heading, line[:cut], estimate_tokens(line[:cut])))
                line = line[cut:]
            piece.append(line)
        if piece:
            text = "\n".join(piece)
            capped.append(Chunk(0, c.heading, text, estimate_tokens(text)))
    chunks = capped

    # Drop near-empty fragments (menus, page numbers) that survive parsing.
    kept = [c for c in chunks if c.tokens >= 25 or "\n| ---" in c.content]
    for i, c in enumerate(kept):
        c.index = i
    return kept


def embedding_text(title: str, c: Chunk) -> str:
    """Text sent to the embedding model: title and heading give each passage context."""
    return "\n".join(part for part in [title, c.heading, "", c.content] if part is not None)
