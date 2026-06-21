"""
GDPR – anonymizácia (zmazanie) používateľského účtu.

Zdieľaná logika pre oba flow (heslový aj OAuth-email). Účet sa NEmaže tvrdo:
messaging (Message/Conversation/Participant) a SkillRequestTermination používajú
on_delete=PROTECT, aby konverzácie a história ostatných používateľov ostali
neporušené. Namiesto toho:
  - vlastný obsah bez väzby na iných sa tvrdo zmaže (+ S3 súbory cez signály),
  - osobné údaje (PII) na User/UserProfile sa anonymizujú,
  - účet sa deaktivuje (is_active=False) a tokeny sa zneplatnia.
"""

import logging
import uuid

from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.db import transaction

logger = logging.getLogger("swaply")

User = get_user_model()


def _delete_avatar_file(user) -> None:
    """Best-effort zmazanie avatara zo storage (S3/lokál)."""
    name = getattr(getattr(user, "avatar", None), "name", "") or ""
    if not name:
        return
    try:
        default_storage.delete(name)
    except Exception as exc:  # pragma: no cover - best effort
        logger.warning("Account deletion: avatar delete failed: %s", exc)


def _blacklist_user_tokens(user) -> None:
    """Blacklistne všetky aktívne refresh tokeny používateľa (SimpleJWT)."""
    try:
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )

        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
    except Exception as exc:  # pragma: no cover - best effort
        logger.warning("Account deletion: token blacklist failed: %s", exc)


def _delete_owned_content(user) -> None:
    """
    Zmaže obsah patriaci výhradne tomuto používateľovi.

    OfferedSkill/PortfolioItem mažú svoje obrázky cez CASCADE + post_delete
    signály (S3 cleanup). Review napísané používateľom sa mažú (rozhodnutie B).
    """
    from portfolio.models import PortfolioItem

    from .models import (
        EmailVerification,
        FavoriteUser,
        Notification,
        OfferedSkill,
        OfferedSkillLike,
        Review,
        ReviewLike,
    )

    # Ponuky + portfólio (S3 obrázky rieši post_delete signál na *Image modeloch).
    OfferedSkill.objects.filter(user=user).delete()
    PortfolioItem.objects.filter(owner=user).delete()

    # Recenzie napísané používateľom o iných (rozhodnutie B – tvrdé zmazanie).
    Review.objects.filter(reviewer=user).delete()

    # Lajky, obľúbení (aj keď si tohto usera obľúbili iní – stráca zmysel).
    ReviewLike.objects.filter(user=user).delete()
    OfferedSkillLike.objects.filter(user=user).delete()
    FavoriteUser.objects.filter(user=user).delete()
    FavoriteUser.objects.filter(favorite_user=user).delete()

    # Vlastné notifikácie (notifikácie iných, kde je actor, riešia SET_NULL).
    Notification.objects.filter(user=user).delete()

    # Verifikačné aj deletion tokeny.
    EmailVerification.objects.filter(user=user).delete()


def _scrub_user_pii(user) -> None:
    """Prepíše všetky osobné údaje na User neutrálnymi/anonymnými hodnotami."""
    anon = uuid.uuid4().hex
    user.email = f"deleted-user-{anon}@deleted.local"
    user.username = f"deleted-user-{anon}"
    user.first_name = ""
    user.last_name = ""
    user.phone = ""
    user.contact_email = ""
    user.bio = ""
    user.location = ""
    user.district = ""
    user.ico = ""
    user.company_name = ""
    user.website = ""
    user.additional_websites = []
    user.linkedin = ""
    user.facebook = ""
    user.instagram = ""
    user.youtube = ""
    user.whatsapp = ""
    user.job_title = ""
    user.avatar = None
    user.slug = f"deleted-user-{anon}"
    user.is_active = False
    user.is_verified = False
    user.set_unusable_password()
    user.save()


def _scrub_user_profile(user) -> None:
    profile = getattr(user, "profile", None)
    if profile is None:
        return
    profile.mfa_enabled = False
    profile.mfa_secret = ""
    profile.save(update_fields=["mfa_enabled", "mfa_secret", "updated_at"])


@transaction.atomic
def anonymize_user(user) -> None:
    """
    Vykoná kompletnú GDPR anonymizáciu účtu v jednej transakcii.

    Atomická operácia – pri čiastočnom zlyhaní sa nič nezapíše (žiadny
    polovičný stav). Idempotentná v rozumnej miere (opätovné spustenie na už
    anonymizovanom účte nič nepokazí).
    """
    # Lock riadku, aby súbežné požiadavky (dvojklik) nebežali paralelne.
    locked = User.objects.select_for_update().get(pk=user.pk)

    _delete_owned_content(locked)
    _delete_avatar_file(locked)
    _scrub_user_pii(locked)
    _scrub_user_profile(locked)
    _blacklist_user_tokens(locked)

    try:
        from .authentication import invalidate_user_auth_cache

        invalidate_user_auth_cache(locked.pk)
    except Exception:  # pragma: no cover - best effort
        pass

    logger.info("Account anonymized (GDPR erasure) for user_id=%s", locked.pk)
