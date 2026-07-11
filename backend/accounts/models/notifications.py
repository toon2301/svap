"""Notifikácie – z models.py."""

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class NotificationType(models.TextChoices):
    OFFER_LIKED = "offer_liked", _("Páči sa mi ponuka")
    PORTFOLIO_LIKED = "portfolio_liked", _("Paci sa mi portfolio")
    PROFILE_LIKED = "profile_liked", _("Paci sa mi profil")
    SKILL_REQUEST = "skill_request", _("Nová žiadosť")
    SKILL_REQUEST_ACCEPTED = "skill_request_accepted", _("Žiadosť prijatá")
    SKILL_REQUEST_COMPLETION_REQUESTED = (
        "skill_request_completion_requested",
        _("Výmena označená ako dokončená"),
    )
    SKILL_REQUEST_COMPLETED = (
        "skill_request_completed",
        _("Dokončenie výmeny potvrdené"),
    )
    REVIEW_CREATED = "review_created", _("Nová recenzia")
    REVIEW_REPLY_CREATED = "review_reply_created", _("Odpoveď na recenziu")
    REVIEW_LIKED = "review_liked", _("Páči sa mi recenzia")
    SKILL_REQUEST_REJECTED = "skill_request_rejected", _("Žiadosť zamietnutá")
    SKILL_REQUEST_CANCELLED = "skill_request_cancelled", _("Žiadosť zrušená")
    SKILL_REQUEST_TERMINATED = (
        "skill_request_terminated",
        _("Výmena skončila"),
    )
    GROUP_INVITATION = "group_invitation", _("Pozvánka do skupiny")


class Notification(models.Model):
    """Jednoduché notifikácie (pre badge + realtime)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name=_("Používateľ"),
    )
    type = models.CharField(
        _("Typ"),
        max_length=50,
        choices=NotificationType.choices,
    )
    title = models.CharField(_("Názov"), max_length=120, blank=True, default="")
    body = models.TextField(_("Text"), blank=True, default="")
    data = models.JSONField(_("Dáta"), default=dict, blank=True)
    skill_request = models.ForeignKey(
        "accounts.SkillRequest",
        on_delete=models.SET_NULL,
        related_name="notifications",
        null=True,
        blank=True,
        verbose_name=_("Žiadosť"),
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="+",
        null=True,
        blank=True,
        verbose_name=_("Aktér"),
    )
    conversation = models.ForeignKey(
        "messaging.Conversation",
        on_delete=models.SET_NULL,
        related_name="notifications",
        null=True,
        blank=True,
        verbose_name=_("Konverzácia"),
    )
    group_invitation = models.ForeignKey(
        "messaging.GroupInvitation",
        on_delete=models.SET_NULL,
        related_name="notifications",
        null=True,
        blank=True,
        verbose_name=_("Skupinová pozvánka"),
    )
    is_read = models.BooleanField(_("Prečítané"), default=False)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    read_at = models.DateTimeField(_("Prečítané o"), null=True, blank=True)

    class Meta:
        verbose_name = _("Notifikácia")
        verbose_name_plural = _("Notifikácie")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "created_at"]),
            models.Index(fields=["user", "type", "is_read"]),
            models.Index(fields=["user", "created_at"]),
            # Pre purge_old_notifications: filter (type, created_at) naprieč usermi.
            models.Index(fields=["type", "created_at"]),
        ]

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            try:
                self.read_at = timezone.now()
            except Exception:
                self.read_at = None
            self.save(update_fields=["is_read", "read_at"])


