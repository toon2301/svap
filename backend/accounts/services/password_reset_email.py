"""Zostavenie a odoslanie e-mailu s odkazom na reset hesla.

Beží MIMO HTTP requestu (viď ``accounts.password_reset_tasks``). Endpoint pre
vyžiadanie resetu tak odpovedá rovnako rýchlo bez ohľadu na to, či účet
existuje – synchrónne odosielanie cez SMTP bolo inak samo o sebe časovým
kanálom, ktorý existenciu účtu prezradil aj pri úplne neutrálnej odpovedi.

Token sa generuje AŽ TU, nie vo view: do fronty tak ide iba id používateľa a
nie použiteľný resetovací token.
"""

from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from accounts.models import User

logger = logging.getLogger(__name__)

PASSWORD_RESET_EMAIL_SUBJECT = "[Svaply] Reset hesla"


def _html_body(*, greeting_name: str, reset_url: str) -> str:
    """HTML verzia správy s odkazom na reset."""
    return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #7C3AED;">Reset hesla - Svaply</h2>

                <p>Ahoj {greeting_name},</p>

                <p>Dostali sme požiadavku na reset hesla pre váš účet v Svaply.</p>

                <p>Ak ste túto požiadavku neposlali vy, ignorujte tento email.</p>

                <p>Pre nastavenie nového hesla kliknite na tlačidlo nižšie:</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}"
                       style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Resetovať heslo
                    </a>
                </div>

                <p>Alebo skopírujte tento odkaz do prehliadača:</p>
                <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
                    {reset_url}
                </p>

                <p><strong>Dôležité:</strong> Tento odkaz platí len 24 hodín.</p>

                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

                <p style="font-size: 12px; color: #666;">
                    Tento email bol odoslaný automaticky, neodpovedajte naň.<br>
                    Svaply - Výmenná platforma zručností
                </p>
            </div>
        </body>
        </html>
        """


def _text_body(*, greeting_name: str, reset_url: str) -> str:
    """Textová verzia správy pre klientov bez HTML."""
    return f"""
        Reset hesla - Svaply

        Ahoj {greeting_name},

        Dostali sme požiadavku na reset hesla pre váš účet v Svaply.

        Ak ste túto požiadavku neposlali vy, ignorujte tento email.

        Pre nastavenie nového hesla kliknite na odkaz:
        {reset_url}

        Dôležité: Tento odkaz platí len 24 hodín.

        --
        Tento email bol odoslaný automaticky, neodpovedajte naň.
        Svaply - Výmenná platforma zručností
        """


def send_password_reset_email(*, user_id: int) -> bool:
    """Pošle odkaz na reset hesla, ak je účet v čase odoslania stále aktívny.

    Vracia ``True``, keď bol e-mail odovzdaný na odoslanie, inak ``False``.
    Návratová hodnota slúži LEN pre logy a testy – používateľ dostal neutrálnu
    odpoveď už dávno predtým, takže výsledok nemá ako ovplyvniť to, čo vidí.

    Stav účtu sa overuje znova: medzi požiadavkou a spracovaním tasku mohol byť
    účet deaktivovaný alebo zmazaný, a vtedy sa nesmie poslať nič.
    """
    user = User.objects.filter(pk=int(user_id), is_active=True).first()
    if user is None:
        logger.info("Password reset email skipped: account no longer eligible")
        return False

    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
    greeting_name = user.first_name or "používateľ"

    send_mail(
        subject=PASSWORD_RESET_EMAIL_SUBJECT,
        message=_text_body(greeting_name=greeting_name, reset_url=reset_url),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=_html_body(greeting_name=greeting_name, reset_url=reset_url),
        fail_silently=False,
    )

    if getattr(settings, "DEBUG", False):
        logger.info(f"Password reset email sent to {user.email}")
    else:
        logger.info("Password reset email sent")
    return True
