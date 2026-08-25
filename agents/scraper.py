"""
SCRAPER AGENT — extrakcia surového textu zo webu športoviska v Bratislave.

Vstup:  URL (alebo už stiahnuté HTML)
Výstup: čistý neštruktúrovaný text bez navigácie / footeru / cookie bannerov

Ďalší krok v pipeline:
  clean_text = ScraperAgent().run(url)
  → ClassifierAgent().run(clean_text)  # classifier.py
"""

from __future__ import annotations

import logging
import random
import re
import time
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup, Comment

logger = logging.getLogger(__name__)

# Súlad so SportSync scrape ethics (lib/scrape/ethics.ts) — 12h cron, nie burst.
USER_AGENT = (
    "Mozilla/5.0 (compatible; SportSyncBot/1.0; +https://sportsync.app; event-aggregator)"
)
REQUEST_TIMEOUT_S = 25.0
HOST_DELAY_MS = (1500, 3500)  # náhodná pauza medzi requestami na ten istý host

# Tag / class heuristiky — odstránenie balastu pred classifierom.
_NOISE_TAGS = frozenset(
    {
        "script",
        "style",
        "noscript",
        "svg",
        "iframe",
        "nav",
        "footer",
        "header",
        "aside",
        "form",
        "button",
        "input",
        "select",
        "textarea",
        "template",
    }
)
_NOISE_ID_CLASS_RE = re.compile(
    r"(nav|menu|footer|header|cookie|consent|banner|sidebar|breadcrumb|"
    r"social|share|promo|advert|ads?|popup|modal|newsletter|login|signup)",
    re.I,
)


@dataclass
class ScrapeResult:
    """Medzivýstup Scraper Agenta — ešte nie je SportEvent, len text."""

    url: str
    clean_text: str
    title_hint: Optional[str] = None
    error: Optional[str] = None

    @property
    def ok(self) -> bool:
        return bool(self.clean_text.strip()) and self.error is None


class ScraperAgent:
    """
    Agent 1/3 — stiahne HTML a vráti očistený text.

    Oddelené fázy (fetch → parse → clean), aby sa dali testovať samostatne
    a aby Classifier nikdy nedostal surový HTML s navigáciou.
    """

    def __init__(self, client: Optional[httpx.Client] = None) -> None:
        self._client = client
        self._owns_client = client is None
        self._host_last_at: dict[str, float] = {}

    def __enter__(self) -> ScraperAgent:
        if self._client is None:
            self._client = httpx.Client(
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "sk-SK,sk;q=0.9,en;q=0.8",
                },
                follow_redirects=True,
                timeout=REQUEST_TIMEOUT_S,
            )
        return self

    def __exit__(self, *args: object) -> None:
        if self._owns_client and self._client is not None:
            self._client.close()
            self._client = None

    def run(self, url: str) -> ScrapeResult:
        """Hlavný vstupný bod agenta: URL → ScrapeResult.clean_text."""
        try:
            html = self.fetch_html(url)
            return self.parse_html(url, html)
        except Exception as exc:  # noqa: BLE001 — agent nesmie zhodiť celú pipeline
            logger.warning("ScraperAgent failed for %s: %s", url, exc)
            return ScrapeResult(url=url, clean_text="", error=str(exc))

    def run_from_html(self, url: str, html: str) -> ScrapeResult:
        """Alternatíva: už máme HTML (testy / cron cache) — len parse + clean."""
        try:
            return self.parse_html(url, html)
        except Exception as exc:  # noqa: BLE001
            return ScrapeResult(url=url, clean_text="", error=str(exc))

    def fetch_html(self, url: str) -> str:
        """HTTP fetch s rate-limitom podľa hostu (1.5–3.5 s)."""
        if self._client is None:
            raise RuntimeError("ScraperAgent: použi context manager alebo odovzdaj httpx.Client")

        host = urlparse(url).hostname or "unknown"
        self._wait_for_host(host)

        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = self._client.get(url)
                if response.status_code in {429, 503}:
                    # Exponential backoff pri rate-limit / overload
                    time.sleep(2**attempt + random.uniform(0.2, 0.8))
                    continue
                response.raise_for_status()
                ctype = response.headers.get("content-type", "")
                if ctype and not re.search(
                    r"text/html|application/xhtml|text/plain|application/xml",
                    ctype,
                    re.I,
                ):
                    raise ValueError(f"Unexpected content-type: {ctype}")
                return response.text
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                time.sleep(2**attempt + random.uniform(0.2, 0.8))
        raise RuntimeError(f"Fetch failed for {url}: {last_error}")

    def parse_html(self, url: str, html: str) -> ScrapeResult:
        """HTML → odstránenie navigácie / skriptov → čistý text."""
        soup = BeautifulSoup(html, "lxml")

        title_hint: Optional[str] = None
        if soup.title and soup.title.string:
            title_hint = soup.title.string.strip()

        # Komentáre a noise tagy
        for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
            comment.extract()
        for tag in soup.find_all(_NOISE_TAGS):
            tag.decompose()

        # Elementy s id/class typickými pre navigáciu / cookie banner
        for el in soup.find_all(True):
            attrs = " ".join(
                filter(
                    None,
                    [
                        " ".join(el.get("class", []) or []),
                        el.get("id") or "",
                        el.get("role") or "",
                    ],
                )
            )
            if attrs and _NOISE_ID_CLASS_RE.search(attrs):
                el.decompose()

        # Preferuj <main> / <article>, inak body
        root = soup.find("main") or soup.find("article") or soup.body or soup
        text = root.get_text(separator="\n", strip=True)
        clean = self._normalize_whitespace(text)

        if len(clean) < 40:
            return ScrapeResult(
                url=url,
                clean_text=clean,
                title_hint=title_hint,
                error="Príliš málo textu po očistení — stránka môže byť JS-only alebo blokovaná",
            )

        return ScrapeResult(url=url, clean_text=clean, title_hint=title_hint)

    def _wait_for_host(self, host: str) -> None:
        last = self._host_last_at.get(host, 0.0)
        gap_ms = random.randint(*HOST_DELAY_MS)
        wait = (last + gap_ms / 1000.0) - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        self._host_last_at[host] = time.monotonic()

    @staticmethod
    def _normalize_whitespace(text: str) -> str:
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
        # Zlúč prázdne riadky max na jeden
        out: list[str] = []
        blank = False
        for line in lines:
            if not line:
                if not blank and out:
                    out.append("")
                blank = True
            else:
                out.append(line)
                blank = False
        return "\n".join(out).strip()
