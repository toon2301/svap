from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .services.webpush_crypto import decrypt_web_push_value


class WebPushSubscription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="webpush_subscriptions",
        verbose_name=_("Používateľ"),
    )
    endpoint_hash = models.CharField(
        _("Hash endpointu"),
        max_length=64,
        unique=True,
    )
    endpoint_encrypted = models.TextField(_("Zašifrovaný endpoint"))
    p256dh_encrypted = models.TextField(_("Zašifrovaný p256dh kľúč"))
    auth_encrypted = models.TextField(_("Zašifrovaný auth kľúč"))
    user_agent = models.CharField(_("User-Agent"), max_length=512, blank=True, default="")
    device_label = models.CharField(
        _("Označenie zariadenia"),
        max_length=120,
        blank=True,
        default="",
    )
    is_active = models.BooleanField(_("Aktívna subscription"), default=True)
    last_seen_at = models.DateTimeField(_("Naposledy videné"), default=timezone.now)
    last_success_at = models.DateTimeField(
        _("Naposledy úspešne odoslané"),
        null=True,
        blank=True,
    )
    last_failure_at = models.DateTimeField(
        _("Naposledy zlyhalo odoslanie"),
        null=True,
        blank=True,
    )
    failure_count = models.PositiveIntegerField(_("Počet zlyhaní"), default=0)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Aktualizované"), auto_now=True)

    class Meta:
        verbose_name = _("Web push subscription")
        verbose_name_plural = _("Web push subscriptions")
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user", "is_active"], name="acc_wps_user_act_idx"),
            models.Index(fields=["is_active", "last_seen_at"], name="acc_wps_seen_idx"),
        ]

    def __str__(self):
        return f"WebPushSubscription #{self.pk} user_id={self.user_id}"

    @property
    def endpoint(self) -> str:
        return decrypt_web_push_value(self.endpoint_encrypted)

    @property
    def p256dh(self) -> str:
        return decrypt_web_push_value(self.p256dh_encrypted)

    @property
    def auth(self) -> str:
        return decrypt_web_push_value(self.auth_encrypted)
