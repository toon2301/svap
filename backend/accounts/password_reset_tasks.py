"""Celery odoslanie e-mailu s odkazom na reset hesla."""

from __future__ import annotations

from celery import shared_task

from accounts.services.password_reset_email import send_password_reset_email


@shared_task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=30,
)
def send_password_reset_email_task(self, *, user_id: int) -> bool:
    """Pošle odkaz na reset hesla mimo HTTP requestu.

    Opakovanie pri zlyhaní (výpadok SMTP) nič nerozbije: token je odvodený od
    hashu hesla a posledného prihlásenia, takže všetky vydané odkazy prestanú
    platiť v okamihu zmeny hesla. Najhorší dôsledok opakovania je, že správa
    príde viackrát.
    """
    return send_password_reset_email(user_id=int(user_id))
