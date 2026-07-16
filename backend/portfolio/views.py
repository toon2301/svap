import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Max
from django.db.models import Prefetch, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from .api_responses import portfolio_item_not_found as _portfolio_item_not_found
from .api_responses import serializer_error_response as _serializer_error_response
from .api_responses import user_not_found as _not_found
from .item_limits import (
    lock_portfolio_owner,
    portfolio_items_limit_response,
    reached_portfolio_items_limit,
)
from .image_storage import delete_storage_keys, image_storage_keys
from .models import PortfolioImage, PortfolioItem, PortfolioItemLike
from .serializers import PortfolioItemSerializer, PortfolioItemWriteSerializer
from accounts.services.notifications import create_portfolio_liked_notification
from accounts.services.user_blocks import user_block_exists_between

logger = logging.getLogger(__name__)
User = get_user_model()

# Strop počtu položiek portfólia na používateľa (rovnaká filozofia ako
# MAX_PORTFOLIO_IMAGES=8) – bráni neobmedzenému rastu listu/payloadu pri 100k+
# používateľoch. Vynucuje sa pri vytváraní, backend je zdroj pravdy.
MAX_PORTFOLIO_ITEMS = 15


def _is_owner(request, user) -> bool:
    return bool(
        getattr(request.user, "is_authenticated", False)
        and int(user.id) == int(request.user.id)
    )


def _enforce_public_or_owner(request, user) -> Response | None:
    if not _is_owner(request, user) and (
        user_block_exists_between(first_user_id=request.user.id, second_user_id=user.id)
        or not getattr(user, "is_public", True)
    ):
        return _not_found()
    return None


def _public_image_file_q(prefix: str = ""):
    approved_key = f"{prefix}approved_key__gt"
    image_isnull = f"{prefix}image__isnull"
    image_exact = f"{prefix}image"
    return Q(**{approved_key: ""}) | (
        Q(**{image_isnull: False}) & ~Q(**{image_exact: ""})
    )


def _visible_cover_q():
    return Q(cover_image__status=PortfolioImage.Status.APPROVED) & (
        Q(cover_image__approved_key__gt="")
        | (Q(cover_image__image__isnull=False) & ~Q(cover_image__image=""))
    )


def _prefetch_images(is_owner: bool):
    images = PortfolioImage.objects.order_by("order", "id")
    if not is_owner:
        images = images.filter(status=PortfolioImage.Status.APPROVED).filter(
            _public_image_file_q()
        )
    return Prefetch("images", queryset=images, to_attr="prefetched_portfolio_images")


def _portfolio_queryset(user, *, is_owner: bool, with_images: bool = True):
    queryset = (
        PortfolioItem.objects.filter(owner_id=user.id)
        .select_related("owner", "related_offer", "cover_image")
        .annotate(_likes_count=Count("portfolio_likes", distinct=True))
        .order_by("sort_order", "id")
    )
    if with_images:
        queryset = queryset.prefetch_related(_prefetch_images(is_owner))
    if not is_owner:
        queryset = queryset.filter(_visible_cover_q())
    return queryset


def _target_user_by_id(request, user_id: int):
    if getattr(request.user, "is_authenticated", False) and int(request.user.id) == int(
        user_id
    ):
        return request.user
    return User.objects.only("id", "is_active", "is_public", "slug").get(
        id=user_id, is_active=True
    )


def _liked_portfolio_item_ids(request, item_ids) -> set[int]:
    user = getattr(request, "user", None)
    if user is None or not getattr(user, "is_authenticated", False):
        return set()
    ids = [item_id for item_id in item_ids if isinstance(item_id, int)]
    if not ids:
        return set()
    return set(
        PortfolioItemLike.objects.filter(item_id__in=ids, user=user).values_list(
            "item_id",
            flat=True,
        )
    )


def _serialize_items(request, items, *, is_owner: bool, featured_item_id: int | None):
    item_ids = [item.id for item in items]
    return PortfolioItemSerializer(
        items,
        many=True,
        context={
            "request": request,
            "is_owner": is_owner,
            "featured_item_id": featured_item_id,
            "liked_portfolio_item_ids": _liked_portfolio_item_ids(request, item_ids),
            # List nenesie images (grid číta len cover_image; detail má vlastný
            # fetch) – šetrí payload aj images prefetch.
            "include_images": False,
        },
    ).data


def _featured_item_id(user, *, is_owner: bool) -> int | None:
    return (
        _portfolio_queryset(user, is_owner=is_owner)
        .values_list("id", flat=True)
        .first()
    )


def _serialize_item(request, item, *, is_owner: bool):
    return PortfolioItemSerializer(
        item,
        context={
            "request": request,
            "is_owner": is_owner,
            "featured_item_id": _featured_item_id(item.owner, is_owner=is_owner),
            "liked_portfolio_item_ids": _liked_portfolio_item_ids(request, [item.id]),
        },
    ).data


