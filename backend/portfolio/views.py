from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Max
from django.db.models import Prefetch, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from .image_storage import delete_storage_keys, image_storage_keys
from .models import PortfolioImage, PortfolioItem
from .serializers import PortfolioItemSerializer, PortfolioItemWriteSerializer

User = get_user_model()


def _not_found():
    return Response(
        {"error": "Pouzivatel nebol najdeny"},
        status=status.HTTP_404_NOT_FOUND,
    )


def _portfolio_item_not_found():
    return Response(
        {"error": "Polozka portfolia nebola najdena"},
        status=status.HTTP_404_NOT_FOUND,
    )


def _is_owner(request, user) -> bool:
    return bool(
        getattr(request.user, "is_authenticated", False)
        and int(user.id) == int(request.user.id)
    )


def _enforce_public_or_owner(request, user) -> Response | None:
    if not _is_owner(request, user) and not getattr(user, "is_public", True):
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


def _portfolio_queryset(user, *, is_owner: bool):
    queryset = (
        PortfolioItem.objects.filter(owner_id=user.id)
        .select_related("owner", "related_offer", "cover_image")
        .prefetch_related(_prefetch_images(is_owner))
        .order_by("sort_order", "id")
    )
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


def _serialize_items(request, items, *, is_owner: bool, featured_item_id: int | None):
    return PortfolioItemSerializer(
        items,
        many=True,
        context={
            "request": request,
            "is_owner": is_owner,
            "featured_item_id": featured_item_id,
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
        },
    ).data


def _next_sort_order(user) -> int:
    current_max = PortfolioItem.objects.filter(owner=user).aggregate(
        value=Max("sort_order")
    )["value"]
    return 0 if current_max is None else current_max + 1


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
    queryset = _portfolio_queryset(user, is_owner=owner_view)
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

    ordered_items = list(_portfolio_queryset(request.user, is_owner=True))
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


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def my_portfolio_list_view(request):
    if request.method == "POST":
        serializer = PortfolioItemWriteSerializer(
            data=request.data,
            context={"request": request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
