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


def _delete_storage_file(name: str, storage=None) -> None:
    """Best-effort zmazanie súboru z danej storage (default_storage ak nie je daná).

    Súbory môžu byť na rôznych backendoch: avatar je na default_storage (verejné),
    obrázky správ na privátnom PrivateMessageStorage. Volajúci preto pri správach
    odovzdá storage konkrétneho poľa, inak by default_storage súbor v S3 nenašiel
    a ostal by ako orphan.
    """
    if not name:
        return
    target = storage or default_storage
    try:
        target.delete(name)
    except Exception as exc:  # pragma: no cover - best effort
        logger.warning("Account deletion: storage delete failed: %s", exc)


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
    signály (S3 cleanup). Recenzie sa mažú obojsmerne – napísané (reviewer)
    aj prijaté (reviewed_user) používateľom (rozhodnutie B).
    """
    from portfolio.models import PortfolioItem, PortfolioItemLike

    from .models import (
        BugReport,
        EmailVerification,
        FavoriteUser,
        FeedPost,
        FeedPostComment,
        FeedPostCommentLike,
        FeedPostLike,
        FeedPostTag,
        Notification,
        OfferedSkill,
        OfferedSkillLike,
        ProfileLike,
        Review,
        ReviewLike,
    )

    # Ponuky + portfólio (S3 obrázky rieši post_delete signál na *Image modeloch).
    OfferedSkill.objects.filter(user=user).delete()
    PortfolioItem.objects.filter(owner=user).delete()

    # Feed príspevky autora (fotku v S3 upratuje post_delete signál na FeedPost;
    # lajky/komentáre/nahlásenia NA týchto príspevkoch zaniknú cez CASCADE).
    # Komentáre a lajky používateľa POD príspevkami iných sa mažú explicitne –
    # rovnaká konvencia ako Review.reviewer/ReviewLike. Nahlásenia, ktoré user
    # podal na cudzí obsah, sa NEmažú (moderačný audit – ako Photo/Review/UserReport).
    FeedPost.objects.filter(author=user).delete()
    FeedPostComment.objects.filter(author=user).delete()
    FeedPostLike.objects.filter(user=user).delete()
    # Lajky komentárov: tie POD vlastnými komentármi aj tie na vlastných
    # príspevkoch už zanikli cez CASCADE vyššie; tento riadok maže lajky, ktoré
    # používateľ rozdal pod CUDZÍMI komentármi – rovnaká konvencia ako
    # FeedPostLike (CASCADE cez `user` nevystrelí, User riadok sa neruší).
    FeedPostCommentLike.objects.filter(user=user).delete()
    # Označenia tohto používateľa v CUDZÍCH príspevkoch. FeedPostTag.tagged_user
    # je síce CASCADE, ale User riadok sa nemaže (len anonymizuje), takže CASCADE
    # nevystrelí – bez tohto riadku by v cudzích príspevkoch ostalo označenie
    # odkazujúce na zmazaný účet. Tagy na vlastných príspevkoch zanikli vyššie.
    FeedPostTag.objects.filter(tagged_user=user).delete()

    # Recenzie napísané používateľom o iných (rozhodnutie B – tvrdé zmazanie).
    Review.objects.filter(reviewer=user).delete()
    # Recenzie PRIJATÉ používateľom (reviewed_user=user) – obojsmerné mazanie ako
    # pri ProfileLike/FavoriteUser nižšie. Pred Fázou 1 zanikali cez CASCADE pri
    # zmazaní ponúk; po prechode na Review.offer=SET_NULL by inak osireli a ostali
    # by v nich owner_response texty tohto používateľa (jeho PII).
    Review.objects.filter(reviewed_user=user).delete()

    # Lajky, obľúbení (aj keď si tohto usera obľúbili iní – stráca zmysel).
    ReviewLike.objects.filter(user=user).delete()
    OfferedSkillLike.objects.filter(user=user).delete()
    PortfolioItemLike.objects.filter(user=user).delete()
    ProfileLike.objects.filter(user=user).delete()
    ProfileLike.objects.filter(profile_user=user).delete()
    FavoriteUser.objects.filter(user=user).delete()
    FavoriteUser.objects.filter(favorite_user=user).delete()

    # Vlastné notifikácie (kde je user príjemca). Notifikácie iných, kde je
    # user aktérom, sa nemažú (patria iným) – ich PII scrubuje
    # _scrub_actor_notifications (actor FK je navyše SET_NULL).
    Notification.objects.filter(user=user).delete()

    # Verifikačné tokeny. (AccountDeletionRequest sa ZÁMERNE nemaže tu – OAuth
    # confirm flow ho označuje is_used=True až PO anonymize_user ako audit +
    # reuse-guard; mazanie by rozbilo confirm view. Viď BOD 12 – čaká na rozhodnutie.)
    EmailVerification.objects.filter(user=user).delete()
    BugReport.objects.filter(reported_by=user).delete()


def _scrub_shared_owner_snapshots(user) -> None:
    """
    GDPR: anonymizuje meno zmazaného používateľa v CUDZÍCH feed príspevkoch,
    ktoré zdieľajú jeho obsah.

    Odkedy možno zdieľať aj cudzí obsah, môže ``FeedPost.shared_owner_display_name``
    obsahovať meno INÉHO používateľa, než je autor príspevku – ten príspevok sa
    teda pri anonymizácii vlastníka nemaže (patrí niekomu inému) a zmrazené meno
    by v ňom zostalo natrvalo. Prepisujeme na neutrálnu hodnotu BEZ ohľadu na
    (historické) meno – rovnaký dôvod a vzor ako ``_scrub_actor_notifications``.

    ``shared_owner`` FK sa ZÁMERNE nemaže: nesie identitu potrebnú na vynútenie
    blokovania/súkromného profilu aj po zmazaní originálu, a po scrube z nej už
    nemožno prečítať žiadne PII (User riadok je anonymizovaný).
    """
    from .models import FeedPost

    replacement = "Zmazaný používateľ"
    # shared_post_caption je zmrazená kópia TEXTU zmazaného používateľa (jeho
    # voľný príspevok zdieľaný ďalej), takže s menom scrubujeme aj ten – inak by
    # jeho obsah žil ďalej v cudzom zdieľaní. Prázdny reťazec, nie náhradný
    # text: pri zdieľaní ponuky/portfólia je pole aj tak prázdne.
    FeedPost.objects.filter(shared_owner=user).exclude(
        shared_owner_display_name=replacement, shared_post_caption=""
    ).update(shared_owner_display_name=replacement, shared_post_caption="")


def _scrub_actor_notifications(user) -> None:
    """
    GDPR: anonymizuje PII zmazaného používateľa v notifikáciách INÝCH používateľov,
    kde vystupuje ako aktér.

    title/body prepíšeme na neutrálnu hodnotu BEZ ohľadu na (historické) meno –
    string-replace aktuálneho display_name by minul staré meno, ak si ho používateľ
    medzičasom zmenil. data JSONField obsahuje len pseudonymné ID a enum kódy
    (žiadne meno ani voľný text), preto ho netreba scrubovať.
    """
    from .models import Notification

    replacement = "Zmazaný používateľ"
    to_update = []
    for notification in Notification.objects.filter(actor=user).only(
        "id", "title", "body"
    ):
        if notification.title == replacement and notification.body == replacement:
            continue  # idempotencia (opätovné spustenie anonymizácie)
        notification.title = replacement
        notification.body = replacement
        to_update.append(notification)

    if to_update:
        Notification.objects.bulk_update(to_update, ["title", "body"])


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

    # (storage, name) páry zachyť PRED vyprázdnením polí. Storage berieme z
    # konkrétneho FieldFile (image.storage / image_thumbnail.storage), lebo obrázky
    # správ môžu byť na privátnom S3 (PrivateMessageStorage), nie na default_storage.
    storage_refs: list[tuple] = []
    for message in messages:
        image_file = message.image
        thumbnail_file = message.image_thumbnail
        image_name = getattr(image_file, "name", "") or ""
        thumbnail_name = getattr(thumbnail_file, "name", "") or ""
        if image_name:
            storage_refs.append((getattr(image_file, "storage", None), image_name))
        if thumbnail_name:
            storage_refs.append((getattr(thumbnail_file, "storage", None), thumbnail_name))
        message.is_deleted = True
        message.text = ""
        message.image = ""
        message.image_thumbnail = ""

    Message.objects.bulk_update(
        messages, ["is_deleted", "text", "image", "image_thumbnail"]
    )

    # Súbory zmaž až po úspešnom commite (pri rollbacku sa on_commit zahodí).
    for storage, name in storage_refs:
        transaction.on_commit(
            lambda storage=storage, name=name: _delete_storage_file(name, storage)
        )


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

    # Názov avatara zachyť PRED scrubom – ten nastaví avatar=None. Avatar je na
    # default_storage (nemá vlastný storage=), takže ho mažeme cez default.
    avatar_name = _avatar_storage_name(locked)

    _delete_owned_content(locked)
    # PII zmazaného usera v notifikáciách iných (kde je aktér) – title/body scrub
    # na neutrálnu hodnotu (nezávisle od aktuálneho/historického mena).
    _scrub_actor_notifications(locked)
    # Meno tohto usera zmrazené v cudzích feed príspevkoch, ktoré zdieľajú jeho
    # obsah (jeho vlastné príspevky už zmazal _delete_owned_content vyššie).
    _scrub_shared_owner_snapshots(locked)
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
