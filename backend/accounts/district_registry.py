from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any, TypedDict

from .country_registry import normalize_offer_country_code


# Backend-owned data shipped with the accounts app (see accounts/data/).
_DATA_DIR = Path(__file__).resolve().parent / "data"
DISTRICT_REGISTRY_PATH = _DATA_DIR / "district_registry.json"
STRICT_DISTRICT_REGISTRY_COUNTRIES = frozenset(
    {"SK", "CZ", "PL", "HU", "AT", "DE"}
)
_NON_DECOMPOSING_CHARACTERS = str.maketrans(
    {"ł": "l", "Ł": "L", "ß": "ss", "ẞ": "SS"}
)


class DistrictEntry(TypedDict):
    code: str
    label: str
    official_code: str
    active: bool
    aliases: tuple[str, ...]


def _normalize_text(value: str) -> str:
    return (
        unicodedata.normalize("NFD", value.translate(_NON_DECOMPOSING_CHARACTERS))
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
        .strip()
    )


def _normalize_code(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", _normalize_text(value)).strip("-")


@lru_cache(maxsize=1)
def _load_registry() -> dict[str, tuple[DistrictEntry, ...]]:
    with DISTRICT_REGISTRY_PATH.open("r", encoding="utf-8") as file_handle:
        raw = json.load(file_handle)

    registry: dict[str, tuple[DistrictEntry, ...]] = {}
    for country_code, items in raw.items():
        normalized_country = normalize_offer_country_code(country_code)
        if not normalized_country or not isinstance(items, list):
            continue
        normalized_items: list[DistrictEntry] = []
        seen_codes: set[str] = set()
        seen_labels: dict[str, str] = {}
        seen_official_codes: set[str] = set()
        for item in items:
            if not isinstance(item, dict):
                raise ValueError(
                    f"District entries for {normalized_country} must be objects."
                )
            code = _normalize_code(str(item.get("code") or ""))
            label = str(item.get("label") or "").strip()
            if not code or not label:
                raise ValueError(
                    f"District entries for {normalized_country} need a code and label."
                )
            if code in seen_codes:
                raise ValueError(
                    f"Duplicate district code for {normalized_country}: {code}"
                )
            raw_active = item.get("active", True)
            if not isinstance(raw_active, bool):
                raise ValueError(
                    "District active flag must be boolean for "
                    f"{normalized_country}/{code}."
                )
            raw_aliases = item.get("aliases")
            if raw_aliases is not None and not isinstance(raw_aliases, list):
                raise ValueError(
                    "District aliases must be a list for "
                    f"{normalized_country}/{code}."
                )
            aliases = tuple(
                alias
                for alias in (
                    str(value or "").strip()
                    for value in (raw_aliases if isinstance(raw_aliases, list) else [])
                )
                if alias
            )
            official_code = str(item.get("official_code") or "").strip()
            if official_code and official_code in seen_official_codes:
                raise ValueError(
                    f"Duplicate official district code for {normalized_country}: "
                    f"{official_code}"
                )
            if (
                normalized_country in STRICT_DISTRICT_REGISTRY_COUNTRIES
                and raw_active
            ):
                for candidate_label in (label, *aliases):
                    normalized_label = _normalize_text(candidate_label)
                    existing_code = seen_labels.get(normalized_label)
                    if existing_code and existing_code != code:
                        raise ValueError(
                            f"District label collision for {normalized_country}: "
                            f"{candidate_label}"
                        )
                    seen_labels[normalized_label] = code
            normalized_items.append(
                {
                    "code": code,
                    "label": label,
                    "official_code": official_code,
                    "active": raw_active,
                    "aliases": aliases,
                }
            )
            seen_codes.add(code)
            if official_code:
                seen_official_codes.add(official_code)
        registry[normalized_country] = tuple(normalized_items)
    return registry


def get_offer_district_entries(
    country_code: Any,
    *,
    include_inactive: bool = False,
) -> tuple[DistrictEntry, ...]:
    normalized_country = normalize_offer_country_code(country_code)
    if not normalized_country:
        return ()
    entries = _load_registry().get(normalized_country, ())
    if include_inactive:
        return entries
    return tuple(entry for entry in entries if entry["active"])


def get_offer_district_country_codes() -> tuple[str, ...]:
    return tuple(_load_registry())


def has_offer_district_registry(country_code: Any) -> bool:
    normalized_country = normalize_offer_country_code(country_code)
    return bool(normalized_country and normalized_country in _load_registry())


@lru_cache(maxsize=None)
def _district_map(
    country_code: str,
    include_inactive: bool = False,
) -> dict[str, DistrictEntry]:
    return {
        item["code"]: item
        for item in get_offer_district_entries(
            country_code,
            include_inactive=include_inactive,
        )
    }


@lru_cache(maxsize=None)
def _district_label_lookup(
    country_code: str,
    include_inactive: bool = False,
) -> dict[str, tuple[str, str]]:
    lookup: dict[str, tuple[str, str]] = {}
    entries = get_offer_district_entries(
        country_code,
        include_inactive=include_inactive,
    )
    if include_inactive:
        # Populate legacy values first so an active entry wins label collisions.
        entries = tuple(sorted(entries, key=lambda item: item["active"]))
    for item in entries:
        resolved = (item["code"], item["label"])
        lookup[_normalize_text(item["label"])] = resolved
        for alias in item["aliases"]:
            lookup[_normalize_text(alias)] = resolved
    return lookup


def get_offer_district_entry(
    country_code: Any,
    district_code: Any,
    *,
    include_inactive: bool = False,
) -> DistrictEntry | None:
    normalized_country = normalize_offer_country_code(country_code)
    normalized_code = _normalize_code(str(district_code or ""))
    if not normalized_country or not normalized_code:
        return None
    return _district_map(normalized_country, include_inactive).get(normalized_code)


def get_offer_district_label(
    country_code: Any,
    district_code: Any,
    *,
    include_inactive: bool = False,
) -> str:
    entry = get_offer_district_entry(
        country_code,
        district_code,
        include_inactive=include_inactive,
    )
    return entry["label"] if entry else ""


def is_valid_offer_district_code(country_code: Any, district_code: Any) -> bool:
    return bool(get_offer_district_label(country_code, district_code))


def is_inactive_offer_district_code(country_code: Any, district_code: Any) -> bool:
    entry = get_offer_district_entry(
        country_code,
        district_code,
        include_inactive=True,
    )
    return bool(entry and not entry["active"])


def resolve_offer_district_code(
    country_code: Any,
    district_label: Any,
    *,
    include_inactive: bool = False,
) -> tuple[str, str]:
    normalized_country = normalize_offer_country_code(country_code)
    normalized_label = _normalize_text(str(district_label or ""))
    if not normalized_country or not normalized_label:
        return "", ""
    return _district_label_lookup(normalized_country, include_inactive).get(
        normalized_label,
        ("", ""),
    )
