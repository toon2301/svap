from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.db import DatabaseError, transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import OfferedSkill, OfferedSkillImage, OfferedSkillLike, Review, SkillRequest
from .authentication import invalidate_user_auth_cache
from .search_projection import (
    sync_dashboard_skill_search_projection,
    sync_dashboard_skill_search_projections_for_user,
)

User = get_user_model()

# Polia User, ktoré sú denormalizované do DashboardSkillSearchProjection. Len ich
# zmena vyžaduje re-sync projekcie pre všetky skills používateľa. Pri save s
# `update_fields`, ktoré sa s touto množinou neprekrýva (napr. last_login, heslo,
# onboarding flagy), je re-sync zbytočný a preskočíme ho.
_PROJECTION_RELEVANT_USER_FIELDS = frozenset(
    {
        "location",
        "district",
        "is_public",
        "is_verified",
        "is_active",
        "is_staff",
        "is_superuser",
    }
)


def _user_save_touches_projection(update_fields) -> bool:
    """True ak save mohol zmeniť pole denormalizované v projekcii.

    `update_fields=None` (bežný plný save) => konzervatívne True (nevieme, čo sa
    zmenilo). Inak re-sync len ak sa update_fields prekrýva s relevantnými poliami.
    """
    if update_fields is None:
        return True
    return bool(_PROJECTION_RELEVANT_USER_FIELDS.intersection(update_fields))


def _sync_dashboard_search_projection_for_user_safely(user_id):
    if not user_id:
        return
    try:
        sync_dashboard_skill_search_projections_for_user(user_id=user_id)
    except DatabaseError:
        pass


def _sync_dashboard_search_projection_for_skill_safely(skill_id):
    if not skill_id:
        return
    try:
        sync_dashboard_skill_search_projection(skill_id=skill_id)
    except DatabaseError:
        pass


@receiver(post_save, sender=User)
def invalidate_auth_cache_after_user_save(sender, instance, **kwargs):
    """
    Safety net for any User save.

    Explicit invalidation in write views remains the primary path when the next
    request must observe fresh state immediately.
    """

    invalidate_user_auth_cache(getattr(instance, "pk", None))
    _invalidate_dashboard_user_skills_cache_for_user(getattr(instance, "pk", None))
    _invalidate_viewer_location_snapshot_cache_for_user(getattr(instance, "pk", None))
    _invalidate_dashboard_recommendations_cache_for_user(getattr(instance, "pk", None))
    # Projekciu re-syncujeme len ak save mohol zmeniť niektoré z denormalizovaných
    # User polí – inak (napr. update_fields=["last_login"] pri každom prihlásení)
    # by sme zbytočne iterovali a prepisovali projekcie všetkých skills používateľa.
    if _user_save_touches_projection(kwargs.get("update_fields")):
        _sync_dashboard_search_projection_for_user_safely(getattr(instance, "pk", None))


@receiver(post_delete, sender=User)
def invalidate_auth_cache_after_user_delete(sender, instance, **kwargs):
    invalidate_user_auth_cache(getattr(instance, "pk", None))
    _invalidate_dashboard_user_skills_cache_for_user(getattr(instance, "pk", None))
    _invalidate_viewer_location_snapshot_cache_for_user(getattr(instance, "pk", None))
    _invalidate_dashboard_recommendations_cache_for_user(getattr(instance, "pk", None))


def _invalidate_skills_list_cache_for_user(user_id):
    if not user_id:
        return
    try:
        from .views.skills import _skills_list_cache_invalidate

        _skills_list_cache_invalidate(user_id)
    except Exception:
        pass


def _invalidate_dashboard_user_skills_cache_for_user(user_id):
    if not user_id:
        return
    try:
        from .views.dashboard_views.public_profiles import (
            invalidate_dashboard_user_skills_cache,
        )

        invalidate_dashboard_user_skills_cache(user_id)
    except Exception:
        pass


def _invalidate_viewer_location_snapshot_cache_for_user(user_id):
    if not user_id:
        return
    try:
        from .viewer_location_cache import invalidate_viewer_location_snapshot_cache

        invalidate_viewer_location_snapshot_cache(user_id)
    except Exception:
        pass


def _invalidate_dashboard_recommendations_cache_for_user(user_id):
    if not user_id:
        return
    try:
        from .views.dashboard_views.recommendations import (
            invalidate_dashboard_recommendations_cache,
        )

        invalidate_dashboard_recommendations_cache(user_id)
    except Exception:
        pass


