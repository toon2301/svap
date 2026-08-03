"""Servírovanie obrázkov feed príspevkov – proxy vzor ako portfólio/messaging.

Priama S3 URL je zablokovaná bucket policy; obrázky idú výhradne cez tieto
views. Na rozdiel od portfólia je feed VEREJNÝ (AllowAny ako feed samotný),
takže prístupová kontrola je anonym-safe: verejný autor + APPROVED fotka;
autor vidí vlastné vždy; blokovanie sa vyhodnocuje len pre prihláseného.
"""

import logging
import mimetypes

from django.core.files.storage import default_storage
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..models import FeedPost
from .feed_posts import visible_feed_posts

logger = logging.getLogger(__name__)


def _visible_post_or_404(request, post_id: int) -> FeedPost:
    """Jeden riadok cez ten istý filter viditeľnosti ako feed zoznam.

    Podávame vlastný ľahký queryset – anotácie počtov ani prefetch tagov sa na
    streamovanie súboru nepoužijú.
    """
    post = (
        visible_feed_posts(
            request.user,
            queryset=FeedPost.objects.select_related("author"),
        )
        .filter(pk=post_id)
        .first()
    )
    if post is None:
        raise Http404
    return post


def _stream_key(key: str):
    """FileResponse zo storage kľúča – zhodné hlavičky ako portfólio proxy."""
    if not key:
        return Response(status=status.HTTP_404_NOT_FOUND)
    try:
        stored_file = default_storage.open(key, "rb")
    except Exception:
        # Súbor už v storage nie je (napr. zmazaný originál zdieľania) – FE
        # zobrazí placeholder; presne dokumentovaný fallback snapshot kľúča.
        # Kľúč zámerne NElogujeme (interná cesta v storage).
        logger.warning("Feed image unavailable in storage", exc_info=True)
        return Response(status=status.HTTP_404_NOT_FOUND)

    content_type = mimetypes.guess_type(key)[0]
    if content_type is None and key.lower().endswith(".webp"):
        content_type = "image/webp"
    response = FileResponse(stored_file, content_type=content_type or "application/octet-stream")
    response["Cache-Control"] = "private, max-age=3600"
    response["X-Content-Type-Options"] = "nosniff"
    return response


@api_view(["GET"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_post_image_file_view(request, post_id: int):
    """Fotka voľného príspevku (?variant=thumbnail|large)."""
    post = _visible_post_or_404(request, post_id)
    is_author = (
        getattr(request.user, "is_authenticated", False)
        and request.user.id == post.author_id
    )
    if post.image_status != FeedPost.ImageStatus.APPROVED and not is_author:
        raise Http404

    variant = str(request.query_params.get("variant") or "large").strip().lower()
    key = (
        post.image_thumbnail_key if variant == "thumbnail" else post.image_approved_key
    )
    return _stream_key(key)


@api_view(["GET"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_post_shared_thumbnail_view(request, post_id: int):
    """Snapshot náhľad zdieľaného obsahu.

    Keď JSON hlási ``shared_content_unavailable``, nesmie ísť von ani obrázok –
    inak by sa skrytím ponuky / sprivátnením profilu obsah schoval len naoko
    a uložený zdrojový obrázok by sa dal ďalej sťahovať.
    """
    post = _visible_post_or_404(request, post_id)
    if post.post_type == FeedPost.PostType.FREE_POST:
        raise Http404
    if not post.is_shared_content_currently_visible:
        raise Http404
    return _stream_key(post.shared_thumbnail_key)
