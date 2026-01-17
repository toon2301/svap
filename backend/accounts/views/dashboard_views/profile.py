from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_profile_view(request):
    """Dashboard profile - zobrazenie a úprava profilu"""
    user = request.user

    if request.method == 'GET':
        # Vrátiť úplné informácie o profile
        profile_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'user_type': user.user_type,
            'phone': user.phone,
            'bio': user.bio,
            'avatar': user.avatar.url if user.avatar else None,
            'location': user.location,
            'company_name': user.company_name,
            'website': user.website,
            'linkedin': user.linkedin,
            'facebook': user.facebook,
            'instagram': user.instagram,
            'is_verified': user.is_verified,
            'is_public': user.is_public,
            'created_at': user.created_at,
            'updated_at': user.updated_at,
            'profile_completeness': user.profile_completeness,
        }

        return Response(profile_data, status=status.HTTP_200_OK)

    elif request.method in ['PUT', 'PATCH']:
        # Aktualizácia profilu (použije existujúci serializer)
        from ...serializers import UserProfileSerializer

        serializer = UserProfileSerializer(
            user,
            data=request.data,
            partial=request.method == 'PATCH',
        )

        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'Profil bol úspešne aktualizovaný', 'user': serializer.data},
                status=status.HTTP_200_OK,
            )

        return Response(
            {'error': 'Neplatné údaje', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_settings_view(request):
    """Dashboard settings - nastavenia používateľa"""
    user = request.user

    if request.method == 'GET':
        # Vrátiť nastavenia používateľa
        settings_data = {
            'notifications': {
                'email_notifications': True,  # Zatiaľ hardcoded, neskôr z databázy
                'push_notifications': False,
            },
            'privacy': {
                'profile_visibility': 'public' if user.is_public else 'private',
                'show_email': False,  # Zatiaľ hardcoded
                'show_phone': False,
            },
            'security': {
                'two_factor_auth': False,  # Zatiaľ hardcoded
            },
            'general': {
                'language': 'sk',  # Zatiaľ hardcoded
                'timezone': 'Europe/Bratislava',
                'theme': 'light',
            },
        }

        return Response(settings_data, status=status.HTTP_200_OK)

    elif request.method in ['PUT', 'PATCH']:
        # Aktualizácia nastavení
        settings_data = request.data

        # Zatiaľ len logujeme zmeny, neskôr sa implementuje skutočné ukladanie
        # Napríklad: UserSettings.objects.update_or_create(user=user, defaults=settings_data)

        return Response(
            {'message': 'Nastavenia boli úspešne aktualizované', 'settings': settings_data},
            status=status.HTTP_200_OK,
        )


