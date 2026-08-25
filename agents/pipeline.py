"""
Orchester 3 agentov — ukážka end-to-end toku dát.

  URL
   │
   ▼
  ScraperAgent.run(url)          → ScrapeResult.clean_text
   │
   ▼
  ClassifierAgent.run(text)      → ClassificationResult.events  (SportEvent[])
   │
   ▼
  result.to_ui_json()            → JSON pre <SportsTabs events={...} />

Spustenie:
  cd SportSync
  pip install -r agents/requirements.txt
  python -m agents.pipeline https://www.hcslovan.sk/
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Umožní `python -m agents.pipeline` aj bez inštalovaného package
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from agents.classifier import ClassifierAgent
from agents.models import ClassificationResult
from agents.scraper import ScraperAgent


def run_pipeline(url: str) -> ClassificationResult:
    """
    Spojí Agenta 1 + Agenta 2.
    Agent 3 (UI) beží v Next.js — sem len exportujeme JSON kontrakt.
    """
    with ScraperAgent() as scraper:
        scraped = scraper.run(url)

    if not scraped.ok:
        return ClassificationResult(
            source_url=url,
            events=[],
            errors=[scraped.error or "Scrape zlyhal"],
            source="empty",
        )

    classifier = ClassifierAgent()
    result = classifier.run(
        scraped.clean_text,
        source_url=url,
        title_hint=scraped.title_hint,
    )
    # Zachovaj URL aj keď classifier vrátil vlastný source_url=None
    if result.source_url is None:
        result.source_url = url
    return result


def to_ui_json(result: ClassificationResult) -> list[dict]:
    """
    Serializácia pre Frontend / UI Agent (SportsTabs.tsx).
    Presne tieto polia číta React komponent.
    """
    return [event.model_dump() for event in result.events]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="SportSync BA multi-agent pipeline")
    parser.add_argument("url", help="URL webu športoviska v Bratislave")
    parser.add_argument(
        "-o",
        "--out",
        type=Path,
        help="Voliteľne ulož JSON pre SportsTabs (napr. agents/fixtures/sample.json)",
    )
    args = parser.parse_args(argv)

    result = run_pipeline(args.url)
    payload = {
        "source_url": result.source_url,
        "source": result.source,
        "errors": result.errors,
        "events": to_ui_json(result),
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    print(text)

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
        print(f"\n# UI JSON saved → {args.out}", file=sys.stderr)

    return 0 if result.events else 1


if __name__ == "__main__":
    raise SystemExit(main())