def _next_sort_order(user) -> int:
    current_max = PortfolioItem.objects.filter(owner=user).aggregate(
        value=Max("sort_order")
    )["value"]
    return 0 if current_max is None else current_max + 1


def _reached_portfolio_items_limit(user) -> bool:
    # Limit sa odovzdáva z tohto modulu – testy patchujú portfolio.views.MAX_PORTFOLIO_ITEMS.
    return reached_portfolio_items_limit(user, MAX_PORTFOLIO_ITEMS)


def _portfolio_items_limit_response() -> Response:
    return portfolio_items_limit_response(MAX_PORTFOLIO_ITEMS)


def _compact_sort_order(user) -> None:
    """Prečísluje položky vlastníka na súvislé 0..n-1 (bez dier po delete).

    Volať v transaction.atomic – rovnaký lock+bulk_update vzor ako reorder,
    aby súbežný reorder/delete nevideli medzistav. Updatuje len riadky,
    ktorým sa poradie reálne mení (žiadne zbytočné zápisy).
    """
    items = list(
        PortfolioItem.objects.select_for_update()
        .filter(owner=user)
        .order_by("sort_order", "id")
    )
    changed = []
    for index, entry in enumerate(items):
        if entry.sort_order != index:
            entry.sort_order = index
            changed.append(entry)
    if changed:
        PortfolioItem.objects.bulk_update(changed, ["sort_order"])


def _portfolio_like_payload(*, item_id: int, user_id: int) -> dict:
    return {
        "portfolio_item_id": item_id,
        "is_liked_by_me": PortfolioItemLike.objects.filter(
            item_id=item_id,
            user_id=user_id,
        ).exists(),
        "likes_count": PortfolioItemLike.objects.filter(item_id=item_id).count(),
    }


def _get_likeable_portfolio_item(request, item_id: int):
    try:
        item = PortfolioItem.objects.select_related("owner").get(id=item_id)
    except PortfolioItem.DoesNotExist:
        return None

    owner = item.owner
    owner_view = _is_owner(request, owner)
    if not owner_view and not getattr(owner, "is_active", True):
        return None
    if _enforce_public_or_owner(request, owner) is not None:
        return None
    if not owner_view and not PortfolioItem.objects.filter(id=item.id).filter(
        _visible_cover_q()
    ).exists():
        return None
    return item


def _parse_id_list(value):
    if not isinstance(value, list):
        return None
    parsed = []
    for raw_id in value:
        # bool je subclass int – odmietni ho explicitne.
        if isinstance(raw_id, bool):
            return None
        # Prijmi LEN skutočný int alebo string zložený výhradne z číslic (bez
        # desatinnej bodky) – `int(1.9)` by inak ticho skrátil na 1.
        if isinstance(raw_id, int):
            item_id = raw_id
        elif isinstance(raw_id, str) and raw_id.isascii() and raw_id.isdigit():
            item_id = int(raw_id)
        else:
            return None
        if item_id < 1:
            return None
        parsed.append(item_id)
    return parsed


