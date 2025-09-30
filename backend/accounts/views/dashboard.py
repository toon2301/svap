"""
Dashboard views pre Swaply
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.core.paginator import Paginator

from swaply.rate_limiting import api_rate_limit

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_home_view(request):
    """Dashboard home - základné štatistiky a informácie"""
    user = request.user
    
    # Základné štatistiky (zatiaľ mock data, neskôr sa nahradí skutočnými dátami)
    stats = {
        'skills_count': 0,  # Počet zručností používateľa
        'active_exchanges': 0,  # Aktívne výmeny
        'completed_exchanges': 0,  # Dokončené výmeny
        'favorites_count': 0,  # Počet obľúbených používateľov
        'profile_completeness': user.profile_completeness,
    }
    
    # Posledné aktivity (zatiaľ prázdne)
    recent_activities = []
    
    return Response({
        'stats': stats,
        'recent_activities': recent_activities,
        'user': {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'username': user.username,
            'profile_completeness': user.profile_completeness,
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_search_view(request):
    """Dashboard search - vyhľadávanie zručností a používateľov"""
    query = request.GET.get('q', '')
    category = request.GET.get('category', '')
    level = request.GET.get('level', '')
    location = request.GET.get('location', '')
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 20))
    
    # Zatiaľ vrátime prázdne výsledky, neskôr sa implementuje skutočné vyhľadávanie
    results = {
        'skills': [],
        'users': [],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': 0,
            'total_pages': 0,
        }
    }
    
    if query:
        # Tu sa neskôr implementuje skutočné vyhľadávanie
        # Napríklad: Skill.objects.filter(name__icontains=query)
        # User.objects.filter(Q(first_name__icontains=query) | Q(last_name__icontains=query))
        pass
    
    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_favorites_view(request):
    """Dashboard favorites - správa obľúbených používateľov a zručností"""
    if request.method == 'GET':
        # Zatiaľ vrátime prázdne obľúbené, neskôr sa implementuje skutočná funkcionalita
        favorites = {
            'users': [],
            'skills': [],
        }
        
        return Response(favorites, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        # Pridanie do obľúbených
        item_type = request.data.get('type')  # 'user' alebo 'skill'
        item_id = request.data.get('id')
        
        if not item_type or not item_id:
            return Response({
                'error': 'Chýbajú povinné parametre: type a id'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Tu sa neskôr implementuje skutočné pridávanie do obľúbených
        # Napríklad: FavoriteUser.objects.create(user=request.user, favorite_user_id=item_id)
        
        return Response({
            'message': f'Položka bola pridaná do obľúbených',
            'type': item_type,
            'id': item_id
        }, status=status.HTTP_201_CREATED)
    
    elif request.method == 'DELETE':
        # Odstránenie z obľúbených
        item_type = request.data.get('type')
        item_id = request.data.get('id')
        
        if not item_type or not item_id:
            return Response({
                'error': 'Chýbajú povinné parametre: type a id'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Tu sa neskôr implementuje skutočné odstraňovanie z obľúbených
        
        return Response({
            'message': f'Položka bola odstránená z obľúbených',
            'type': item_type,
            'id': item_id
        }, status=status.HTTP_200_OK)


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
        from ..serializers import UserProfileSerializer
        
        serializer = UserProfileSerializer(
            user,
            data=request.data,
            partial=request.method == 'PATCH'
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profil bol úspešne aktualizovaný',
                'user': serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            'error': 'Neplatné údaje',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


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
            }
        }
        
        return Response(settings_data, status=status.HTTP_200_OK)
    
    elif request.method in ['PUT', 'PATCH']:
        # Aktualizácia nastavení
        settings_data = request.data
        
        # Zatiaľ len logujeme zmeny, neskôr sa implementuje skutočné ukladanie
        # Napríklad: UserSettings.objects.update_or_create(user=user, defaults=settings_data)
        
        return Response({
            'message': 'Nastavenia boli úspešne aktualizované',
            'settings': settings_data
        }, status=status.HTTP_200_OK)
