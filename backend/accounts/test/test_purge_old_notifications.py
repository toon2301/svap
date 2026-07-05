"""BOD 1 – testy retencie notifikácií (purge_old_notifications)."""

from datetime import timedelta
from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone

from accounts.models import Notification, NotificationType
from accounts.services.notifications import (
    NOTIFICATION_RETENTION_DAYS,
    purge_old_notifications,
)

User = get_user_model()


@pytest.mark.django_db
class TestPurgeOldNotifications:
    def _notif(self, user, ntype, age_days):
        n = Notification.objects.create(user=user, type=ntype, title="x", body="y")
        # created_at je auto_now_add -> nastavíme cez update (obíde auto_now_add).
        Notification.objects.filter(id=n.id).update(
            created_at=timezone.now() - timedelta(days=age_days)
        )
        return n

    def test_dry_run_counts_without_deleting(self):
        u = User.objects.create_user("u1", "u1@e.com", "StrongPass123")
        self._notif(u, NotificationType.OFFER_LIKED, 40)  # >30d -> počíta
        self._notif(u, NotificationType.OFFER_LIKED, 10)  # <30d -> nie

        summary = purge_old_notifications(dry_run=True)

        assert summary[NotificationType.OFFER_LIKED] == 1
        assert Notification.objects.count() == 2  # dry-run nič nezmaže

    def test_execute_deletes_only_past_retention(self):
        u = User.objects.create_user("u2", "u2@e.com", "StrongPass123")
        old_like = self._notif(u, NotificationType.OFFER_LIKED, 40)  # >30 -> zmaž
        fresh_like = self._notif(u, NotificationType.OFFER_LIKED, 10)  # <30 -> nechaj
        old_review = self._notif(u, NotificationType.REVIEW_CREATED, 45)  # <60 -> nechaj
        old_skill = self._notif(u, NotificationType.SKILL_REQUEST, 100)  # >90 -> zmaž

        summary = purge_old_notifications(dry_run=False)

        assert summary[NotificationType.OFFER_LIKED] == 1
        assert summary[NotificationType.SKILL_REQUEST] == 1
        assert summary[NotificationType.REVIEW_CREATED] == 0

        remaining = set(Notification.objects.values_list("id", flat=True))
        assert old_like.id not in remaining
        assert old_skill.id not in remaining
        assert fresh_like.id in remaining
        assert old_review.id in remaining

    def test_unmapped_type_is_never_purged(self):
        # Typ MIMO NOTIFICATION_RETENTION_DAYS sa nikdy nemaže (bezpečný default).
        # Použijeme raw type string, ktorý v mape nie je (choices sa na DB úrovni
        # nevynucujú, takže simulujeme legacy/neznámy typ).
        u = User.objects.create_user("u5", "u5@e.com", "StrongPass123")
        unmapped_type = "legacy_unknown_type"
        assert unmapped_type not in NOTIFICATION_RETENTION_DAYS
        old = self._notif(u, unmapped_type, 3650)  # 10 rokov starý

        summary = purge_old_notifications(dry_run=False)

        # Neznámy typ nie je v summary a NEbol zmazaný.
        assert unmapped_type not in summary
        assert Notification.objects.filter(id=old.id).exists()
        # Summary obsahuje len mapované typy.
        assert set(summary.keys()) == set(NOTIFICATION_RETENTION_DAYS.keys())

    def test_command_default_is_dry_run(self):
        u = User.objects.create_user("u3", "u3@e.com", "StrongPass123")
        self._notif(u, NotificationType.OFFER_LIKED, 40)

        out = StringIO()
        call_command("purge_old_notifications", stdout=out)

        assert Notification.objects.count() == 1  # nič nezmazané
        assert "dry-run" in out.getvalue().lower()

    def test_command_execute_requires_confirm(self):
        with pytest.raises(CommandError):
            call_command("purge_old_notifications", "--execute")

    def test_command_execute_confirm_deletes(self):
        u = User.objects.create_user("u4", "u4@e.com", "StrongPass123")
        self._notif(u, NotificationType.OFFER_LIKED, 40)

        out = StringIO()
        call_command("purge_old_notifications", "--execute", "--confirm", stdout=out)

        assert Notification.objects.count() == 0

    def test_command_dry_run_flag_overrides_execute(self):
        # --dry-run vždy vyhráva (bezpečnosť), aj keď je zadaný --execute --confirm.
        u = User.objects.create_user("u6", "u6@e.com", "StrongPass123")
        self._notif(u, NotificationType.OFFER_LIKED, 40)

        out = StringIO()
        call_command(
            "purge_old_notifications", "--dry-run", "--execute", "--confirm", stdout=out
        )

        assert Notification.objects.count() == 1  # dry-run vyhral -> nič nezmazané

    def test_scheduled_task_uses_execute_confirm(self):
        # Celery beat task musí bežať s --execute --confirm (nie dry-run).
        from unittest.mock import patch

        from swaply.tasks.notifications import purge_old_notifications_task

        with patch("swaply.tasks.notifications.call_command") as mock_cmd:
            purge_old_notifications_task()

        mock_cmd.assert_called_once_with(
            "purge_old_notifications", "--execute", "--confirm"
        )

    def test_scheduled_task_actually_purges(self):
        # End-to-end: task -> command -> reálne mazanie starých notifikácií.
        from swaply.tasks.notifications import purge_old_notifications_task

        u = User.objects.create_user("u7", "u7@e.com", "StrongPass123")
        old = self._notif(u, NotificationType.OFFER_LIKED, 40)  # >30 -> zmaž
        fresh = self._notif(u, NotificationType.OFFER_LIKED, 5)  # <30 -> nechaj

        purge_old_notifications_task()

        remaining = set(Notification.objects.values_list("id", flat=True))
        assert old.id not in remaining
        assert fresh.id in remaining
