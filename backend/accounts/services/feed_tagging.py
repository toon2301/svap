"""Pravidlá označovania (tagovania) používateľov v príspevkoch na nástenke.

Rovnaký vzor ako ``feed_share_visibility``: čisté pravidlá bez importu modelov
na úrovni modulu (model ``FeedPostTag`` si tento modul importuje, takže opačný
import by uzavrel kruh) a znovupoužitie ``user_block_exists_between`` cez lazy
import.

Označenie je OKAMŽITÉ – označený nič neschvaľuje. Jediná tvrdá prekážka je
blokovanie: rovnako ako pri zdieľaní ponuky nesmie zablokovaný ťahať druhú
stranu do svojho obsahu (a naopak).
"""

import logging

logger = logging.getLogger(__name__)

# Kódy dôvodov – API vrstva ich mapuje na preložené hlášky.
REASON_TAG_BLOCKED = "feed_tag_blocked"
REASON_TAG_LIMIT = "feed_tag_limit_reached"

# Strop označených na jeden príspevok. Rád zodpovedá existujúcim limitom appky
# (8 fotiek/portfólio položku, 15 položiek/používateľa) – dosť pre reálne
# použitie, málo na to, aby sa z tagovania stal spamovací kanál.
MAX_FEED_POST_TAGS = 10

TAG_REASON_MESSAGES = {
    REASON_TAG_BLOCKED: (
        "Tohto používateľa nemožno označiť kvôli blokovaniu medzi vami."
    ),
    REASON_TAG_LIMIT: (
        f"V jednom príspevku možno označiť najviac {MAX_FEED_POST_TAGS} používateľov."
    ),
}


def feed_post_tag_block_reason(*, author_id, tagged_user_id):
    """Vráti kód dôvodu, prečo používateľa NEmožno označiť – alebo None.

    Označenie seba samého je povolené (autor je vo vlastnom príspevku), rovnako
    ako self-like pri ``FeedPostLike`` – ide o obsah, nie o identitu.
    """
    if not author_id or not tagged_user_id:
        return None
    if int(author_id) == int(tagged_user_id):
        return None

    # Lazy import – user_blocks importuje accounts.models, a accounts.models si
    # importuje tento modul; na úrovni modulu by to uzavrelo kruh.
    from accounts.services.user_blocks import user_block_exists_between

    if user_block_exists_between(
        first_user_id=author_id,
        second_user_id=tagged_user_id,
    ):
        return REASON_TAG_BLOCKED
    return None


def normalize_tagged_user_ids(values) -> list[int]:
    """Očisti vstup na zoznam kladných int ID bez duplicít, poradie zachovaj."""
    normalized: list[int] = []
    for value in values or ():
        try:
            user_id = int(value)
        except (TypeError, ValueError):
            continue
        if user_id > 0:
            normalized.append(user_id)
    return list(dict.fromkeys(normalized))


