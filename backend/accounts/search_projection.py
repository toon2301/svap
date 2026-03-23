from __future__ import annotations

from typing import Iterable

from django.contrib.auth import get_user_model

from .models import DashboardSkillSearchProjection, OfferedSkill

User = get_user_model()


def _tags_to_search_text(tags: object) -> str:
    if not isinstance(tags, list):
        return ""
    return " ".join(str(tag).strip() for tag in tags if str(tag).strip())


def build_dashboard_skill_search_projection_defaults(skill: OfferedSkill) -> dict:
    user = skill.user
    return {
        "user_id": skill.user_id,
        "category": skill.category,
        "subcategory": skill.subcategory,
        "tags_text": _tags_to_search_text(skill.tags),
        "skill_location": skill.location or "",
        "skill_district": skill.district or "",
        "user_location": getattr(user, "location", "") or "",
        "user_district": getattr(user, "district", "") or "",
        "user_is_public": bool(getattr(user, "is_public", False)),
        "user_is_verified": bool(getattr(user, "is_verified", False)),
        "is_hidden": bool(skill.is_hidden),
        "is_seeking": bool(skill.is_seeking),
        "price_from": skill.price_from,
        "created_at": skill.created_at,
    }


def sync_dashboard_skill_search_projection(*, skill: OfferedSkill | None = None, skill_id: int | None = None) -> None:
    if skill is None:
        if not skill_id:
            return
        skill = (
            OfferedSkill.objects.select_related("user")
            .filter(pk=skill_id)
            .first()
        )
    if skill is None:
        if skill_id:
            DashboardSkillSearchProjection.objects.filter(skill_id=skill_id).delete()
        return

    DashboardSkillSearchProjection.objects.update_or_create(
        skill_id=skill.pk,
        defaults=build_dashboard_skill_search_projection_defaults(skill),
    )


def sync_dashboard_skill_search_projections_for_user(*, user: User | None = None, user_id: int | None = None) -> None:
    if user is None:
        if not user_id:
            return
        user = User.objects.filter(pk=user_id).first()
    if user is None:
        return

    skills = OfferedSkill.objects.select_related("user").filter(user_id=user.pk)
    for skill in skills.iterator(chunk_size=100):
        sync_dashboard_skill_search_projection(skill=skill)


def bulk_build_dashboard_skill_search_projection_objects(skills: Iterable[OfferedSkill]):
    objects = []
    for skill in skills:
        objects.append(
            DashboardSkillSearchProjection(
                skill_id=skill.pk,
                **build_dashboard_skill_search_projection_defaults(skill),
            )
        )
    return objects
