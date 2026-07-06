"""Overenie e-mailu a žiadosti o zmazanie účtu – vyčlenené z models.py."""

import uuid

from django.conf import settings
from django.core.mail import send_mail
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class EmailVerification(models.Model):
    """Model pre email verifikáciu"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="email_verifications"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("Email verifikácia")
        verbose_name_plural = _("Email verifikácie")
        ordering = ["-created_at"]

    def __str__(self):
        # Never include user email (PII) in string representation.
        return f"Verifikácia pre user_id={self.user_id}"

    def is_expired(self):
        """Kontrola, či token neexpiroval (48 hodín)"""
        return timezone.now() > self.created_at + timezone.timedelta(hours=48)

    def send_verification_email(self, request=None):
        """Odoslanie verifikačného emailu"""
        import logging

        logger = logging.getLogger(__name__)

        verification_url = self.get_verification_url(request)

        subject = "Potvrdenie registrácie - Swaply"
        message = f"""
Ahoj {self.user.display_name},

Ďakujeme za registráciu na Swaply!

Pre dokončenie registrácie kliknite na nasledujúci odkaz:
{verification_url}

Ak ste si nevytvorili účet na Swaply, môžete tento email ignorovať.

S pozdravom,
Tím Swaply
        """

        try:
            import time

            _start = time.time()
            logger.info(
                "EMAIL_SEND_START",
                extra={
                    "host": getattr(settings, "EMAIL_HOST", None),
                    "port": getattr(settings, "EMAIL_PORT", None),
                    "use_tls": getattr(settings, "EMAIL_USE_TLS", None),
                    "timeout": getattr(settings, "EMAIL_TIMEOUT", None),
                    "backend": getattr(settings, "EMAIL_BACKEND", None),
                },
            )
            if getattr(settings, "DEBUG", False):
                # Bez PII/citlivých údajov: token (verification_url), to_email ani
                # email_host_user nikdy nelogujeme (aj DEBUG logy končia v Railway).
                logger.info(
                    "📧 DEBUG EMAIL: Sending verification email",
                    extra={
                        "user_id": self.user_id,
                        "email_backend": getattr(settings, "EMAIL_BACKEND", None),
                        "subject": subject,
                    },
                )
            result = send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.user.email],
                fail_silently=False,
            )
            logger.info(
                "EMAIL_SEND_DONE",
                extra={"duration_ms": int((time.time() - _start) * 1000)},
            )
            if getattr(settings, "DEBUG", False):
                logger.info(f"📧 DEBUG EMAIL: send_mail() returned: {result}")
            logger.info("Verification email sent")
            return True
        except Exception as e:
            if getattr(settings, "DEBUG", False):
                import traceback

                logger.error(f"📧 DEBUG EMAIL: Exception during send_mail(): {e}")
                logger.error(f"📧 DEBUG EMAIL: Traceback: {traceback.format_exc()}")
            logger.error(
                "EMAIL_SEND_FAILED",
                extra={
                    "duration_ms": int((time.time() - _start) * 1000),
                    "error": str(e),
                },
            )
            logger.error("Verification email failed")
            return False

    def get_verification_url(self, request=None):
        """Generovanie verifikačného URL"""
        base_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        return f"{base_url}/verify-email?token={self.token}"

    def verify(self):
        """Označenie tokenu ako použitý a overenie používateľa"""
        if self.is_used or self.is_expired():
            return False

        self.is_used = True
        self.verified_at = timezone.now()
        self.save()

        # Označenie používateľa ako overeného
        self.user.is_verified = True
        self.user.save()

        return True


class AccountDeletionRequest(models.Model):
    """
    Jednorazový token na potvrdenie NEZVRATNÉHO zmazania účtu cez email.

    Používa sa pre účty bez hesla (OAuth/Google), ktoré nevedia potvrdiť zmazanie
    zadaním hesla. Vzor (token/expirácia 48h) je zhodný s EmailVerification.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="deletion_requests"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("Žiadosť o zmazanie účtu")
        verbose_name_plural = _("Žiadosti o zmazanie účtu")
        ordering = ["-created_at"]

    def __str__(self):
        # Nikdy neuvádzaj email (PII) v reprezentácii.
        return f"Žiadosť o zmazanie pre user_id={self.user_id}"

    def is_expired(self):
        """Token platí 48 hodín (rovnako ako email verifikácia)."""
        return timezone.now() > self.created_at + timezone.timedelta(hours=48)

    def get_confirm_url(self):
        base_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        return f"{base_url}/delete-account/confirm?token={self.token}"

    def send_deletion_email(self):
        """Pošle email s jednorazovým odkazom na potvrdenie zmazania účtu."""
        import logging

        logger = logging.getLogger(__name__)
        confirm_url = self.get_confirm_url()
        subject = "Potvrdenie zmazania účtu - Swaply"
        message = f"""
Ahoj {self.user.display_name},

Dostali sme požiadavku na ZMAZANIE tvojho účtu na Swaply.

POZOR: Toto je NEZVRATNÁ operácia. Po potvrdení budú tvoje osobné údaje
anonymizované a tvoje ponuky, portfólio a hodnotenia odstránené.

Ak chceš účet naozaj zmazať, klikni na nasledujúci odkaz (platí 48 hodín):
{confirm_url}

Ak si o zmazanie nepožiadal ty, tento email ignoruj – s účtom sa nič nestane.

S pozdravom,
Tím Swaply
        """
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.user.email],
                fail_silently=False,
            )
            logger.info("Account deletion email sent")
            return True
        except Exception:
            logger.error("Account deletion email failed")
            return False


