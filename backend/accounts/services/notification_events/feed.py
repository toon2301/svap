"""Notifikácie k nástenke (feed): lajk, komentár, označenie.

Dedup má zmysel len pri lajku (unlike+like sa dá opakovať donekonečna).
Komentár nesie zakaždým nový obsah a označenie je z podstaty jednorazové
(``UniqueConstraint(post, tagged_user)`` + žiadny untag endpoint), takže tie
dedup nepotrebujú.
"""

from __future__ import annotations

from accounts.models import Notification, NotificationType

from ..notification_core import create_notification


def create_feed_post_liked_notification(*, post, actor) -> Notification | None:
    """Lajk príspevku – presne vzor create_portfolio_liked_notification:
    self-like bez notifikácie, dedup cez data__post_id + actor (unlike+like
    nespamuje autora)."""
    author = getattr(post, "author", None)
    if author is None or getattr(author, "id", None) == getattr(actor, "id", None):
        return None

    existing = (
        Notification.objects.filter(
            user=author,
            type=NotificationType.FEED_POST_LIKED,
            data__post_id=post.id,
            actor=actor,
        )
        .order_by("-created_at", "-id")
        .first()
    )
    if existing is not None:
        return existing

    return create_notification(
        user=author,
        notif_type=NotificationType.FEED_POST_LIKED,
        title="Páči sa mi tvoj príspevok",
        # Body si drží text aj tu, hoci FE feedové typy prekladá sám – slúži
        # konzumentom mimo neho (push notifikácie), ktorí prekladovú vrstvu
        # appky nemajú.
        body=f"{(getattr(actor, 'display_name', '') or '').strip() or 'Používateľ'}"
        " lajkol tvoj príspevok.",
        actor=actor,
        data={
            "post_id": post.id,
        },
    )


def create_feed_post_comment_liked_notification(*, comment, actor) -> Notification | None:
    """Lajk komentára – presne vzor create_feed_post_liked_notification.

    DEDUP (cez ``data__comment_id`` + actor) je tu správny z rovnakého dôvodu
    ako pri lajku príspevku: lajk je idempotentný STAV, ktorý sa dá odlajkovať
    a znova lajkovať donekonečna – bez dedupu by sa tým dal autor komentára
    spamovať. Komentár/zdieľanie dedup nemajú, lebo sú to opakovateľné akcie
    s vlastným novým obsahom.

    Príjemcom je autor komentára; self-like notifikáciu nevytvára.
    """
    author = getattr(comment, "author", None)
    if author is None or getattr(author, "id", None) == getattr(actor, "id", None):
        return None

    existing = (
        Notification.objects.filter(
            user=author,
            type=NotificationType.FEED_POST_COMMENT_LIKED,
            data__comment_id=comment.id,
            actor=actor,
        )
        .order_by("-created_at", "-id")
        .first()
    )
    if existing is not None:
        return existing

    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    return create_notification(
        user=author,
        notif_type=NotificationType.FEED_POST_COMMENT_LIKED,
        title="Páči sa mi tvoj komentár",
        body=f"{actor_name} lajkol tvoj komentár.",
        actor=actor,
        data={
            # post_id nesie preklik (permalink príspevku), comment_id dedup.
            "post_id": comment.post_id,
            "comment_id": comment.id,
        },
    )


def create_feed_post_commented_notification(
    *, post, actor, comment=None
) -> Notification | None:
    """Komentár k príspevku – ZÁMERNE bez dedupu (na rozdiel od lajku):
    každý komentár nesie nový obsah, takže autor má dostať notifikáciu vždy.
    Self-comment notifikáciu nevytvára (konvencia všetkých sociálnych typov)."""
    author = getattr(post, "author", None)
    if author is None or getattr(author, "id", None) == getattr(actor, "id", None):
        return None

    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    return create_notification(
        user=author,
        notif_type=NotificationType.FEED_POST_COMMENTED,
        title="Komentár k príspevku",
        body=f"{actor_name} komentoval tvoj príspevok.",
        actor=actor,
        data={
            "post_id": post.id,
            # Umožní na FE doscrollovať rovno ku KONKRÉTNEMU komentáru, nie
            # len otvoriť príspevok s rozbalenými komentármi.
            "comment_id": getattr(comment, "id", None),
        },
    )


def create_feed_post_shared_notification(*, post, actor):
    """Niekto zdieľal obsah ďalej – notifikácia pôvodnému vlastníkovi.

    ZÁMERNE bez dedupu (ako komentár, nie ako lajk): zdieľanie je opakovateľná
    akcia s vlastným obsahom – ten istý človek môže ten istý koreň zdieľať
    viackrát s iným sprievodným textom, a každé také zdieľanie je samostatná
    udalosť, o ktorej má vlastník vedieť. Dedup by druhé a ďalšie zdieľanie
    ticho zahodil.

    ``post`` je NOVÉ zdieľanie; príjemcom je jeho ``shared_owner`` (vlastník
    koreňového obsahu), takže funguje rovnako pre ponuku, portfólio aj príspevok.
    Self-share notifikáciu nevytvára.
    """
    owner = getattr(post, "shared_owner", None)
    if owner is None or getattr(owner, "id", None) == getattr(actor, "id", None):
        return None

    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    return create_notification(
        user=owner,
        notif_type=NotificationType.FEED_POST_SHARED,
        title="Zdieľanie tvojho obsahu",
        body=f"{actor_name} zdieľal tvoj obsah ďalej.",
        actor=actor,
        data={
            "post_id": post.id,
        },
    )


def create_feed_post_tagged_notification(*, post, tagged_user, actor):
    """Označenie v príspevku – notifikácia označenému.

    BEZ dedupu, a to bezpečne: ``UniqueConstraint(post, tagged_user)`` pripúšťa
    jeden tag na dvojicu, ``apply_feed_post_tags`` už existujúce preskakuje a
    appka nemá untag endpoint – jeden tag teda znamená práve jednu notifikáciu
    a duplicitu nemožno vyrobiť ani opakovaným volaním.

    Self-tag (autor označí sám seba – v appke povolené) notifikáciu nevytvára,
    rovnaký vzor ako self-like.
    """
    if tagged_user is None or getattr(tagged_user, "id", None) == getattr(
        actor, "id", None
    ):
        return None

    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    return create_notification(
        user=tagged_user,
        notif_type=NotificationType.FEED_POST_TAGGED,
        title="Označenie v príspevku",
        body=f"{actor_name} ťa označil v príspevku.",
        actor=actor,
        data={
            "post_id": post.id,
        },
    )
