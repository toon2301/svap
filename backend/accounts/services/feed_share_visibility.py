"""Pravidlá viditeľnosti pre zdieľanie obsahu do feedu.

Zdieľať možno KTORÝKOĽVEK verejne viditeľný obsah (nie len vlastný), preto sa
pri vzniku zdieľania overuje *viditeľnosť cieľa*, nie vlastníctvo. Pravidlá sú
zhodné s priamym prístupom k ponuke (``offer_visibility.offer_hidden_from_user``)
a so zdieľaním ponuky do správy (``messaging.services.offer_shares``):
skrytý obsah / neverejný alebo neaktívny vlastník / blokovanie v ktoromkoľvek smere.

PortfolioItem nemá ``is_hidden`` – jeho viditeľnosť určuje len vlastník
(``is_public``) + blokovanie, preto sa ``is_hidden`` posiela ako False.
"""

# Kódy dôvodov – Fáza 2 (API vrstva) ich mapuje na preložené hlášky.
REASON_MISSING_OWNER = "shared_content_owner_missing"
REASON_HIDDEN = "shared_content_hidden"
REASON_PRIVATE_OWNER = "shared_content_owner_private"
REASON_BLOCKED = "shared_content_blocked"

SHARE_REASON_MESSAGES = {
    REASON_MISSING_OWNER: "Zdieľaný obsah nemá dostupného vlastníka.",
    REASON_HIDDEN: "Túto ponuku nemožno zdieľať, pretože je skrytá.",
    REASON_PRIVATE_OWNER: (
        "Tento obsah nemožno zdieľať, pretože jeho autor má súkromný profil."
    ),
    REASON_BLOCKED: (
        "Tento obsah nemožno zdieľať kvôli blokovaniu medzi vami a jeho autorom."
    ),
}


def shared_content_share_block_reason(*, owner, author_id, is_hidden=False):
    """Vráti kód dôvodu, prečo obsah NEmožno zdieľať – alebo None, ak sa smie.

    Vlastný obsah je vždy zdieľateľný: vlastník vidí svoje aj skryté položky aj
    pri súkromnom profile (rovnaká výnimka ako v ``offer_hidden_from_user``),
    takže zdieľanie vlastnej ponuky nesmie padnúť na ``is_hidden``/``is_public``.
    """
    if owner is None:
        return REASON_MISSING_OWNER

    owner_id = int(owner.pk)
    if author_id is not None and int(author_id) == owner_id:
        return None

    if is_hidden:
        return REASON_HIDDEN
    if not getattr(owner, "is_public", True) or not getattr(owner, "is_active", True):
        return REASON_PRIVATE_OWNER

    # Lazy import – tento modul importuje model FeedPost, a user_blocks importuje
    # accounts.models, takže import na úrovni modulu by uzavrel kruh.
    from accounts.services.user_blocks import user_block_exists_between

    if user_block_exists_between(first_user_id=author_id, second_user_id=owner_id):
        return REASON_BLOCKED
    return None


def shared_content_is_publicly_visible(*, owner, is_hidden=False) -> bool:
    """Je zdroj zdieľania *práve teraz* verejne viditeľný?

    Zámerne BEZ kontroly blokovania – tá je závislá od diváka a patrí do
    čítacieho endpointu (Fáza 2), ktorý ju doloží cez ``FeedPost.shared_owner_id``.
    """
    if owner is None:
        return False
    return bool(
        not is_hidden
        and getattr(owner, "is_public", True)
        and getattr(owner, "is_active", True)
    )
