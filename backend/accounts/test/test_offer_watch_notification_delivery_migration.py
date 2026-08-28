import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


MIGRATE_FROM = ("accounts", "0120_offer_watch_match_outbox")
MIGRATE_TO = ("accounts", "0121_offer_watch_notification_delivery")


@pytest.mark.django_db(transaction=True)
def test_migration_marks_historical_candidates_processed_without_notification():
    executor = MigrationExecutor(connection)
    executor.migrate([MIGRATE_FROM])
    old_apps = executor.loader.project_state([MIGRATE_FROM]).apps

    User = old_apps.get_model("accounts", "User")
    OfferedSkill = old_apps.get_model("accounts", "OfferedSkill")
    Candidate = old_apps.get_model("accounts", "OfferWatchNotification")
    Notification = old_apps.get_model("accounts", "Notification")
    watcher = User.objects.create(
        username="historical-watch-recipient",
        email="historical-watch-recipient@example.com",
    )
    owner = User.objects.create(
        username="historical-watch-owner",
        email="historical-watch-owner@example.com",
    )
    offer = OfferedSkill.objects.create(
        user_id=owner.id,
        category="Domácnosť a služby",
        subcategory="Maliarske práce",
    )
    historical = Candidate.objects.create(user_id=watcher.id, offer_id=offer.id)
    assert Notification.objects.count() == 0

    executor = MigrationExecutor(connection)
    executor.migrate([MIGRATE_TO])
    new_apps = executor.loader.project_state([MIGRATE_TO]).apps
    MigratedCandidate = new_apps.get_model("accounts", "OfferWatchNotification")
    MigratedNotification = new_apps.get_model("accounts", "Notification")
    migrated = MigratedCandidate.objects.get(pk=historical.pk)

    assert migrated.processed_at == migrated.matched_at
    assert migrated.notified_at is None
    assert MigratedNotification.objects.count() == 0
