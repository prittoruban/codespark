"""Polite downloader: checks robots.txt, rate-limits per host and caches raw files."""

from __future__ import annotations

import hashlib
import time
import urllib.robotparser
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

import requests

from .config import RAW_DIR, REQUEST_DELAY_SECONDS, USER_AGENT
from .manifest import DocSpec

_robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}
_last_hit: dict[str, float] = {}


@dataclass
class RawDoc:
    spec: DocSpec
    data: bytes
    kind: str  # "pdf" | "html" | "text"


def _kind_from(content_type: str, name: str) -> str:
    name = name.lower()
    if "pdf" in content_type or name.endswith(".pdf"):
        return "pdf"
    if "html" in content_type or name.endswith((".html", ".htm")):
        return "html"
    return "text"


def _allowed(url: str) -> bool:
    parts = urlparse(url)
    base = f"{parts.scheme}://{parts.netloc}"
    if base not in _robots:
        # RobotFileParser.read() has no timeout and can hang forever on a dead
        # connection, so fetch robots.txt ourselves with one.
        rp = urllib.robotparser.RobotFileParser()
        try:
            resp = requests.get(f"{base}/robots.txt", headers={"User-Agent": USER_AGENT}, timeout=15)
            if resp.status_code in (401, 403):
                rp.disallow_all = True
            elif resp.ok:
                rp.parse(resp.text.splitlines())
            else:
                rp.allow_all = True  # no robots.txt: everything allowed
            _robots[base] = rp
        except requests.RequestException:
            _robots[base] = None  # robots.txt unreachable: proceed carefully
    rp = _robots[base]
    return rp is None or rp.can_fetch(USER_AGENT, url)


def _throttle(host: str) -> None:
    wait = REQUEST_DELAY_SECONDS - (time.monotonic() - _last_hit.get(host, 0.0))
    if wait > 0:
        time.sleep(wait)
    _last_hit[host] = time.monotonic()


def load(spec: DocSpec, refresh: bool = False) -> RawDoc:
    if spec.path:
        return RawDoc(spec, spec.path.read_bytes(), _kind_from("", spec.path.name))

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256(spec.url.encode()).hexdigest()[:16]
    cached = next(RAW_DIR.glob(f"{key}.*"), None)
    if cached and not refresh:
        return RawDoc(spec, cached.read_bytes(), cached.suffix.lstrip("."))

    if not _allowed(spec.url):
        raise PermissionError(f"robots.txt disallows {spec.url}")
    _throttle(urlparse(spec.url).netloc)
    resp = requests.get(spec.url, headers={"User-Agent": USER_AGENT}, timeout=60)
    resp.raise_for_status()
    kind = _kind_from(resp.headers.get("content-type", ""), urlparse(spec.url).path)
    out = RAW_DIR / f"{key}.{kind}"
    out.write_bytes(resp.content)
    return RawDoc(spec, resp.content, kind)
