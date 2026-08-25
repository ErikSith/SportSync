"""
SportSync multi-agent balík pre Bratislava športoviská.

Pipeline (dátový tok):
  1. ScraperAgent    (scraper.py)     → clean_text
  2. ClassifierAgent (classifier.py)  → List[SportEvent]  (models.py)
  3. SportsTabs.tsx  (Frontend)       ← JSON z model_dump() / to_ui_json()

Spustenie ukážky:
  python -m agents.pipeline https://example-venue.sk
"""

from agents.classifier import ClassifierAgent
from agents.models import ClassificationResult, SportEvent
from agents.scraper import ScrapeResult, ScraperAgent

__all__ = [
    "ClassifierAgent",
    "ClassificationResult",
    "ScrapeResult",
    "ScraperAgent",
    "SportEvent",
]

# run_pipeline je v agents.pipeline — importuj priamo, aby __init__ nebol cyklický