def _portfolio_list_response(request, user):
    owner_view = _is_owner(request, user)
    queryset = _portfolio_queryset(user, is_owner=owner_view, with_images=False)
    items = list(queryset)
    featured_item_id = items[0].id if items else None
    return Response(
        _serialize_items(
            request,
            items,
            is_owner=owner_view,
            featured_item_id=featured_item_id,
        ),
        status=status.HTTP_200_OK,
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def portfolio_items_reorder_view(request):
    item_ids = _parse_id_list(request.data.get("item_ids"))
    if item_ids is None or len(item_ids) != len(set(item_ids)):
        return Response(
            {"error": "Neplatne poradie portfolia."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        items = list(
            PortfolioItem.objects.select_for_update()
            .filter(owner=request.user)
            .order_by("sort_order", "id")
        )
        current_ids = [item.id for item in items]
        if len(item_ids) != len(current_ids) or set(item_ids) != set(current_ids):
            return Response(
                {"error": "Neplatne poradie portfolia."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item_by_id = {item.id: item for item in items}
        for index, item_id in enumerate(item_ids):
            item_by_id[item_id].sort_order = index
        PortfolioItem.objects.bulk_update(items, ["sort_order"])

    ordered_items = list(
        _portfolio_queryset(request.user, is_owner=True, with_images=False)
    )
    featured_item_id = ordered_items[0].id if ordered_items else None
    return Response(
        _serialize_items(
            request,
            ordered_items,
            is_owner=True,
            featured_item_id=featured_item_id,
        ),
        status=status.HTTP_200_OK,
    )


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def portfolio_item_like_view(request, item_id: int):
    """
    POST enables a portfolio like, DELETE removes it.

    The endpoint is idempotent and follows portfolio visibility rules. Owners may
    like their own portfolio, but self-likes do not create self-notifications.
    """
    item = _get_likeable_portfolio_item(request, item_id)
    if item is None:
        return _portfolio_item_not_found()

    if request.method == "POST":

        def notify_owner_about_like():
            try:
                create_portfolio_liked_notification(item=item, actor=request.user)
            except Exception:
                logger.exception(
                    "Portfolio like notification dispatch failed",
                    extra={
                        "portfolio_item_id": getattr(item, "id", None),
                        "owner_id": getattr(item, "owner_id", None),
                        "actor_id": getattr(request.user, "id", None),
                    },
                )

        with transaction.atomic():
            _, created = PortfolioItemLike.objects.get_or_create(
                item=item,
                user=request.user,
            )
            if created:
                transaction.on_commit(notify_owner_about_like)

        payload = _portfolio_like_payload(item_id=item.id, user_id=request.user.id)
        return Response(
            payload,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    PortfolioItemLike.objects.filter(item=item, user=request.user).delete()
    payload = _portfolio_like_payload(item_id=item.id, user_id=request.user.id)
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def my_portfolio_list_view(request):
    if request.method == "POST":
        # Rýchly fail-fast check (bez zámku) – autoritatívny re-check beží nižšie
        # pod zámkom, rovnaký vzor ako limit fotiek (upload-init vs upload-complete).
        if _reached_portfolio_items_limit(request.user):
            return _portfolio_items_limit_response()

        serializer = PortfolioItemWriteSerializer(
            data=request.data,
            context={"request": request},
        )
        if not serializer.is_valid():
            return _serializer_error_response(serializer.errors)

        with transaction.atomic():
            lock_portfolio_owner(request.user)
            # Re-check pod zámkom: dva paralelné create-y pri 14 položkách inak
            # oba prejdú checkom vyššie a vznikne 16+ položiek (TOCTOU).
            if _reached_portfolio_items_limit(request.user):
                return _portfolio_items_limit_response()

            item = serializer.save(
                owner=request.user,
                sort_order=_next_sort_order(request.user),
            )
        return Response(
            _serialize_item(request, item, is_owner=True),
            status=status.HTTP_201_CREATED,
        )

    return _portfolio_list_response(request, request.user)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def portfolio_item_detail_view(request, item_id: int):
    if request.method in {"PATCH", "DELETE"}:
        if request.method == "DELETE":
            with transaction.atomic():
                try:
                    item = (
                        PortfolioItem.objects.select_for_update()
                        .prefetch_related("images")
                        .get(id=item_id, owner=request.user)
                    )
                except PortfolioItem.DoesNotExist:
                    return _portfolio_item_not_found()

                storage_keys = []
                for image in item.images.all():
                    storage_keys.extend(image_storage_keys(image))
                item.delete()
                _compact_sort_order(request.user)
                transaction.on_commit(lambda: delete_storage_keys(storage_keys))
            return Response(status=status.HTTP_204_NO_CONTENT)

        try:
            item = PortfolioItem.objects.select_related(
                "owner", "related_offer", "cover_image"
            ).get(id=item_id, owner=request.user)
        except PortfolioItem.DoesNotExist:
            return _portfolio_item_not_found()

        serializer = PortfolioItemWriteSerializer(
            item,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        if not serializer.is_valid():
            return _serializer_error_response(serializer.errors)

        item = serializer.save()
        return Response(
            _serialize_item(request, item, is_owner=True),
            status=status.HTTP_200_OK,
        )

    try:
        item = PortfolioItem.objects.select_related("owner").get(id=item_id)
    except PortfolioItem.DoesNotExist:
        return _portfolio_item_not_found()

    owner = item.owner
    if not _is_owner(request, owner) and not getattr(owner, "is_active", True):
        return _portfolio_item_not_found()

    privacy_resp = _enforce_public_or_owner(request, owner)
    if privacy_resp is not None:
        return _portfolio_item_not_found()

    owner_view = _is_owner(request, owner)
    queryset = _portfolio_queryset(owner, is_owner=owner_view)
    featured_item_id = queryset.values_list("id", flat=True).first()

    try:
        item = queryset.get(id=item_id)
    except PortfolioItem.DoesNotExist:
        return _portfolio_item_not_found()

    return Response(
        PortfolioItemSerializer(
            item,
            context={
                "request": request,
                "is_owner": owner_view,
                "featured_item_id": featured_item_id,
                "liked_portfolio_item_ids": _liked_portfolio_item_ids(request, [item.id]),
            },
        ).data,
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def user_portfolio_list_view(request, user_id: int):
    try:
        user = _target_user_by_id(request, user_id)
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, user)
    if privacy_resp is not None:
        return privacy_resp

    return _portfolio_list_response(request, user)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def user_portfolio_list_by_slug_view(request, slug: str):
    try:
        user = User.objects.only("id", "is_active", "is_public", "slug").get(
            slug=slug, is_active=True
        )
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, user)
    if privacy_resp is not None:
        return privacy_resp

    return _portfolio_list_response(request, user)
