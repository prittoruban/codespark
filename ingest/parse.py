"""Turns raw HTML / PDF / text into an ordered list of blocks: headings, paragraphs and tables.

Tables are kept as markdown because dose tables are the most important content
in package-of-practice guides and must never be split mid-row.
"""

from __future__ import annotations

import re
import statistics
import unicodedata
from dataclasses import dataclass
from io import BytesIO

from bs4 import BeautifulSoup

from .fetch import RawDoc

TESSERACT_LANG = {"en": "eng", "hi": "hin+eng", "ta": "tam+eng", "te": "tel+eng"}

# PDFs often store Tamil/Hindi vowel signs in *visual* order (the sign drawn before
# the consonant comes first). These patterns move them back to logical order.
_TA_PRE = "\u0BC6\u0BC7\u0BC8"  # ெ ே ை
_TA_CONS = "\u0B95-\u0BB9"
_HI_PRE = "\u093F"  # ि
_HI_CONS = "\u0915-\u0939\u0958-\u095F"
_VISUAL_TA = re.compile(f"([{_TA_PRE}])([{_TA_CONS}](?:\u0BCD[{_TA_CONS}])*)")
_VISUAL_HI = re.compile(f"({_HI_PRE})([{_HI_CONS}](?:\u094D[{_HI_CONS}])*)")
_STARTS_TA = re.compile(f"(?:^|[\\s(]|[{_TA_PRE}])[{_TA_PRE}]")
_LOGICAL_TA = re.compile(f"[{_TA_CONS}][{_TA_PRE}]")


def repair_indic_order(text: str) -> str:
    """Fix visual-order vowel signs in text extracted from PDFs. Leaves logical text alone."""
    text = text.replace("\x00", "")
    ta_visual = len(_STARTS_TA.findall(text))
    if ta_visual and ta_visual >= len(_LOGICAL_TA.findall(text)) * 0.3:
        text = _VISUAL_TA.sub(r"\2\1", text)
        text = text.replace("\u0BC6\u0BBE", "\u0BCA").replace("\u0BC7\u0BBE", "\u0BCB").replace("\u0BC6\u0BD7", "\u0BCC")
    hi_visual = len(re.findall(f"(?:^|\\s){_HI_PRE}", text))
    if hi_visual:
        text = _VISUAL_HI.sub(r"\2\1", text)
    return text


@dataclass
class Block:
    kind: str  # "heading" | "text" | "table"
    text: str
    level: int = 0  # heading depth (1 = top)


@dataclass
class ParsedDoc:
    title: str
    blocks: list[Block]


def clean(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)  # de-hyphenate line breaks
    text = re.sub(r"[ \t ]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text)
    return text.strip()


def table_to_markdown(rows: list[list[str | None]]) -> str:
    rows = [[clean(c or "").replace("\n", " ").replace("|", "/") for c in row] for row in rows if row and any(c for c in row)]
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    header, body = rows[0], rows[1:]
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join(["---"] * width) + " |"]
    lines += ["| " + " | ".join(r) + " |" for r in body]
    return "\n".join(lines)


# ---------------------------------------------------------------- HTML


def parse_html(raw: bytes) -> ParsedDoc:
    soup = BeautifulSoup(raw, "html.parser")
    for tag in soup(["script", "style", "noscript", "nav", "header", "footer", "form", "iframe", "aside"]):
        tag.decompose()
    title = clean(soup.title.get_text()) if soup.title else ""
    body = soup.find("main") or soup.find("article") or soup.body or soup
    blocks: list[Block] = []
    for el in body.find_all(["h1", "h2", "h3", "h4", "p", "li", "table", "dd"], recursive=True):
        # Skip elements nested inside a table (handled with the table) or inside list items.
        if el.name != "table" and el.find_parent("table"):
            continue
        if el.name == "table":
            rows = [[cell.get_text(" ", strip=True) for cell in tr.find_all(["th", "td"])] for tr in el.find_all("tr")]
            md = table_to_markdown(rows)
            if md:
                blocks.append(Block("table", md))
        elif el.name in ("h1", "h2", "h3", "h4"):
            text = clean(el.get_text(" "))
            if text:
                blocks.append(Block("heading", text, int(el.name[1])))
        else:
            if el.name == "p" and el.find_parent("li"):
                continue
            if el.name == "li" and el.find(["li", "ul", "ol"]):
                # Nested list: keep only this item's own text; children are visited separately.
                text = clean(" ".join(el.find_all(string=True, recursive=False)))
            else:
                text = clean(el.get_text(" "))
            if len(text) > 2:
                blocks.append(Block("text", ("- " if el.name == "li" else "") + text))
    if not title:
        first = next((b.text for b in blocks if b.kind == "heading"), "")
        title = first
    return ParsedDoc(title, blocks)


# ---------------------------------------------------------------- PDF


