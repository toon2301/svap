from django.contrib.auth import get_user_model
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import OfferedSkill, OfferedSkillImage, Review
from .authentication import invalidate_user_auth_cache

User = get_user_model()


@receiver(post_save, sender=User)
def invalidate_auth_cache_after_user_save(sender, instance, **kwargs):
    """
    Safety net for any User save.

    Explicit invalidation in write views remains the primary path when the next
    request must observe fresh state immediately.
    """

    invalidate_user_auth_cache(getattr(instance, "pk", None))


@receiver(post_delete, sender=User)
def invalidate_auth_cache_after_user_delete(sender, instance, **kwargs):
    invalidate_user_auth_cache(getattr(instance, "pk", None))


def _invalidate_skills_list_cache_for_user(user_id):
    if not user_id:
        return
    try:
        from .views.skills import _skills_list_cache_invalidate

        _skills_list_cache_invalidate(user_id)
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


@receiver(post_save, sender=OfferedSkill)
@receiver(post_delete, sender=OfferedSkill)
def invalidate_skills_cache_after_skill_change(sender, instance, **kwargs):
    _invalidate_skills_list_cache_for_user(getattr(instance, "user_id", None))


@receiver(post_save, sender=OfferedSkillImage)
@receiver(post_delete, sender=OfferedSkillImage)
def invalidate_skills_cache_after_skill_image_change(sender, instance, **kwargs):
    _invalidate_skills_list_cache_for_user(_owner_id_for_skill_image(instance))


@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def invalidate_skills_cache_after_review_change(sender, instance, **kwargs):
    _invalidate_skills_list_cache_for_user(_owner_id_for_review(instance))
