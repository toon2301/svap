"""Fáza 4.1 – testy modelu ProfileVisit (unique per day + self-visit check)."""

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.models import ProfileVisit

User = get_user_model()


@pytest.mark.django_db
class TestProfileVisitModel:
    def _user(self, n):
        return User.objects.create_user(f"u{n}", f"u{n}@e.com", "StrongPass123")

    def test_get_or_create_dedups_same_day(self):
        profile = self._user(1)
        viewer = self._user(2)
        today = timezone.localdate()

        _, created1 = ProfileVisit.objects.get_or_create(
            profile_user=profile, viewer=viewer, visit_date=today
        )
        _, created2 = ProfileVisit.objects.get_or_create(
            profile_user=profile, viewer=viewer, visit_date=today
        )

        assert created1 is True
        assert created2 is False  # druhý raz v ten istý deň -> žiadny nový riadok
        assert (
            ProfileVisit.objects.filter(profile_user=profile, viewer=viewer).count()
            == 1
        )

    def test_unique_constraint_blocks_duplicate_insert(self):
        profile = self._user(1)
        viewer = self._user(2)
        today = timezone.localdate()

        ProfileVisit.objects.create(
            profile_user=profile, viewer=viewer, visit_date=today
        )
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                ProfileVisit.objects.create(
                    profile_user=profile, viewer=viewer, visit_date=today
                )

    def test_different_day_creates_new_row(self):
        from datetime import timedelta

        profile = self._user(1)
        viewer = self._user(2)
        today = timezone.localdate()

        ProfileVisit.objects.create(
            profile_user=profile, viewer=viewer, visit_date=today
        )
        ProfileVisit.objects.create(
            profile_user=profile, viewer=viewer, visit_date=today - timedelta(days=1)
        )

        assert (
            ProfileVisit.objects.filter(profile_user=profile, viewer=viewer).count()
            == 2
        )

    def test_check_constraint_blocks_self_visit(self):
        user = self._user(1)
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                ProfileVisit.objects.create(
                    profile_user=user, viewer=user, visit_date=timezone.localdate()
                )
