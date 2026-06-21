"""Produkčný DEBUG guard pre deštruktívne delete-all management príkazy.

Guard je DODATOČNÁ vrstva nad existujúcim --confirm flagom:
  - DEBUG=False → CommandError (blokované aj s --confirm),
  - DEBUG=True  → guard prejde, uplatní sa existujúca --confirm logika.
"""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings

from accounts.models import OfferedSkill, Review, SkillRequest

User = get_user_model()


# --------------------------------------------------------------------------- #
# delete_all_users
# --------------------------------------------------------------------------- #
@override_settings(DEBUG=False)
def test_delete_all_users_blocked_in_production():
    with pytest.raises(CommandError):
        call_command("delete_all_users", "--confirm")  # blokované aj s --confirm


@override_settings(DEBUG=True)
@pytest.mark.django_db
def test_delete_all_users_runs_in_debug():
    User.objects.create_user(username="del-u", email="del-u@example.test", password="x")
    # Bez --confirm: guard prejde, ale --confirm logika zabráni zmazaniu.
    call_command("delete_all_users")
    assert User.objects.count() == 1
    # S --confirm: existujúca logika zmaže všetkých.
    call_command("delete_all_users", "--confirm")
    assert User.objects.count() == 0


# --------------------------------------------------------------------------- #
# delete_all_reviews
# --------------------------------------------------------------------------- #
def _seed_review():
    owner = User.objects.create_user(
        username="rev-owner", email="rev-owner@example.test", password="x"
    )
    reviewer = User.objects.create_user(
        username="rev-author", email="rev-author@example.test", password="x"
    )
    offer = OfferedSkill.objects.create(user=owner, category="IT", subcategory="Web")
    Review.objects.create(reviewer=reviewer, offer=offer, rating=Decimal("5.0"), text="ok")


@override_settings(DEBUG=False)
def test_delete_all_reviews_blocked_in_production():
    with pytest.raises(CommandError):
        call_command("delete_all_reviews", "--confirm")


@override_settings(DEBUG=True)
@pytest.mark.django_db
def test_delete_all_reviews_runs_in_debug():
    _seed_review()
    call_command("delete_all_reviews")  # bez --confirm → nič nezmaže
    assert Review.objects.count() == 1
    call_command("delete_all_reviews", "--confirm")
    assert Review.objects.count() == 0


# --------------------------------------------------------------------------- #
# delete_all_skill_requests
# --------------------------------------------------------------------------- #
def _seed_skill_request():
    requester = User.objects.create_user(
        username="sr-from", email="sr-from@example.test", password="x"
    )
    recipient = User.objects.create_user(
        username="sr-to", email="sr-to@example.test", password="x"
    )
    offer = OfferedSkill.objects.create(user=recipient, category="IT", subcategory="Web")
    SkillRequest.objects.create(requester=requester, recipient=recipient, offer=offer)


@override_settings(DEBUG=False)
def test_delete_all_skill_requests_blocked_in_production():
    with pytest.raises(CommandError):
        call_command("delete_all_skill_requests", "--confirm")


@override_settings(DEBUG=True)
@pytest.mark.django_db
def test_delete_all_skill_requests_runs_in_debug():
    _seed_skill_request()
    call_command("delete_all_skill_requests")  # bez --confirm → nič nezmaže
    assert SkillRequest.objects.count() == 1
    call_command("delete_all_skill_requests", "--confirm")
    assert SkillRequest.objects.count() == 0
