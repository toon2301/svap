from unittest.mock import call, patch

import pytest
from django.contrib.auth import get_user_model
from django.db import transaction

from accounts.models import (
    UserType,
    OfferedSkill,
    OfferedSkillImage,
    Notification,
    NotificationType,
)

User = get_user_model()


@pytest.mark.django_db
class TestModelsSlugAndNotifications:
    def test_company_display_name_falls_back_to_username_when_no_company_name(self):
        u = User.objects.create_user(
            username="compuser",
            email="comp@example.com",
            password="StrongPass123",
            user_type=UserType.COMPANY,
            first_name="ACME",
            last_name="s.r.o.",
            company_name="",
            is_verified=True,
        )
        assert u.display_name == "compuser"

    def test_generate_base_slug_fallback_when_no_name(self):
        # Force empty display_name AND username (edge-case branch coverage)
        u = User(email="noname@example.com", username="", user_type=UserType.INDIVIDUAL)
        u.set_password("StrongPass123")
        u.save()
        u.ensure_slug(force_update=True)
        assert u.slug

    def test_ensure_slug_noop_when_slug_exists(self):
        u = User.objects.create_user(
            username="haslug",
            email="haslug@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        u.slug = "fixed-slug"
        u.save()
        u.ensure_slug(force_update=False)
        assert u.slug == "fixed-slug"

    def test_save_handles_missing_old_instance_gracefully(self):
        u = User(pk=9999, username="x", email="x9999@example.com")
        u.set_password("StrongPass123")
        u.save()
        assert u.pk == 9999
        assert u.slug

    def test_notification_mark_read_sets_read_at(self):
        u = User.objects.create_user(
            username="n",
            email="n@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        n = Notification.objects.create(
            user=u,
            type=NotificationType.SKILL_REQUEST,
            title="t",
            body="b",
            is_read=False,
        )
        assert n.is_read is False
        n.mark_read()
        n.refresh_from_db()
        assert n.is_read is True
        assert n.read_at is not None

    def test_offered_skill_and_image_str(self):
        u = User.objects.create_user(
            username="s",
            email="s@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        skill = OfferedSkill.objects.create(
            user=u,
            category="Kategória",
            subcategory="Podkategória",
            description="",
            detailed_description="",
            is_seeking=False,
        )
        assert str(skill)
        img = OfferedSkillImage(skill=skill, image=None)
        assert str(img)


@pytest.mark.django_db(transaction=True)
def test_offer_image_storage_delete_waits_for_transaction_commit():
    user = User.objects.create_user(
        username="storage-delete",
        email="storage-delete@example.com",
        password="StrongPass123",
        is_verified=True,
    )
    skill = OfferedSkill.objects.create(
        user=user,
        category="KategĂłria",
        subcategory="PodkategĂłria",
        description="",
        detailed_description="",
        is_seeking=False,
    )
    image = OfferedSkillImage.objects.create(
        skill=skill,
        image="offers/original.jpg",
        pending_key="uploads/pending.jpg",
        approved_key="media/approved.jpg",
    )
    image_id = image.pk

    with patch("accounts.signals.default_storage.delete") as delete_mock:
        with pytest.raises(RuntimeError):
            with transaction.atomic():
                image.delete()
                assert delete_mock.call_count == 0
                raise RuntimeError("rollback")

        assert delete_mock.call_count == 0
        assert OfferedSkillImage.objects.filter(pk=image_id).exists()

        image = OfferedSkillImage.objects.get(pk=image_id)
        with transaction.atomic():
            image.delete()
            assert delete_mock.call_count == 0

        assert delete_mock.call_args_list == [
            call("offers/original.jpg"),
            call("uploads/pending.jpg"),
            call("media/approved.jpg"),
        ]
