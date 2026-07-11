"""Profile likes."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class ProfileLike(models.Model):
    """Public like relation between two user profiles."""

    profile_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile_likes_received",
        verbose_name=_("Liked profile"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile_likes_given",
        verbose_name=_("User"),
    )
    created_at = models.DateTimeField(_("Created"), auto_now_add=True)

    class Meta:
        verbose_name = _("Profile like")
        verbose_name_plural = _("Profile likes")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["profile_user", "user"],
                name="unique_profile_like_per_user",
            ),
            models.CheckConstraint(
                check=~models.Q(profile_user=models.F("user")),
                name="profile_like_cannot_point_to_self",
            ),
        ]
        indexes = [
            models.Index(
                fields=["profile_user", "created_at"],
                name="acc_plike_profile_cr_idx",
            ),
            models.Index(
                fields=["user", "created_at"],
                name="acc_plike_user_cr_idx",
            ),
        ]

    def __str__(self):
        return f"ProfileLike #{self.id}: user {self.user_id} -> profile {self.profile_user_id}"
