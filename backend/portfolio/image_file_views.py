"""
Privátne servírovanie portfólio obrázkov.

Rovnaký vzor ako MessageImageView v messaging: proxy view overí prístup
(vlastník / verejný profil), potom streamuje bajty zo storage cez FileResponse.
Priama S3 URL je zablokovaná bucket policy – obrázky sú dostupné len cez tento
endpoint.
"""

import mimetypes

from django.core.cache import cache
from django.core.files.storage import default_storage
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.services.user_blocks import user_block_exists_between

from .image_storage import PORTFOLIO_IMAGE_VARIANTS
from .image_storage import variant_storage_key as _variant_storage_key
from .models import PortfolioImage, PortfolioItem

_IMAGE_ACCESS_CACHE_TTL = 60


def _ensure_portfolio_image_access(request, item_id: int) -> bool:
    """
    Overí, že požadujúci smie čítať obrázky tejto položky; vráti is_owner.

    Pri galérii sa view volá N-krát pre tú istú položku (thumbnail + varianty),
    preto výsledok krátko cachujeme (60s) podľa (user_id, item_id) – ušetríme
    owner/visibility dotaz na každý obrázok. Rovnaký vzor (aj tradeoff: zmena
    viditeľnosti profilu sa prejaví do 60s) ako _ensure_conversation_image_access
    v messaging. Per-obrázok status sa kontroluje čerstvo pri každom requeste.
    """
    cache_key = f"pf_img_access:{request.user.id}:{int(item_id)}"
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        owner_id = int(cached.get("owner_id") or 0)
        if user_block_exists_between(
            first_user_id=request.user.id,
            second_user_id=owner_id,
        ):
            raise Http404
        return bool(cached.get("is_owner"))

    item = get_object_or_404(PortfolioItem.objects.select_related("owner"), id=item_id)
    owner = item.owner
    is_owner = int(getattr(owner, "id", 0)) == int(request.user.id)
    if not is_owner and (
        user_block_exists_between(
            first_user_id=request.user.id,
            second_user_id=owner.id,
        )
        or not getattr(owner, "is_active", True)
        or not getattr(owner, "is_public", True)
    ):
        raise Http404
    cache.set(
        cache_key,
        {"owner_id": owner.id, "is_owner": is_owner},
        timeout=_IMAGE_ACCESS_CACHE_TTL,
    )
    return is_owner


def _portfolio_image_response(request, item_id: int, image_id: int, variant: str):
    """Serve a protected portfolio image variant after verifying access."""
    is_owner = _ensure_portfolio_image_access(request, item_id)
    image = get_object_or_404(PortfolioImage.objects.filter(item_id=item_id), id=image_id)
    if not is_owner and image.status != PortfolioImage.Status.APPROVED:
        raise Http404

    key = _variant_storage_key(image, variant)
    if not key:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        stored_file = default_storage.open(key, "rb")
    except Exception:
        return Response(status=status.HTTP_404_NOT_FOUND)

    content_type = mimetypes.guess_type(key)[0]
    if content_type is None and key.lower().endswith(".webp"):
        content_type = "image/webp"
    content_type = content_type or "application/octet-stream"
    response = FileResponse(stored_file, content_type=content_type)
    response["Cache-Control"] = "private, max-age=3600"
    response["X-Content-Type-Options"] = "nosniff"
    return response


class PortfolioImageFileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, item_id: int, image_id: int):
        variant = str(request.query_params.get("variant") or "large").strip().lower()
        if variant not in PORTFOLIO_IMAGE_VARIANTS:
            variant = "large"
        return _portfolio_image_response(request, item_id, image_id, variant)