def _owner_id_for_skill_image(instance):
    skill = getattr(instance, "skill", None)
    user_id = getattr(skill, "user_id", None)
    if user_id:
        return user_id
    try:
        return (
            OfferedSkill.objects.filter(pk=getattr(instance, "skill_id", None))
            .values_list("user_id", flat=True)
            .first()
        )
    except Exception:
        return None


def _owner_id_for_review(instance):
    offer = getattr(instance, "offer", None)
    user_id = getattr(offer, "user_id", None)
    if user_id:
        return user_id
    try:
        return (
            OfferedSkill.objects.filter(pk=getattr(instance, "offer_id", None))
            .values_list("user_id", flat=True)
            .first()
        )
    except Exception:
        return None


def _owner_id_for_skill_request(instance):
    offer = getattr(instance, "offer", None)
    user_id = getattr(offer, "user_id", None)
    if user_id:
        return user_id
    try:
        return (
            OfferedSkill.objects.filter(pk=getattr(instance, "offer_id", None))
            .values_list("user_id", flat=True)
            .first()
        )
    except Exception:
        return None


def _owner_id_for_offer_like(instance):
    offer = getattr(instance, "offer", None)
    user_id = getattr(offer, "user_id", None)
    if user_id:
        return user_id
    try:
        return (
            OfferedSkill.objects.filter(pk=getattr(instance, "offer_id", None))
            .values_list("user_id", flat=True)
            .first()
        )
    except Exception:
        return None


@receiver(post_save, sender=OfferedSkill)
@receiver(post_delete, sender=OfferedSkill)
def invalidate_skills_cache_after_skill_change(sender, instance, **kwargs):
    user_id = getattr(instance, "user_id", None)
    _sync_dashboard_search_projection_for_skill_safely(getattr(instance, "pk", None))
    _invalidate_skills_list_cache_for_user(user_id)
    _invalidate_dashboard_user_skills_cache_for_user(user_id)
    _invalidate_dashboard_recommendations_cache_for_user(user_id)


@receiver(post_save, sender=OfferedSkillImage)
@receiver(post_delete, sender=OfferedSkillImage)
def invalidate_skills_cache_after_skill_image_change(sender, instance, **kwargs):
    user_id = _owner_id_for_skill_image(instance)
    _invalidate_skills_list_cache_for_user(user_id)
    _invalidate_dashboard_user_skills_cache_for_user(user_id)


def _delete_offer_image_storage(instance):
    """Best-effort zmazanie všetkých storage kľúčov patriacich k obrázku ponuky.

    Pokrýva ImageField súbor (legacy/dev) aj S3 kľúče z asynchrónneho
    spracovania (pending_key v uploads/, approved_key v media/). Spúšťa sa
    pri zmazaní jednej fotky, celej karty (CASCADE) aj účtu (CASCADE),
    aby v storage nezostávali "orphaned" súbory (náklady + GDPR).
    """
    image_name = getattr(getattr(instance, "image", None), "name", "") or ""
    keys = [
        image_name,
        getattr(instance, "pending_key", "") or "",
        getattr(instance, "approved_key", "") or "",
    ]
    for key in dict.fromkeys(k.strip() for k in keys):
        if not key:
            continue
        try:
            default_storage.delete(key)
        except Exception:
            # Radšej osamotený súbor než spadnuté mazanie karty/účtu.
            pass


@receiver(post_delete, sender=OfferedSkillImage)
def delete_offer_image_files_after_delete(sender, instance, **kwargs):
    transaction.on_commit(lambda instance=instance: _delete_offer_image_storage(instance))


@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def invalidate_skills_cache_after_review_change(sender, instance, **kwargs):
    user_id = _owner_id_for_review(instance)
    _invalidate_skills_list_cache_for_user(user_id)
    _invalidate_dashboard_user_skills_cache_for_user(user_id)


@receiver(post_save, sender=OfferedSkillLike)
@receiver(post_delete, sender=OfferedSkillLike)
def invalidate_skills_cache_after_offer_like_change(sender, instance, **kwargs):
    user_id = _owner_id_for_offer_like(instance)
    _invalidate_skills_list_cache_for_user(user_id)
    _invalidate_dashboard_user_skills_cache_for_user(user_id)


@receiver(post_save, sender=SkillRequest)
@receiver(post_delete, sender=SkillRequest)
def invalidate_dashboard_user_skills_cache_after_skill_request_change(
    sender, instance, **kwargs
):
    _invalidate_dashboard_user_skills_cache_for_user(
        _owner_id_for_skill_request(instance)
    )
