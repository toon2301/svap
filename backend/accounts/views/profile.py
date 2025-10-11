"""
Profile views pre Swaply
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage

from swaply.rate_limiting import api_rate_limit
from swaply.audit_logger import log_profile_update

from ..serializers import UserProfileSerializer

User = get_user_model()


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def update_profile_view(request):
    """Aktualizácia profilu používateľa"""
    # Ulož pôvodné hodnoty pre audit log
    original_data = {
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'bio': request.user.bio,
        'location': request.user.location,
        'phone': request.user.phone,
        'website': request.user.website,
        'linkedin': request.user.linkedin,
        'facebook': request.user.facebook,
        'instagram': request.user.instagram,
    }
    
    # Zachyť aktuálny avatar pred uložením (pre prípadné zmazanie po update)
    old_avatar_name = getattr(getattr(request.user, 'avatar', None), 'name', None)

    serializer = UserProfileSerializer(
        request.user, 
        data=request.data, 
        partial=request.method == 'PATCH',
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()

        # Ak sa menil avatar, zmaž starý súbor z úložiska
        try:
            if 'avatar' in serializer.validated_data:
                new_avatar_name = getattr(getattr(request.user, 'avatar', None), 'name', None)
                # Zmaž, ak existoval starý a líši sa od nového (alebo bol nový odstránený)
                if old_avatar_name and old_avatar_name != new_avatar_name:
                    default_storage.delete(old_avatar_name)
        except Exception:
            # Bez zablokovania requestu – logovanie by išlo sem, ak by sme ho chceli
            pass
        
        # Log zmeny profilu
        changes = {}
        for field, new_value in serializer.validated_data.items():
            if field in original_data and original_data[field] != new_value:
                changes[field] = {
                    'old': original_data[field],
                    'new': new_value
                }
        
        if changes:
            ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT')
            log_profile_update(request.user, changes, ip_address, user_agent)
        
        # Vráť aktualizované údaje s plnou URL avatara
        response_serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response({
            'message': 'Profil bol úspešne aktualizovaný',
            'user': response_serializer.data
        }, status=status.HTTP_200_OK)
    
    return Response({
        'error': 'Neplatné údaje',
        'details': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


# Draft endpoints - pridáno bez narušenia existujúcich funkcií
@api_view(['POST', 'PATCH'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def save_draft_view(request):
    """Uložiť draft údajov používateľa"""
    try:
        from django.core.cache import cache
        
        draft_data = request.data
        user_id = request.user.id
        draft_type = request.data.get('draft_type', 'general')
        
        # Uložiť do cache na 1 hodinu
        cache_key = f"draft_{user_id}_{draft_type}"
        cache.set(cache_key, draft_data, timeout=3600)
        
        return Response({
            'status': 'draft_saved',
            'message': 'Draft bol úspešne uložený',
            'draft_type': draft_type
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Chyba pri ukladaní draftu',
            'details': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_draft_view(request, draft_type='general'):
    """Načítať draft údajov používateľa"""
    try:
        from django.core.cache import cache
        
        user_id = request.user.id
        cache_key = f"draft_{user_id}_{draft_type}"
        draft_data = cache.get(cache_key)
        
        if draft_data:
            return Response({
                'status': 'draft_found',
                'data': draft_data,
                'draft_type': draft_type
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'status': 'no_draft',
                'message': 'Žiadny draft nebol nájdený',
                'draft_type': draft_type
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({
            'error': 'Chyba pri načítaní draftu',
            'details': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_draft_view(request, draft_type='general'):
    """Vymazať draft údajov používateľa"""
    try:
        from django.core.cache import cache
        
        user_id = request.user.id
        cache_key = f"draft_{user_id}_{draft_type}"
        cache.delete(cache_key)
        
        return Response({
            'status': 'draft_cleared',
            'message': 'Draft bol úspešne vymazaný',
            'draft_type': draft_type
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Chyba pri mazaní draftu',
            'details': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)