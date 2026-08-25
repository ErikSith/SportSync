"""
CLASSIFIER / CHECKER AGENT — LLM + Pydantic validácia.

Vstup:  čistý text zo ScraperAgent (scraper.py)
Výstup: ClassificationResult s List[SportEvent] (models.py)

Tok dát do UI:
  result = ClassifierAgent().run(clean_text, source_url=...)
  json_payload = [e.model_dump() for e in result.events]
  → <SportsTabs events={json_payload} />

Cloudflare / midnight cron:
  Tento modul (OpenAI) sa NESMIE volať z Edge Workeru.
  Produkčný cron mapuje už persistované events cez lib/agents/from-event-card.ts.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Optional

from pydantic import ValidationError

from agents.models import (
    BRATISLAVA_BOROUGHS,
    ClassificationResult,
    SportEvent,
    SportEventBatch,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = f"""Si SportSync Classifier Agent pre športoviská v Bratislave.
Z neštruktúrovaného textu webu extrahuj 1–N športových ponúk / eventov.

Vráť IBA validný JSON objekt: {{"events":[...]}}, kde každá položka má:
- title (string)
- location (mestská časť BA — jedna z: {", ".join(BRATISLAVA_BOROUGHS)}; ak nevieš, najbližšia podľa adresy)
- participation_type: "ACTIVE" (dá sa cvičiť/hrať) ALEBO "PASSIVE_SPECTATOR" (len divák / vstupenky)
- target_audience: pole z ["KIDS","WOMEN","MEN","ALL"] — ALL ak nie je špecifické
- category: šport (Tenis, Joga, Hokej, Plávanie, Futbal, Padel, MMA, …)
- description: 1–3 vety po slovensky

