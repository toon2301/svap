"""Úprava vlastného obsahu na nástenke – text príspevku a text komentára.

Samostatný modul, lebo úprava je súvislý nový celok s vlastnými pravidlami
(kto smie, kedy sa značí „upravené"), a ani ``feed_posts``, ani ``feed_comments``
už nemajú priestor rásť ďalej.

Kto smie:
* príspevok – LEN jeho autor (``can_manage`` vzor, zhodne s mazaním),
* komentár/odpoveď – LEN autor TOHTO komentára. Zámerne užšie než mazanie:
  autor príspevku smie cudzí komentár na svojej nástenke zmazať (moderácia),
  ale prepisovať cudzí text nesmie nikto.

Časové okno na úpravu nie je – autor smie kedykoľvek.

Rozsah PATCH endpointov: LEN TEXT. Fotky sa nimi nemenia; polia o fotkách sa
z payloadu ignorujú (nečítajú sa), takže ich poslanie nič nezmení a nič
nezlyhá. Pridanie fotky rieši upload flow (``feed_uploads``), odobratie
``feed_post_image_delete_view`` nižšie – oba sú samostatné požiadavky, klient
si z nich sekvenciu poskladá sám.

``edited_at`` sa nastavuje LEN keď sa obsah reálne zmenil – opätovné odoslanie
toho istého textu nesmie z príspevku spraviť „upravený".
"""

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..feed_serializers import FeedPostCommentSerializer, FeedPostSerializer
from ..models import FeedPost, FeedPostComment, FeedPostImage
from .feed_comment_queries import _liked_comment_ids, post_comments_queryset
from .feed_posts import (
    _annotated_queryset,
    _serializer_context,
    _validation_error_response,
)
from .feed_uploads import (
    _active_images_q,
    _get_own_free_post,
    _image_not_found,
    _post_not_found,
)


def _has_content_photo(post: FeedPost) -> bool:
    """Má príspevok fotku, ktorá mu dáva obsah?

    Zamietnutá fotka sa nezobrazí nikomu, takže prázdny príspevok nezachráni;
    rozpracovaná áno – autor ju vidí ako „spracúva sa" a o chvíľu bude vonku.
    Je to ten istý predikát, akým sa počíta miesto v limite fotiek
    (``_active_images_q``), nech sa dve pravidlá o tých istých fotkách
    nerozchádzajú.
    """
    return post.images.filter(_active_images_q()).exists()


def _mark_post_edited(post: FeedPost) -> None:
    """Označí príspevok za upravený – jedno miesto pre text aj fotky.

    ``updated_at`` má ``auto_now``, ktoré sa pri ``update_fields`` uplatní len
    keď je pole vymenované; bez neho by riadok ostal s časom predošlej zmeny.
    """
    post.edited_at = timezone.now()
    post.save(update_fields=["edited_at", "updated_at"])


def _forbidden(message: str) -> Response:
    """403, nie 404: obsah je na viditeľnom príspevku, existenciu netajíme.

    Zhodné s odmietnutím pri mazaní cudzieho príspevku/komentára.
    """
    return Response({"error": message}, status=status.HTTP_403_FORBIDDEN)