def apply_feed_post_tags(post, tagged_user_ids) -> list:
    """Označ používateľov v príspevku; vráti novovytvorené tagy.

    Neexistujúce a neaktívne ID sa TICHO preskočia – jedno zastarané ID
    z hromadného zoznamu nesmie zhodiť celé vytvorenie príspevku. Blokovanie
    a prekročenie limitu sú naopak tvrdé chyby (``ValidationError``): to nie sú
    zastarané dáta, ale explicitná akcia autora, ktorú treba nahlásiť.

    Celé vyhodnotenie beží pod riadkovými zámkami (viď poradie nižšie), takže
    súbežné volania nad tým istým príspevkom sa serializujú a nemôžu spolu
    prekročiť ``MAX_FEED_POST_TAGS`` ani vyrobiť tag na práve anonymizovaný účet.
    """
    from django.contrib.auth import get_user_model
    from django.core.exceptions import ValidationError
    from django.db import transaction

    from accounts.models import FeedPost, FeedPostTag
    from accounts.services.user_blocks import lock_users_for_update

    user_model = get_user_model()
    candidate_ids = normalize_tagged_user_ids(tagged_user_ids)
    if not candidate_ids:
        return []

    with transaction.atomic():
        # Poradie zámkov je ZÁMERNE User → FeedPost, rovnako ako v
        # ``anonymize_user`` (zamkne User a až potom maže jeho obsah). Opačné
        # poradie by voči anonymizácii vytvorilo inverziu zámkov, a teda
        # deadlock. ``lock_users_for_update`` navyše zamyká v zoradenom poradí,
        # takže si neuzamknú cestu ani dve súbežné tagovania.
        #
        # Zámok na User MUSÍ byť pred čítaním is_active: inak by tagovanie
        # prečítalo starú hodnotu (True), počkalo s insertom na commit
        # anonymizácie a vyrobilo tag na už upratanom účte.
        lock_users_for_update(user_ids=candidate_ids)

        # Zámok na príspevku MUSÍ byť pred čítaním existujúcich tagov a limitu:
        # bez neho by dve súbežné volania videli ten istý počet a obe pridali
        # „posledný" tag (limit prekročený), prípadne by si vpadli do
        # UniqueConstraint namiesto tichého preskočenia duplicity.
        locked_post = FeedPost.objects.select_for_update().filter(pk=post.pk).first()
        if locked_post is None:
            return []  # príspevok medzitým zmizol

        active_ids = set(
            user_model.objects.filter(id__in=candidate_ids, is_active=True).values_list(
                "id", flat=True
            )
        )
        # Poradie zo vstupu zachovávame, len odfiltrujeme neplatné.
        valid_ids = [user_id for user_id in candidate_ids if user_id in active_ids]
        if not valid_ids:
            return []

        # Blokovanie over PRED akýmkoľvek zápisom, nech nevzniknú polovičné tagy.
        for user_id in valid_ids:
            reason = feed_post_tag_block_reason(
                author_id=locked_post.author_id,
                tagged_user_id=user_id,
            )
            if reason is not None:
                raise ValidationError(TAG_REASON_MESSAGES[reason], code=reason)

        existing_ids = set(
            FeedPostTag.objects.filter(post=locked_post).values_list(
                "tagged_user_id", flat=True
            )
        )
        # Duplicity ticho preskoč – UniqueConstraint je posledná poistka.
        new_ids = [user_id for user_id in valid_ids if user_id not in existing_ids]

        # Limit sa počíta z CELKOVÉHO počtu na príspevku, nie z veľkosti dávky.
        if len(existing_ids) + len(new_ids) > MAX_FEED_POST_TAGS:
            raise ValidationError(
                TAG_REASON_MESSAGES[REASON_TAG_LIMIT],
                code=REASON_TAG_LIMIT,
            )

        # Zámerne create() v cykle, nie bulk_create – bulk_create obchádza
        # save(), a tým aj modelovú kontrolu blokovania. Odovzdávame zamknutý
        # objekt, takže save() číta author_id z cache (žiadny dotaz navyše).
        created = [
            FeedPostTag.objects.create(post=locked_post, tagged_user_id=user_id)
            for user_id in new_ids
        ]

        if created:
            # Notifikuj až po commite – pri rollbacku (napr. zlyhanie ďalej vo
            # vytváraní príspevku) sa on_commit zahodí a nikomu nepríde
            # notifikácia na neexistujúce označenie.
            transaction.on_commit(
                lambda: _notify_tagged_users(
                    post=locked_post,
                    actor=locked_post.author,
                    tagged_user_ids=[tag.tagged_user_id for tag in created],
                )
            )
        return created


def _notify_tagged_users(*, post, actor, tagged_user_ids) -> None:
    """Po commite pošli každému označenému VLASTNÚ notifikáciu.

    Zlyhanie notifikácie nesmie zhodiť už uložené označenia (rovnaký vzor ako
    notify_*_about_like vo feed views) – logujeme a pokračujeme ďalším.
    """
    from django.contrib.auth import get_user_model

    from accounts.services.notifications import (
        create_feed_post_tagged_notification,
    )

    tagged_users = get_user_model().objects.filter(id__in=tagged_user_ids)
    for tagged_user in tagged_users:
        try:
            create_feed_post_tagged_notification(
                post=post,
                tagged_user=tagged_user,
                actor=actor,
            )
        except Exception:
            logger.exception(
                "Feed post tag notification dispatch failed",
                extra={
                    "post_id": getattr(post, "id", None),
                    "tagged_user_id": getattr(tagged_user, "id", None),
                    "actor_id": getattr(actor, "id", None),
                },
            )
