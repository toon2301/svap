from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, TypedDict


_DATA_DIR = Path(__file__).resolve().parent / "data"
COUNTRY_REGISTRY_PATH = _DATA_DIR / "country_registry.json"
_COUNTRY_CODE_PATTERN = re.compile(r"^[A-Z]{2}$")


class CountryEntry(TypedDict):
    code: str
    name: str
    standard: str


@lru_cache(maxsize=1)
def _load_country_registry() -> dict[str, CountryEntry]:
    """Load the backend-owned allowlist of offer country codes."""
    with COUNTRY_REGISTRY_PATH.open("r", encoding="utf-8") as file_handle:
        raw = json.load(file_handle)

    countries = raw.get("countries") if isinstance(raw, dict) else None
    if not isinstance(countries, list):
        raise ValueError("Country registry must contain a countries list.")

    registry: dict[str, CountryEntry] = {}
    for item in countries:
        if not isinstance(item, dict):
            raise ValueError("Every country registry entry must be an object.")
        code = str(item.get("code") or "").strip().upper()
        name = str(item.get("name") or "").strip()
        standard = str(item.get("standard") or "").strip()
        if not _COUNTRY_CODE_PATTERN.fullmatch(code) or not name or not standard:
            raise ValueError(f"Invalid country registry entry: {item!r}")
        if code in registry:
            raise ValueError(f"Duplicate country registry code: {code}")
        registry[code] = {"code": code, "name": name, "standard": standard}

    return registry


SUPPORTED_OFFER_COUNTRIES = tuple(_load_country_registry())


def normalize_offer_country_code(value: Any) -> str:
    raw = str(value or "").strip().upper()
    return raw if raw in _load_country_registry() else ""


def get_offer_country_entries() -> tuple[CountryEntry, ...]:
    return tuple(_load_country_registry().values())


def get_offer_country_name(country_code: Any) -> str:
    normalized = normalize_offer_country_code(country_code)
    if not normalized:
        return ""
    return _load_country_registry()[normalized]["name"]