def edit_feed_post(request, post: FeedPost) -> Response:
    """PATCH príspevku – mení sa výhradne ``caption``.

    PATCH je čiastočná úprava: keď kľúč ``caption`` v payloade CHÝBA, text sa
    nedotýka vôbec (klient upravuje niečo iné, napr. fotky). Prázdny reťazec je
    naopak výslovný pokyn text vymazať a podlieha validácii nižšie. Bez tohto
    rozlíšenia by požiadavka bez textového poľa ticho zmazala caption –
    a čisto textovému príspevku by vrátila ``caption_required``.

    Validácia je PRESNE tá istá ako pri vytvorení: voľný príspevok nesmie
    ostať bez textu aj bez fotky. Rozdiel je len v tom, čím sa fotka overuje –
    pri vytvorení príspevok ešte neexistuje, takže sa verí klientovmu
    ``will_attach_photo``; tu už fotky reálne existujú, takže sa pozerá na
    skutočný stav a klientovmu tvrdeniu sa neverí vôbec. Zdieľania
    (``shared_*``) môžu mať prázdny text vždy, rovnako ako pri vzniku.

    Kontrola aj zápis bežia pod zámkom príspevku – zhodne s odobratím fotky.
    Bez neho by súbežné „vymaž text" a „odober poslednú fotku" obe videli, že
    to druhé ešte existuje, a príspevok by ostal prázdny.
    """
    if post.author_id != request.user.id:
        return _forbidden("Na upravu prispevku nemas opravnenie.")

    if "caption" not in request.data:
        # Nič na zmenu – vráť aktuálny stav a `edited_at` nechaj tak.
        return _post_response(request, post)

    caption = str(request.data.get("caption") or "").strip()

    with transaction.atomic():
        locked = FeedPost.objects.select_for_update().filter(pk=post.pk).first()
        if locked is None:
            return _post_not_found()

        if (
            locked.post_type == FeedPost.PostType.FREE_POST
            and not caption
            and not _has_content_photo(locked)
        ):
            return Response(
                {
                    "error": "Volny prispevok musi mat text alebo fotku.",
                    "code": "caption_required",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if caption != locked.caption:
            locked.caption = caption
            locked.edited_at = timezone.now()
            try:
                locked.save(update_fields=["caption", "edited_at", "updated_at"])
            except ValidationError as exc:
                # Model vynucuje 500-znakový limit nezávisle od DB backendu.
                return _validation_error_response(exc)

    return _post_response(request, post)


def _post_response(request, post: FeedPost) -> Response:
    """Aktuálny stav príspevku v tom istom tvare, aký vracia zoznam/detail."""
    fresh = _annotated_queryset().get(pk=post.pk)
    serializer = FeedPostSerializer(
        fresh, context=_serializer_context(request, [fresh])
    )
    return Response(serializer.data, status=status.HTTP_200_OK)


def edit_feed_comment(
    request, post: FeedPost, comment: FeedPostComment
) -> Response:
    """PATCH komentára alebo odpovede – mení sa výhradne ``text``.

    Odpoveď je ten istý model, takže netreba nič navyše; rodičovské väzby sa
    nedotýkame, mení sa len text.
    """
    if comment.author_id != request.user.id:
        return _forbidden("Na upravu komentara nemas opravnenie.")

    text = str(request.data.get("text") or "").strip()
    if not text:
        return Response(
            {"error": "Komentar nesmie byt prazdny.", "code": "text_required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if text != comment.text:
        comment.text = text
        comment.edited_at = timezone.now()
        try:
            comment.save(update_fields=["text", "edited_at"])
        except ValidationError as exc:
            return Response(
                {
                    "error": " ".join(exc.messages),
                    "code": getattr(exc, "code", None),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Vrcholový komentár sa doserializuje cez ten istý queryset ako zoznam:
    # nesie anotované počty a najmä OHRANIČENÝ náhľad odpovedí. Priamo zo
    # `comment` by sa `replies` vyrátalo bez stropu, takže úprava komentára
    # s tisíckami odpovedí by ich všetky natiahla do odpovede.
    # Odpoveď (reply) `replies` nemá vôbec, tam netreba nič doťahovať.
    if comment.parent_comment_id is None:
        comment = post_comments_queryset(post).filter(pk=comment.pk).first() or comment

    serializer = FeedPostCommentSerializer(
        comment,
        context={
            "request": request,
            "post_author_id": post.author_id,
            "liked_feed_comment_ids": _liked_comment_ids(request.user, [comment]),
        },
    )
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_image_delete_view(request, post_id: int, image_id: int):
    """Odobratie jednej fotky z vlastného príspevku.

    Právo je zhodné s uploadom (``_get_own_free_post``): vlastný voľný
    príspevok, inak 404 – nepotvrdzujeme existenciu cudzieho príspevku ani jeho
    fotiek. Rovnaká odpoveď a ten istý helper ako pri ``upload-init``, nech sa
    celá rodina ``/images/`` správa jednotne.

    Príspevok nesmie ostať PRÁZDNY: po odobratí musí mať buď text, alebo ďalšiu
    fotku. Je to to isté pravidlo, aké stráži úpravu textu – tam sa maže text
    a kontrolujú fotky, tu naopak.

    Kontrola aj zápis bežia pod zámkom príspevku: dve súbežné mazania by inak
    obe videli „ešte niečo zostane" a príspevok by vyprázdnili.

    Samotné súbory v úložisku upratuje ``post_delete`` signál na
    ``FeedPostImage`` (rovnako ako pri zmazaní celého príspevku), takže tu sa
    maže len riadok.
    """
    post = _get_own_free_post(request, post_id)
    if post is None:
        return _post_not_found()

    with transaction.atomic():
        locked = FeedPost.objects.select_for_update().filter(pk=post.pk).first()
        if locked is None:
            return _post_not_found()

        image = FeedPostImage.objects.filter(pk=image_id, post=locked).first()
        if image is None:
            return _image_not_found()

        remaining = (
            locked.images.filter(_active_images_q()).exclude(pk=image.pk).exists()
        )
        if not locked.caption.strip() and not remaining:
            return Response(
                {
                    "error": "Prispevok nesmie ostat bez textu aj bez fotky.",
                    "code": "cannot_remove_last_content",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        image.delete()
        _mark_post_edited(locked)

    return Response(status=status.HTTP_204_NO_CONTENT)
