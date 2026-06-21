"""BOD 6: produkčný guard pre debug-only seed príkaz."""

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings


@override_settings(DEBUG=False)
def test_seed_test_reviews_blocked_when_not_debug():
    # V produkcii (DEBUG=False) musí príkaz okamžite zlyhať (pred akoukoľvek
    # tvorbou testovacích účtov / recenzií).
    with pytest.raises(CommandError):
        call_command("seed_test_reviews", "--offer-id", "1")


@override_settings(DEBUG=True)
@pytest.mark.django_db
def test_seed_test_reviews_runs_in_debug_but_validates_args():
    # V DEBUG režime guard neblokuje – príkaz pokračuje k validácii argumentov
    # (bez --username/--offer-id vyhodí iný CommandError, nie ten produkčný).
    with pytest.raises(CommandError) as exc:
        call_command("seed_test_reviews")
    assert "DEBUG" not in str(exc.value)
