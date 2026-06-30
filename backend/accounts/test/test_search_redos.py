"""
ReDoS audit pre search pipeline.

Overuje, že dvojkrokový escape/re-escape v
``_sanitize_search_term`` -> ``_build_accent_insensitive_pattern``
NEvytvára regex s katastrofickým backtrackingom ani neaktivuje
metaznaky z používateľského vstupu (všetko ostáva literál alebo
bezpečná znaková trieda pre písmená s diakritikou).
"""

import re
import time

import pytest
from django.contrib.auth import get_user_model

from accounts.models import OfferedSkill
from accounts.views.dashboard_views.utils import (
    _build_accent_insensitive_pattern,
    _sanitize_search_term,
)

User = get_user_model()


def _build_pattern(term: str) -> str:
    """Plný pipeline: sanitize (re.escape) -> accent-insensitive pattern."""
    return _build_accent_insensitive_pattern(_sanitize_search_term(term))


# Vstupy, ktoré sú klasické ReDoS / catastrophic-backtracking konštrukcie.
# Ak by sa metaznaky aktivovali, skompilovaný pattern by exponenciálne
# backtrackoval nad "evil" subjektom nižšie.
REDOS_INPUTS = [
    "(a+)+",
    "(a+)+$",
    "(a|a)*",
    "(a|aa)+",
    "(.*a){50}",
    "([a-z]+)*",
    "a" * 200 + "!",
    "(" * 50 + "a" + ")" * 50,
    "\\" * 50,
    "[a]{1,9999}",
    "(?:(?:a)*)*b",
]


@pytest.mark.parametrize("payload", REDOS_INPUTS)
def test_pattern_has_no_active_quantifiers(payload):
    """
    Postavený pattern nesmie obsahovať AKTÍVNE (neescapnuté) kvantifikátory
    ani skupiny – každý znak vstupu musí skončiť ako literál alebo ako
    znaková trieda [..] pre písmeno s diakritikou.
    """
    pattern = _build_pattern(payload)

    # Pattern sa musí dať skompilovať (žiadny syntakticky rozbitý regex).
    compiled = re.compile(pattern)

    # Odstránime bezpečné accent triedy ([aáä] atď.), ktoré pridávame my,
    # a escapnuté znaky (\X). Po tomto nesmie ostať žiadny aktívny metaznak.
    without_accent_classes = re.sub(r"\[[^\]]*\]", "", pattern)
    without_escapes = re.sub(r"\\.", "", without_accent_classes)
    for meta in "*+?(){}|^$":
        assert meta not in without_escapes, (
            f"Aktívny metaznak {meta!r} ostal v patterne {pattern!r} "
            f"pre vstup {payload!r}"
        )

    # Pattern musí matchovať PRESNE doslovný vstup (case/diacritics-insensitive),
    # teda metaznaky sa berú ako obyčajné znaky.
    assert compiled.search(payload) is not None


@pytest.mark.parametrize("payload", REDOS_INPUTS)
def test_pipeline_runs_in_linear_time(payload):
    """
    Spustí skompilovaný pattern proti dlhému "evil" subjektu a overí,
    že nedôjde ku katastrofickému backtrackingu (limit s veľkou rezervou).
    """
    pattern = _build_pattern(payload)
    compiled = re.compile(pattern)

    evil_subject = "a" * 5000 + "!" * 5000

    start = time.perf_counter()
    compiled.search(evil_subject)
    elapsed = time.perf_counter() - start

    assert elapsed < 0.5, (
        f"Pattern pre vstup {payload!r} bežal {elapsed:.3f}s "
        f"– možný ReDoS (pattern={pattern!r})"
    )


@pytest.mark.django_db
def test_full_db_query_with_redos_payload_is_fast():
    """
    End-to-end cez DB: malicious payload prejde sanitize -> pattern -> iregex
    queryset a query sa vykoná rýchlo (na SQLite beží Django REGEXP cez re).
    """
    owner = User.objects.create_user(
        username="redos_owner",
        email="redos_owner@example.com",
        password="x",
    )
    OfferedSkill.objects.create(
        user=owner,
        category="Programovanie",
        subcategory="Python",
        description="popis",
    )

    payload = "(a+)+" * 20
    pattern = _build_pattern(payload)

    start = time.perf_counter()
    count = OfferedSkill.objects.filter(category__iregex=pattern).count()
    elapsed = time.perf_counter() - start

    assert count == 0
    assert elapsed < 1.0, f"DB iregex query trvala {elapsed:.3f}s – možný ReDoS"
