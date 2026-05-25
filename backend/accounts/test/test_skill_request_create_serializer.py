from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.models import OfferedSkill
from accounts.skill_request_serializers import SkillRequestCreateSerializer

User = get_user_model()


@pytest.mark.django_db
class TestSkillRequestCreateSerializer:
    def _user(self, username: str, **kwargs):
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="StrongPass123",
            is_verified=True,
            is_public=True,
            **kwargs,
        )

    def _offer_for_owner(self, owner):
        return OfferedSkill.objects.create(
            user=owner,
            category=f"Category {owner.id}",
            subcategory=f"Subcategory {owner.id}",
            description="Valid offer",
        )

    @pytest.mark.parametrize(
        "owner_flags",
        [
            {"is_active": False},
            {"is_staff": True},
            {"is_superuser": True},
        ],
    )
    def test_offer_owner_denial_branches_raise_not_found(self, owner_flags):
        requester = self._user("requester")
        owner = self._user("owner", **owner_flags)
        offer = self._offer_for_owner(owner)
        serializer = SkillRequestCreateSerializer(
            context={"request": SimpleNamespace(user=requester)}
        )

        with pytest.raises(serializers.ValidationError) as exc_info:
            serializer.validate_offer_id(offer.id)

        assert str(exc_info.value.detail[0]) == "Karta neexistuje."
