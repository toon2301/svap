"""Nahlásenia príspevkov na nástenke."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from .post import FeedPost


class FeedPostReport(models.Model):
    """Nahlásenie príspevku – presne podľa vzoru ReviewReport.

    Jeden používateľ môže nahlásiť konkrétny príspevok iba raz. reason je voľný
    text (max 100) – rovnaká konvencia ako Photo/Review/UserReport (žiadny
    choices enum v appke neexistuje).
    """

    post = models.ForeignKey(
        FeedPost,
        on_delete=models.CASCADE,
        related_name="reports",
        verbose_name=_("Príspevok"),
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feed_post_reports",
        verbose_name=_("Nahlásil"),
    )
    reason = models.CharField(_("Dôvod"), max_length=100)
    description = models.TextField(_("Popis"), blank=True)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    is_resolved = models.BooleanField(_("Vyriešené"), default=False)

    class Meta:
        verbose_name = _("Nahlásenie príspevku")
        verbose_name_plural = _("Nahlásenia príspevkov")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["post", "reported_by"],
                name="unique_feed_post_report_per_user",
            )
        ]

    def __str__(self):
        return f"Nahlásenie príspevku #{self.post_id} od {self.reported_by_id}"
