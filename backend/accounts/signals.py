from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

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
