"""
Kontaktný formulár – verejný endpoint.
"""

import html
import logging
import time

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
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
    subject = "[Svaply] Kontaktná správa"
    recipient = _support_email()
    safe_email = html.escape(user_email)
    safe_message = html.escape(message)
    text_message = (
        f"Nová správa z kontaktného formulára.\n\n"
        f"Email odosielateľa: {user_email}\n\n"
        f"Správa:\n{message}\n"
    )
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7C3AED;">Kontaktná správa – Svaply</h2>
            <p><strong>Email odosielateľa:</strong> {safe_email}</p>
            <p><strong>Správa:</strong></p>
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
            subject,
        )
        logger.info(
            "CONTACT_EMAIL_CONSOLE_BODY_PREVIEW: %s",
            text_message[:500],
        )
        return

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
        reply_to=[user_email],
    )
    msg.attach_alternative(html_message, "text/html")
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
            {"message": "Ďakujeme. Vaša správa bola odoslaná."},
            status=status.HTTP_200_OK,
        )

    user_email = serializer.validated_data["email"]
    message = serializer.validated_data["message"]

    try:
        _send_contact_email(user_email=user_email, message=message)
    except Exception as exc:
        logger.error(
            "Contact form email delivery failed",
            extra={
                "error_type": type(exc).__name__,
                "backend": getattr(settings, "EMAIL_BACKEND", None),
            },
        )
        return Response(
            {"error": "Chyba pri odosielaní správy. Skúste to neskôr."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {"message": "Ďakujeme. Vaša správa bola odoslaná."},
        status=status.HTTP_200_OK,
    )
