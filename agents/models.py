"""
SportSync multi-agent — zdieľané dátové modely.

Dátový tok:
  ScraperAgent  →  str (čistý text)
  ClassifierAgent → List[SportEvent]  (tento modul)
  SportsTabs.tsx  ←  JSON serializácia SportEvent (model_dump)

Pydantic schémy sú kontrakt medzi Python backendom a React UI.
"""

from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

# --- Enumy zdieľané s Frontend / UI Agentom (SportsTabs.tsx) ---

ParticipationType = Literal["ACTIVE", "PASSIVE_SPECTATOR"]
TargetAudience = Literal["KIDS", "WOMEN", "MEN", "ALL"]

# Oficiálne mestské časti Bratislavy — classifier sem mapuje voľný text lokácie.
BRATISLAVA_BOROUGHS: tuple[str, ...] = (
    "Staré Mesto",
    "Ružinov",
    "Vrakuňa",
    "Podunajské Biskupice",
    "Nové Mesto",
    "Rača",
    "Vajnory",
    "Karlova Ves",
    "Dúbravka",
    "Lamač",
    "Devín",
    "Devínska Nová Ves",
    "Záhorská Bystrica",
    "Petržalka",
    "Jarovce",
    "Rusovce",
    "Čunovo",
)


class SportEvent(BaseModel):
    """
    Validovaná štruktúra jednej športovej ponuky / event-u zo športoviska.

    Classifier Agent naplní tieto polia z neštruktúrovaného textu.
    Frontend Agent ich priamo renderuje ako karty v taboch.
    """

    title: str = Field(..., min_length=2, max_length=160, description="Názov aktivity / zápasu")
    location: str = Field(
        ...,
        min_length=2,
        max_length=80,
        description="Mestská časť BA (napr. Ružinov, Petržalka)",
    )
    participation_type: ParticipationType = Field(
        ...,
        description="ACTIVE = dá sa športovať; PASSIVE_SPECTATOR = len sledovanie",
    )
    target_audience: List[TargetAudience] = Field(
        ...,
        min_length=1,
        description="Cieľové skupiny; ALL môže byť samo alebo v kombinácii",
    )
    category: str = Field(
        ...,
        min_length=2,
        max_length=60,
        description="Šport / disciplína (Tenis, Joga, Hokej, Plávanie…)",
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Krátky popis pre kartu v UI",
    )

    @field_validator("title", "location", "category", "description", mode="before")
    @classmethod
    def strip_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return " ".join(value.split()).strip()
        return value

    @field_validator("target_audience", mode="before")
    @classmethod
    def normalize_audience(cls, value: object) -> object:
        """Ošetrí duplicity a lowercase z LLM výstupu."""
        if not isinstance(value, list):
            return value
        seen: list[str] = []
        for item in value:
            if item is None:
                continue
            key = str(item).strip().upper()
            if key in {"KIDS", "WOMEN", "MEN", "ALL"} and key not in seen:
                seen.append(key)
        return seen or ["ALL"]

    @field_validator("participation_type", mode="before")
    @classmethod
    def normalize_participation(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        raw = value.strip().upper().replace("-", "_").replace(" ", "_")
        aliases = {
            "PARTICIPATE": "ACTIVE",
            "SPECTATOR": "PASSIVE_SPECTATOR",
            "PASSIVE": "PASSIVE_SPECTATOR",
            "WATCH": "PASSIVE_SPECTATOR",
        }
        return aliases.get(raw, raw)

    @model_validator(mode="after")
    def collapse_all_audience(self) -> SportEvent:
        """Ak je v zozname ALL, ostatné tagy sú zbytočné — necháme len ALL."""
        if "ALL" in self.target_audience and len(self.target_audience) > 1:
            self.target_audience = ["ALL"]
        return self


class SportEventBatch(BaseModel):
    """Obal pre LLM structured output — jeden scrape môže dať viac eventov."""

    events: List[SportEvent] = Field(default_factory=list)


class ClassificationResult(BaseModel):
    """
    Výstup Classifier / Checker Agenta.
    UI Agent konzumuje `events`; `errors` slúži na debugging / logy.
    """

    source_url: str | None = None
    events: List[SportEvent] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    source: Literal["openai", "heuristic", "empty"] = "empty"
