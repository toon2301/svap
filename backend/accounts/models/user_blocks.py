"""Directional user blocks."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserBlock(models.Model):
    """A directional block created by one user against another user."""

    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_blocks_created",
        verbose_name=_("Blocker"),
    )
    blocked_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_blocks_received",
        verbose_name=_("Blocked user"),
    )
    created_at = models.DateTimeField(_("Created"), auto_now_add=True)

    class Meta:
        verbose_name = _("User block")
        verbose_name_plural = _("User blocks")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["blocker", "blocked_user"],
                name="unique_user_block",
            ),
            models.CheckConstraint(
                check=~models.Q(blocker=models.F("blocked_user")),
                name="user_block_cannot_target_self",
            ),
        ]
        indexes = [
            models.Index(
                fields=["blocker", "-created_at", "-id"],
                name="acc_ub_blocker_cr_idx",
            ),
            models.Index(
                fields=["blocked_user", "blocker"],
                name="acc_ub_blocked_by_idx",
            ),
        ]

    def __str__(self):
        return f"UserBlock #{self.id}: {self.blocker_id} -> {self.blocked_user_id}"
