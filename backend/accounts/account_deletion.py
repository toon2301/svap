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


def _avatar_storage_name(user) -> str:
    """Názov avatar súboru v storage (prázdny reťazec, ak avatar nie je)."""
    return getattr(getattr(user, "avatar", None), "name", "") or ""


def _delete_storage_file(name: str) -> None:
    """Best-effort zmazanie súboru zo storage (S3/lokál)."""
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


def _scrub_user_messages(user) -> None:
    """
    GDPR: anonymizuje OBSAH správ odoslaných používateľom (text + obrázky).

    Sender FK zámerne ponechávame (UI zobrazí „Zmazaný používateľ"), aby
    história konverzácie protistrany ostala neporušená (PROTECT dizajn).
    Výsledný stav je rovnaký ako pri delete_message_for_all:
    is_deleted=True, prázdny text aj obrázky, súbory zmazané zo storage.

    Používa bulk_update (jeden DB zápis) namiesto save() v slučke, aby
    operácia škálovala aj pri veľkom počte správ.
    """
    from messaging.models import Message

    messages = list(
        Message.objects.filter(sender=user, is_deleted=False).only(
            "id", "image", "image_thumbnail"
        )
    )
    if not messages:
        return

    storage_names: list[str] = []
    for message in messages:
        image_name = getattr(message.image, "name", "") or ""
        thumbnail_name = getattr(message.image_thumbnail, "name", "") or ""
        if image_name:
            storage_names.append(image_name)
        if thumbnail_name:
            storage_names.append(thumbnail_name)
        message.is_deleted = True
        message.text = ""
        message.image = ""
        message.image_thumbnail = ""

    Message.objects.bulk_update(
        messages, ["is_deleted", "text", "image", "image_thumbnail"]
    )

    # Súbory zmaž až po úspešnom commite (pri rollbacku sa on_commit zahodí).
    for name in storage_names:
        transaction.on_commit(lambda name=name: _delete_storage_file(name))


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

    # Názov avatara zachyť PRED scrubom – ten nastaví avatar=None.
    avatar_name = _avatar_storage_name(locked)

    _delete_owned_content(locked)
    # Obsah odoslaných správ anonymizujeme (text + obrázky); riadky a sender FK
    # ostávajú, aby história protistrany bola neporušená (PROTECT dizajn).
    _scrub_user_messages(locked)

    # Súbor avatara (nenávratná operácia mimo DB) zmaž AŽ PO úspešnom commite.
    # transaction.on_commit sa pri rollbacku zahodí, takže ak niektorá z DB
    # operácií nižšie zlyhá, súbor sa NEodstráni a stav ostane konzistentný.
    if avatar_name:
        transaction.on_commit(lambda: _delete_storage_file(avatar_name))

    _scrub_user_pii(locked)
    _scrub_user_profile(locked)
    _blacklist_user_tokens(locked)

    try:
        from .authentication import invalidate_user_auth_cache

        invalidate_user_auth_cache(locked.pk)
    except Exception:  # pragma: no cover - best effort
        pass

    logger.info("Account anonymized (GDPR erasure) for user_id=%s", locked.pk)
