"""Fáza 4.1 – testy retencie návštev profilu (purge_old_profile_visits)."""

from datetime import timedelta
from io import StringIO
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone

from accounts.models import ProfileVisit
from accounts.services.profile_visits import (
    PROFILE_VISIT_RETENTION_DAYS,
    purge_old_profile_visits,
)

User = get_user_model()


@pytest.mark.django_db
class TestPurgeOldProfileVisits:
    def _users(self):
        profile = User.objects.create_user("pv-p", "pv-p@e.com", "StrongPass123")
        viewer = User.objects.create_user("pv-v", "pv-v@e.com", "StrongPass123")
        return profile, viewer

    def _visit(self, profile, viewer, age_days, days_offset=0):
        # visit_date len na uspokojenie unique (rôzne dni), retencia ide podľa created_at.
        v = ProfileVisit.objects.create(
            profile_user=profile,
            viewer=viewer,
            visit_date=timezone.localdate() - timedelta(days=days_offset),
        )
        # created_at je auto_now_add -> nastavíme cez update (obíde auto_now_add).
        ProfileVisit.objects.filter(id=v.id).update(
            created_at=timezone.now() - timedelta(days=age_days)
        )
        return v

    def test_dry_run_counts_without_deleting(self):
        profile, viewer = self._users()
        self._visit(profile, viewer, age_days=100, days_offset=0)  # >90 -> počíta
        self._visit(profile, viewer, age_days=10, days_offset=1)  # <90 -> nie

        count = purge_old_profile_visits(dry_run=True)

        assert count == 1
        assert ProfileVisit.objects.count() == 2  # dry-run nič nezmaže

    def test_execute_deletes_only_past_retention(self):
        profile, viewer = self._users()
        old = self._visit(profile, viewer, age_days=100, days_offset=0)  # zmaž
        fresh = self._visit(profile, viewer, age_days=30, days_offset=1)  # nechaj
        boundary = self._visit(
            profile, viewer, age_days=PROFILE_VISIT_RETENTION_DAYS - 1, days_offset=2
        )  # tesne pod hranicou -> nechaj

        deleted = purge_old_profile_visits(dry_run=False)

        assert deleted == 1
        remaining = set(ProfileVisit.objects.values_list("id", flat=True))
        assert old.id not in remaining
        assert fresh.id in remaining
        assert boundary.id in remaining

    def test_command_default_is_dry_run(self):
        profile, viewer = self._users()
        self._visit(profile, viewer, age_days=100)

        out = StringIO()
        call_command("purge_old_profile_visits", stdout=out)

        assert ProfileVisit.objects.count() == 1  # nič nezmazané
        assert "dry-run" in out.getvalue().lower()

    def test_command_execute_requires_confirm(self):
        with pytest.raises(CommandError):
            call_command("purge_old_profile_visits", "--execute")

    def test_command_execute_confirm_deletes(self):
        profile, viewer = self._users()
        self._visit(profile, viewer, age_days=100)

        out = StringIO()
        call_command("purge_old_profile_visits", "--execute", "--confirm", stdout=out)

        assert ProfileVisit.objects.count() == 0

    def test_command_dry_run_flag_overrides_execute(self):
        # --dry-run vždy vyhráva (bezpečnosť), aj keď je zadaný --execute --confirm.
        profile, viewer = self._users()
        self._visit(profile, viewer, age_days=100)

        call_command(
            "purge_old_profile_visits", "--dry-run", "--execute", "--confirm"
        )

        assert ProfileVisit.objects.count() == 1  # dry-run vyhral -> nič nezmazané

    def test_scheduled_task_uses_execute_confirm(self):
        from swaply.tasks.profile_visits import purge_old_profile_visits_task

        with patch("swaply.tasks.profile_visits.call_command") as mock_cmd:
            purge_old_profile_visits_task()

        mock_cmd.assert_called_once_with(
            "purge_old_profile_visits", "--execute", "--confirm"
        )

    def test_scheduled_task_actually_purges(self):
        from swaply.tasks.profile_visits import purge_old_profile_visits_task

        profile, viewer = self._users()
        old = self._visit(profile, viewer, age_days=100, days_offset=0)  # zmaž
        fresh = self._visit(profile, viewer, age_days=5, days_offset=1)  # nechaj

        purge_old_profile_visits_task()

        remaining = set(ProfileVisit.objects.values_list("id", flat=True))
        assert old.id not in remaining
        assert fresh.id in remaining
