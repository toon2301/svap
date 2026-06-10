"""
Kontaktný formulár – verejný endpoint.
"""

import html
import logging
import time

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy as _lazy
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from swaply.rate_limiting import contact_form_rate_limit

from ..contact_serializers import ContactFormSerializer

logger = logging.getLogger(__name__)


def _support_email() -> str:
    return getattr(settings, "SUPPORT_EMAIL", "info@svaply.com")


def _send_contact_email(*, user_email: str, message: str) -> None:
    subject = _lazy("[Svaply] Kontaktná správa")
    recipient = _support_email()
    safe_email = html.escape(user_email)
    safe_message = html.escape(message)
    sender_label = _lazy("Email odosielateľa")
    message_label = _lazy("Správa")
    text_message = (
        f"{_lazy('Nová správa z kontaktného formulára.')}\n\n"
        f"{sender_label}: {user_email}\n\n"
        f"{message_label}:\n{message}\n"
    )
    html_title = _lazy("Kontaktná správa – Svaply")
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7C3AED;">{html_title}</h2>
            <p><strong>{sender_label}:</strong> {safe_email}</p>
            <p><strong>{message_label}:</strong></p>
            <p style="white-space: pre-wrap;">{safe_message}</p>
        </div>
    </body>
    </html>
    """

    backend = getattr(settings, "EMAIL_BACKEND", "")
    started = time.time()
    logger.info(
        "CONTACT_EMAIL_SEND_START",
        extra={
            "backend": backend,
            "host": getattr(settings, "EMAIL_HOST", None),
            "port": getattr(settings, "EMAIL_PORT", None),
            "use_tls": getattr(settings, "EMAIL_USE_TLS", None),
            "timeout": getattr(settings, "EMAIL_TIMEOUT", None),
            "recipient_domain": recipient.split("@")[-1] if "@" in recipient else None,
        },
    )

    # Console backend na Windows nevie vypísať UTF-8 (slovenčina) – logujeme náhľad.
    if backend.endswith("console.EmailBackend"):
        logger.info(
            "CONTACT_EMAIL_CONSOLE_PREVIEW to=%s reply_to=%s subject=%s",
            recipient,
            user_email,
            str(subject),
        )
        logger.info(
            "CONTACT_EMAIL_CONSOLE_BODY_PREVIEW: %s",
            str(text_message)[:500],
        )
        return

    msg = EmailMultiAlternatives(
        subject=str(subject),
        body=str(text_message),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
        reply_to=[user_email],
    )
    msg.attach_alternative(str(html_message), "text/html")
    sent_count = msg.send(fail_silently=False)

    logger.info(
        "CONTACT_EMAIL_SEND_DONE",
        extra={
            "duration_ms": int((time.time() - started) * 1000),
            "sent_count": sent_count,
        },
    )
    if sent_count < 1:
        raise RuntimeError("SMTP backend returned 0 for contact email")


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@contact_form_rate_limit
def contact_form_view(request):
    serializer = ContactFormSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if serializer.validated_data.get("_honeypot"):
        return Response(
            {"message": _("Ďakujeme. Vaša správa bola odoslaná.")},
            status=status.HTTP_200_OK,
        )

    user_email = serializer.validated_data["email"]
    message = serializer.validated_data["message"]

    try:
        _send_contact_email(user_email=user_email, message=message)
    except Exception:
        logger.exception(
            "Contact form email delivery failed",
            extra={
                "backend": getattr(settings, "EMAIL_BACKEND", None),
                "email_host": getattr(settings, "EMAIL_HOST", None),
                "email_port": getattr(settings, "EMAIL_PORT", None),
            },
        )
        return Response(
            {"error": _("Chyba pri odosielaní správy. Skúste to neskôr.")},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {"message": _("Ďakujeme. Vaša správa bola odoslaná.")},
        status=status.HTTP_200_OK,
    )