def _ocr_available() -> bool:
    try:
        import pytesseract

        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def _ocr_page(page, language: str) -> str:
    try:
        import pytesseract  # optional dependency
    except ImportError:
        return ""
    image = page.to_image(resolution=300).original
    return pytesseract.image_to_string(image, lang=TESSERACT_LANG.get(language, "eng"))


def _repeated_lines(pdf) -> set[str]:
    """Lines that appear on at least half the pages: running headers, footers, page labels."""
    from collections import Counter

    counts: Counter[str] = Counter()
    for page in pdf.pages:
        lines = {re.sub(r"\d+", "#", line.strip()) for line in (page.extract_text() or "").split("\n") if line.strip()}
        counts.update(lines)
    threshold = max(3, len(pdf.pages) // 2)
    numbered = {line for line, n in counts.items() if n >= threshold}
    # Map back: match lines after digit normalisation at use time.
    return _RepeatedSet(numbered)


class _RepeatedSet(set):
    def __contains__(self, item: object) -> bool:
        return isinstance(item, str) and super().__contains__(re.sub(r"\d+", "#", item.strip()))


def parse_pdf(raw: bytes, language: str = "en") -> ParsedDoc:
    import pdfplumber

    blocks: list[Block] = []
    title = ""
    ocr_pages = 0
    # Text layers of Indic-script PDFs are unreliable (lost glyphs, reordered vowels):
    # OCR them when Tesseract is installed.
    prefer_ocr = language in ("hi", "ta", "te") and _ocr_available()
    if language in ("hi", "ta", "te") and not prefer_ocr:
        print("    warning: Indic PDF without OCR. Text may lose characters; install Tesseract (see docs/rag-setup.md)")
    with pdfplumber.open(BytesIO(raw)) as pdf:
        meta_title = (pdf.metadata or {}).get("Title") or ""
        repeated = _repeated_lines(pdf) if len(pdf.pages) >= 3 else set()
        for page in pdf.pages:
            if prefer_ocr:
                text = clean(_ocr_page(page, language))
                if text:
                    ocr_pages += 1
                    blocks.extend(Block("text", para) for para in re.split(r"\n{2,}", text) if para.strip())
                continue
            tables = page.find_tables()
            boxes = [t.bbox for t in tables]

            def outside_tables(obj, boxes=boxes):
                return not any(b[0] <= obj.get("x0", 0) <= b[2] and b[1] <= obj.get("top", 0) <= b[3] for b in boxes)

            text_page = page.filter(outside_tables) if boxes else page
            words = text_page.extract_words(extra_attrs=["size"], keep_blank_chars=False, use_text_flow=True)

            if not words and not tables:
                text = clean(_ocr_page(page, language))
                if text:
                    ocr_pages += 1
                    blocks.extend(Block("text", para) for para in re.split(r"\n{2,}", text) if para.strip())
                continue

            # Group words into lines by vertical position, then lines into paragraphs.
            lines: list[tuple[float, float, str]] = []  # (top, size, text)
            for w in words:
                if lines and abs(lines[-1][0] - w["top"]) < 3:
                    top, size, text = lines[-1]
                    lines[-1] = (top, max(size, w["size"]), f"{text} {w['text']}")
                else:
                    lines.append((w["top"], w["size"], w["text"]))
            body_size = statistics.median([s for _, s, _ in lines]) if lines else 10

            para: list[str] = []
            prev_top = None

            def flush():
                if para:
                    blocks.append(Block("text", clean("\n".join(para))))
                    para.clear()

            for top, size, text in lines:
                text = repair_indic_order(text.strip())
                if text in repeated:
                    continue  # running header/footer or page number
                is_heading = size >= body_size * 1.15 and len(text) < 100 and not text.endswith(".")
                if is_heading:
                    flush()
                    level = 1 if size >= body_size * 1.5 else 2
                    blocks.append(Block("heading", clean(text), level))
                    if not title and level == 1:
                        title = clean(text)
                else:
                    if prev_top is not None and top - prev_top > size * 1.8:
                        flush()
                    para.append(text)
                prev_top = top
            flush()

            for t in tables:
                md = table_to_markdown(t.extract())
                if md:
                    blocks.append(Block("table", md))
    if ocr_pages:
        print(f"    OCR used on {ocr_pages} scanned page(s)")
    return ParsedDoc(clean(meta_title) or title, blocks)


# ---------------------------------------------------------------- entry


def parse(doc: RawDoc) -> ParsedDoc:
    if doc.kind == "pdf":
        parsed = parse_pdf(doc.data, doc.spec.language)
    elif doc.kind == "html":
        parsed = parse_html(doc.data)
    else:
        text = clean(doc.data.decode("utf-8", errors="replace"))
        parsed = ParsedDoc("", [Block("text", p) for p in re.split(r"\n{2,}", text) if p.strip()])
    if doc.spec.title:
        parsed.title = doc.spec.title
    if not parsed.title:
        parsed.title = doc.spec.url.rstrip("/").rsplit("/", 1)[-1]
    return parsed
