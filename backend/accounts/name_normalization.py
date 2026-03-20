from __future__ import annotations

from typing import Any, TypedDict


class NormalizedProfileNameFields(TypedDict):
    first_name: str
    last_name: str
    company_name: str


def clean_name_value(value: Any) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    return value.strip()


def build_individual_display_name(first_name: Any, last_name: Any) -> str:
    first = clean_name_value(first_name)
    last = clean_name_value(last_name)
    return " ".join(part for part in (first, last) if part)


def build_company_display_name(company_name: Any, username: Any = "") -> str:
    company = clean_name_value(company_name)
    return company or clean_name_value(username)


def get_canonical_display_name(
    *,
    user_type: str,
    first_name: Any,
    last_name: Any,
    company_name: Any,
    username: Any = "",
) -> str:
    if user_type == "company":
        return build_company_display_name(company_name, username)
    return build_individual_display_name(first_name, last_name) or clean_name_value(
        username
    )


def normalize_profile_name_fields(
    *,
    user_type: str,
    first_name: Any,
    last_name: Any,
    company_name: Any,
) -> NormalizedProfileNameFields:
    first = clean_name_value(first_name)
    last = clean_name_value(last_name)
    company = clean_name_value(company_name)

    if user_type == "company":
        canonical_company_name = company or build_individual_display_name(first, last)
        return {
            "first_name": first or canonical_company_name,
            "last_name": "",
            "company_name": canonical_company_name,
        }

    return {
        "first_name": first,
        "last_name": last,
        "company_name": "",
    }
