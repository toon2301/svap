"""
Token refresh endpoint, ktorý podporuje refresh token aj v HttpOnly cookie.
BC: ak klient pošle refresh v JSON body, funguje to stále.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([AllowAny])
def token_refresh_cookie_view(request):
    """
    Vráti nový access token; pri ROTATE_REFRESH_TOKENS môže vydať aj nový refresh token.
    - Preferuj request.data["refresh"] (BC)
    - Inak použi request.COOKIES["refresh_token"] (B)
    """
    try:
        refresh_str = None
        try:
            refresh_str = request.data.get("refresh")
        except Exception:
            refresh_str = None
        if not refresh_str:
            refresh_str = request.COOKIES.get("refresh_token")

        if not refresh_str:
            return Response({"detail": "Refresh token missing"}, status=status.HTTP_400_BAD_REQUEST)

        from rest_framework_simplejwt.serializers import TokenRefreshSerializer

        serializer = TokenRefreshSerializer(data={"refresh": refresh_str})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        access = data.get("access")
        new_refresh_str = data.get("refresh")
        resp = Response(data, status=status.HTTP_200_OK)

        # Nastav cookies: access vždy, refresh len ak sme vydali nový
        try:
            from accounts.views.auth import _set_auth_cookies, _auth_cookie_kwargs

            if access:
                if new_refresh_str:
                    _set_auth_cookies(resp, access=str(access), refresh=str(new_refresh_str))
                else:
                    # iba access
                    kwargs = _auth_cookie_kwargs()
                    resp.set_cookie("access_token", str(access), max_age=60 * 60, **kwargs)
        except Exception as e:
            logger.error(f"Failed to set refresh cookies: {e}")

        return resp
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        return Response({"detail": "Token refresh failed"}, status=status.HTTP_401_UNAUTHORIZED)