Pravidlá:
- Nevymýšľaj eventy, ktoré v texte nie sú.
- Ak je text o predaji lístkov / zápase / „Tím A vs Tím B“, použij PASSIVE_SPECTATOR (Sledovať, nie Pripojiť sa).
- Ligový zápas s vs/proti v názve NIKDY nie je ACTIVE — divák nesedí v zostave.
- Ak je text o lekciách / rezervácii kurtov / tréningu, použij ACTIVE.
- "pre deti" / Kidstown → KIDS; "pre ženy" / ladies → WOMEN; inak ALL.
"""


class ClassifierAgent:
    """
    Agent 2/3 — zatriedi text do SportEvent a ošetrí chybové vstupy.

    Stratégia:
      1) OpenAI (ak je OPENAI_API_KEY) + Pydantic validácia každej položky
      2) Heuristický fallback (regex / kľúčové slová) — UI stále dostane JSON
      3) Chybné LLM riadky sa zahodia do `errors`, platné ostanú v `events`
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    def run(
        self,
        clean_text: str,
        *,
        source_url: Optional[str] = None,
        title_hint: Optional[str] = None,
    ) -> ClassificationResult:
        """Hlavný vstupný bod: čistý text → validované SportEvent(y)."""
        text = (clean_text or "").strip()
        if len(text) < 40:
            return ClassificationResult(
                source_url=source_url,
                events=[],
                errors=["Prázdny alebo príliš krátky vstup — scraper nevrátil použiteľný text"],
                source="empty",
            )

        # Truncate — LLM kontext / cena; scraper už odstránil navigáciu
        clipped = text[:12_000]

        if self.api_key:
            llm = self._classify_with_openai(clipped, title_hint=title_hint)
            if llm is not None:
                return ClassificationResult(
                    source_url=source_url,
                    events=llm.events,
                    errors=llm.errors,
                    source="openai",
                )

        heuristic = self._classify_heuristic(clipped, title_hint=title_hint)
        return ClassificationResult(
            source_url=source_url,
            events=heuristic.events,
            errors=heuristic.errors,
            source="heuristic",
        )

    # ------------------------------------------------------------------ LLM
    def _classify_with_openai(
        self,
        text: str,
        *,
        title_hint: Optional[str],
    ) -> ClassificationResult | None:
        try:
            from openai import OpenAI
        except ImportError:
            logger.info("openai package missing — falling back to heuristic")
            return None

        client = OpenAI(api_key=self.api_key)
        user = f"Title hint: {title_hint or 'n/a'}\n\nPage text:\n{text}"

        try:
            response = client.chat.completions.create(
                model=self.model,
                temperature=0.2,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user},
                ],
            )
            raw = response.choices[0].message.content or "{}"
            payload = json.loads(raw)
            return self._validate_payload(payload)
        except Exception as exc:  # noqa: BLE001 — checker musí ošetriť chyby
            logger.warning("OpenAI classification failed: %s", exc)
            return ClassificationResult(
                events=[],
                errors=[f"LLM chyba: {exc}"],
                source="openai",
            )

    def _validate_payload(self, payload: Any) -> ClassificationResult:
        """
        Checker: každý event prejde cez Pydantic; zlé riadky → errors, nie crash.
        """
        errors: list[str] = []
        events: list[SportEvent] = []

        if not isinstance(payload, dict):
            return ClassificationResult(
                events=[],
                errors=["LLM nevrátil JSON objekt"],
                source="openai",
            )

        # Skús batch schému; ak zlyhá, validuj položky po jednom
        try:
            batch = SportEventBatch.model_validate(payload)
            return ClassificationResult(events=batch.events, errors=[], source="openai")
        except ValidationError as batch_err:
            errors.append(f"Batch validácia: {batch_err.error_count()} problém(ov)")

        raw_events = payload.get("events")
        if not isinstance(raw_events, list):
            errors.append("Chýba kľúč 'events' (pole)")
            return ClassificationResult(events=[], errors=errors, source="openai")

        for idx, row in enumerate(raw_events):
            try:
                # Pred-normalizácia lokácie na mestskú časť
                if isinstance(row, dict) and "location" in row:
                    row = {**row, "location": self._resolve_borough(str(row["location"]))}
                events.append(SportEvent.model_validate(row))
            except ValidationError as ve:
                errors.append(f"Event[{idx}] odmietnutý: {ve.errors()[0]['msg']}")
            except Exception as exc:  # noqa: BLE001
                errors.append(f"Event[{idx}] chyba: {exc}")

        return ClassificationResult(events=events, errors=errors, source="openai")

    # ------------------------------------------------------------- Heuristic
    def _classify_heuristic(
        self,
        text: str,
        *,
        title_hint: Optional[str],
    ) -> ClassificationResult:
        """Fallback bez API kľúča — stále produkčný JSON pre UI taby."""
        lower = text.lower()
        title = (title_hint or self._first_heading(text) or "Športová ponuka").strip()[:160]

        participation = (
            "PASSIVE_SPECTATOR"
            if self._looks_spectator(lower)
            else "ACTIVE"
        )
        audience = self._infer_audience(lower)
        category = self._infer_category(lower)
        location = self._resolve_borough(text)
        description = self._snippet(text, max_len=400)

        try:
            event = SportEvent(
                title=title,
                location=location,
                participation_type=participation,  # type: ignore[arg-type]
                target_audience=audience,  # type: ignore[arg-type]
                category=category,
                description=description,
            )
            return ClassificationResult(events=[event], errors=[], source="heuristic")
        except ValidationError as ve:
            return ClassificationResult(
                events=[],
                errors=[f"Heuristic validácia zlyhala: {ve}"],
                source="heuristic",
            )

    @staticmethod
    def _looks_spectator(lower: str) -> bool:
        keys = (
            "vstupenky",
            "lístky",
            "listky",
            "ticket",
            "zápas",
            "zapas",
            "divák",
            "divak",
            "spectator",
            "predpredaj",
            "hc slovan",
            "šk slovan",
        )
        if any(k in lower for k in keys):
            return True
        return bool(re.search(r"\s(?:vs\.?|versus|proti)\s", lower))

    @staticmethod
    def _infer_audience(lower: str) -> list[str]:
        tags: list[str] = []
        if re.search(r"pre\s+deti|detský|detska|kidstown|mini\s|u\d{1,2}\b", lower):
            tags.append("KIDS")
        if re.search(r"pre\s+ženy|pre\s+zeny|ladies|dámsky|damsky|w4w", lower):
            tags.append("WOMEN")
        if re.search(r"pre\s+mužov|pre\s+muzov|men'?s\s+only|pánsky|pansky", lower):
            tags.append("MEN")
        return tags or ["ALL"]

    @staticmethod
    def _infer_category(lower: str) -> str:
        mapping = [
            (("padel",), "Padel"),
            (("tenis", "tennis"), "Tenis"),
            (("hokej", "hockey"), "Hokej"),
            (("futbal", "football", "soccer"), "Futbal"),
            (("plávanie", "plavanie", "swim", "bazén", "bazen"), "Plávanie"),
            (("joga", "yoga"), "Joga"),
            (("mma", "box", "kickbox"), "MMA"),
            (("lezenie", "climbing", "bouldering"), "Lezenie"),
            (("bowling",), "Bowling"),
            (("beh", "maratón", "maraton", "running"), "Beh"),
            (("fitness", "gym", "posilňovňa", "posilnovna"), "Fitness"),
        ]
        for keys, label in mapping:
            if any(k in lower for k in keys):
                return label
        return "Šport"

    @staticmethod
    def _resolve_borough(text: str) -> str:
        """Mapuje voľný text na oficiálnu mestskú časť BA."""
        lower = text.lower()
        # Najprv dlhšie / špecifickejšie názvy
        ordered = sorted(BRATISLAVA_BOROUGHS, key=len, reverse=True)
        for borough in ordered:
            if borough.lower() in lower:
                return borough
        # Alias bez diakritiky
        aliases = {
            "ruzinov": "Ružinov",
            "petrzalka": "Petržalka",
            "stare mesto": "Staré Mesto",
            "nove mesto": "Nové Mesto",
            "dubravka": "Dúbravka",
            "karlova ves": "Karlova Ves",
            "devinska nova ves": "Devínska Nová Ves",
            "zahorska bystrica": "Záhorská Bystrica",
            "podunajske biskupice": "Podunajské Biskupice",
            "vrakuna": "Vrakuňa",
            "cunovo": "Čunovo",
        }
        norm = (
            lower.replace("á", "a")
            .replace("ä", "a")
            .replace("č", "c")
            .replace("ď", "d")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ľ", "l")
            .replace("ĺ", "l")
            .replace("ň", "n")
            .replace("ó", "o")
            .replace("ô", "o")
            .replace("ŕ", "r")
            .replace("š", "s")
            .replace("ť", "t")
            .replace("ú", "u")
            .replace("ý", "y")
            .replace("ž", "z")
        )
        for alias, borough in aliases.items():
            if alias in norm:
                return borough
        return "Staré Mesto"

    @staticmethod
    def _first_heading(text: str) -> Optional[str]:
        for line in text.splitlines():
            line = line.strip()
            if 8 <= len(line) <= 120:
                return line
        return None

    @staticmethod
    def _snippet(text: str, max_len: int = 400) -> str:
        compact = " ".join(text.split())
        if len(compact) <= max_len:
            return compact if len(compact) >= 10 else f"{compact} — športová ponuka v Bratislave."
        return compact[: max_len - 1].rstrip() + "…"
