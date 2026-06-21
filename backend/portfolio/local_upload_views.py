import os

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from .local_upload import (
    LOCAL_UPLOAD_EXPIRES_SECONDS,
    is_safe_portfolio_upload_key,
    local_portfolio_upload_enabled,
    parse_local_upload_token,
    save_local_upload,
)
from .upload_constraints import allowed_image_extensions, max_image_bytes


@api_view(["POST"])
@permission_classes([AllowAny])
@api_rate_limit
def portfolio_image_local_upload_view(request):
    if not local_portfolio_upload_enabled():
        return Response(status=status.HTTP_404_NOT_FOUND)

    key = str(request.data.get("key") or "").strip()
    token = str(request.data.get("token") or "").strip()
    uploaded_file = request.FILES.get("file")
    payload = parse_local_upload_token(token, max_age=LOCAL_UPLOAD_EXPIRES_SECONDS)
    item_id = payload.get("item_id") if payload else None
    expected_size = payload.get("size_bytes") if payload else None

    if (
        not payload
        or not isinstance(item_id, int)
        or isinstance(item_id, bool)
        or not isinstance(expected_size, int)
        or isinstance(expected_size, bool)
        or expected_size <= 0
        or key != payload.get("key")
        or not is_safe_portfolio_upload_key(key, item_id=item_id)
    ):
        return Response(
            {"error": "Neplatny upload."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if uploaded_file is None or uploaded_file.size <= 0:
        return Response(
            {"error": "Neplatny subor."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if uploaded_file.size > max_image_bytes():
        return Response(
            {"error": "Subor je prilis velky."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if uploaded_file.size != expected_size:
        return Response(
            {"error": "Neplatny subor."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ext = os.path.splitext(key)[1].lower()
    if ext not in allowed_image_extensions():
        return Response(
            {"error": "Neplatny typ suboru."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not save_local_upload(key, uploaded_file):
        return Response(
            {"error": "Nepodarilo sa ulozit upload."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)
