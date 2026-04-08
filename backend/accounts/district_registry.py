from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any


DISTRICT_REGISTRY_PATH = (
    Path(__file__).resolve().parents[2]
    / "frontend"
    / "src"
    / "shared"
    / "districtRegistry.json"
)

SUPPORTED_OFFER_COUNTRIES = ("SK", "CZ", "PL", "HU", "AT", "DE")


def _normalize_text(value: str) -> str:
    return (
        unicodedata.normalize("NFD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
        .strip()
    )


def _normalize_code(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", _normalize_text(value)).strip("-")


@lru_cache(maxsize=1)
def _load_registry() -> dict[str, tuple[dict[str, str], ...]]:
    with DISTRICT_REGISTRY_PATH.open("r", encoding="utf-8") as fh:
        raw = json.load(fh)

    registry: dict[str, tuple[dict[str, str], ...]] = {}
    for country_code, items in raw.items():
        normalized_country = normalize_offer_country_code(country_code)
        if not normalized_country or not isinstance(items, list):
            continue
        normalized_items: list[dict[str, str]] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            code = _normalize_code(str(item.get("code") or ""))
            label = str(item.get("label") or "").strip()
            if not code or not label:
                continue
            normalized_items.append({"code": code, "label": label})
        registry[normalized_country] = tuple(normalized_items)
    return registry


def normalize_offer_country_code(value: Any) -> str:
    raw = str(value or "").strip().upper()
    return raw if raw in SUPPORTED_OFFER_COUNTRIES else ""


def get_offer_district_entries(country_code: Any) -> tuple[dict[str, str], ...]:
    normalized_country = normalize_offer_country_code(country_code)
    if not normalized_country:
        return ()
    return _load_registry().get(normalized_country, ())


@lru_cache(maxsize=None)
def _district_map(country_code: str) -> dict[str, str]:
    return {
        item["code"]: item["label"]
        for item in get_offer_district_entries(country_code)
    }


@lru_cache(maxsize=None)
def _district_label_lookup(country_code: str) -> dict[str, tuple[str, str]]:
    return {
        _normalize_text(item["label"]): (item["code"], item["label"])
        for item in get_offer_district_entries(country_code)
    }


def get_offer_district_label(country_code: Any, district_code: Any) -> str:
    normalized_country = normalize_offer_country_code(country_code)
    normalized_code = _normalize_code(str(district_code or ""))
    if not normalized_country or not normalized_code:
        return ""
    return _district_map(normalized_country).get(normalized_code, "")


def is_valid_offer_district_code(country_code: Any, district_code: Any) -> bool:
    return bool(get_offer_district_label(country_code, district_code))


def resolve_offer_district_code(country_code: Any, district_label: Any) -> tuple[str, str]:
    normalized_country = normalize_offer_country_code(country_code)
    normalized_label = _normalize_text(str(district_label or ""))
    if not normalized_country or not normalized_label:
        return "", ""
    return _district_label_lookup(normalized_country).get(normalized_label, ("", ""))
