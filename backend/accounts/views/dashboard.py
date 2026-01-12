"""
Dashboard views pre Swaply
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Case, When, IntegerField
from decimal import Decimal, InvalidOperation
from django.core.paginator import Paginator
import unicodedata
import re

from swaply.rate_limiting import api_rate_limit
from ..models import OfferedSkill
from ..serializers import OfferedSkillSerializer

User = get_user_model()


# Jednoduché synonymické skupiny pre „smart search“ – rozdelené podľa domén
SMART_KEYWORD_GROUPS = [
    # AUTO / TECHNIKA
    [
        'auto',
        'autá',
        'autoservis',
        'mechanik',
        'automechanik',
        'pneuservis',
        'pneumatiky',
        'prezutie',
        'oprava auta',
        'diagnostika',
        'výmena oleja',
        'brzdy',
        'servis auta',
        'predaj áut',
        'stk',
    ],
    # DOM / OPRAVY
    [
        'oprava',
        'servis',
        'údržba',
        'hodinový manžel',
        'montáž',
        'vŕtanie',
        'oprava doma',
        'technik',
        'pomoc v domácnosti',
    ],
    # STAVBA / REMESLÁ
    [
        'stavba',
        'rekonštrukcia',
        'prerábka',
        'murár',
        'maliar',
        'obkladač',
        'sadrokartón',
        'podlahy',
        'dlažba',
        'strecha',
        'strechár',
        'stavebné práce',
    ],
    # ELEKTRO / VODA
    [
        'elektrikár',
        'elektro',
        'elektroinštalácia',
        'zásuvky',
        'svetlá',
        'revízia',
        'smart home',
        'voda',
        'inštalatér',
        'kúrenie',
        'kúrenár',
        'bojler',
        'radiátor',
        'havária vody',
    ],
    # UPRATOVANIE / DOMÁCE PRÁCE
    [
        'upratovanie',
        'upratovačka',
        'cleaning',
        'čistenie',
        'tepovanie',
        'umývanie okien',
        'kancelárske upratovanie',
        'domáce práce',
    ],
    # ZÁHRADA / OKOLIE
    [
        'záhrada',
        'záhradník',
        'kosenie',
        'strihanie stromov',
        'údržba záhrady',
        'plot',
        'terasa',
    ],
    # IT / DIGITÁL
    [
        'it',
        'technická pomoc',
        'počítač',
        'oprava počítača',
        'notebook',
        'web',
        'webstránka',
        'programátor',
        'vývoj',
        'aplikácia',
        'e-shop',
        'wordpress',
        'seo',
    ],
    # GRAFIKA / KREATÍVA
    [
        'dizajn',
        'grafik',
        'logo',
        'branding',
        'vizuál',
        'sociálne siete',
    ],
    # MARKETING
    [
        'marketing',
        'reklama',
        'social media',
        'instagram',
        'facebook',
        'obsah',
        'copywriting',
    ],
    # ADMIN / FINANCIE
    [
        'účtovníctvo',
        'účtovník',
        'dane',
        'daňové priznanie',
        'mzdy',
        'fakturácia',
        'živnosť',
        's.r.o.',
    ],
    # VZDELÁVANIE
    [
        'doučovanie',
        'učiteľ',
        'lektor',
        'matematika',
        'angličtina',
        'nemčina',
        'online výučba',
        'príprava na skúšky',
    ],
    # STAROSTLIVOSŤ
    [
        'opatrovanie',
        'babysitting',
        'opatrovanie detí',
        'opatrovanie seniorov',
        'starostlivosť',
    ],
    # SLUŽBY / OSTATNÉ
    [
        'preklad',
        'tlmočenie',
        'šofér',
        'sťahovanie',
        'pomocník',
        'brigáda',
        'služby',
        'freelance',
    ],
]

def _remove_diacritics(value: str) -> str:
    """Odstráni diakritiku z reťazca pre účely vyhľadávania."""
    normalized = unicodedata.normalize('NFD', value)
    return ''.join(ch for ch in normalized if unicodedata.category(ch) != 'Mn')


def _build_accent_insensitive_pattern(term: str) -> str:
    """
    Vytvorí regex pattern, ktorý ignoruje diakritiku pre základné latinské písmená.
    Používame ho s __iregex, takže je case-insensitive.
    """
    # Mapovanie základných písmen na skupinu s diakritikou
    accent_groups = {
        'a': 'aáä',
        'c': 'cč',
        'd': 'dď',
        'e': 'eéě',
        'i': 'ií',
        'l': 'lľĺ',
        'n': 'nň',
        'o': 'oóô',
        'r': 'rŕ',
        's': 'sš',
        't': 'tť',
        'u': 'uúů',
        'y': 'yý',
        'z': 'zž',
    }

    parts = []
    for ch in term:
        lower = ch.lower()
        if lower in accent_groups:
            chars = accent_groups[lower]
            parts.append(f"[{re.escape(chars)}]")
        else:
            parts.append(re.escape(ch))
    if not parts:
        return ".*"
    return ".*" + "".join(parts) + ".*"


SMART_KEYWORD_INDEX = {}
for group in SMART_KEYWORD_GROUPS:
    lowered = [w.lower() for w in group]
    for word in lowered:
        # Mapuj aj diakritické aj bezdiakritické verzie na tú istú skupinu
        SMART_KEYWORD_INDEX[word] = lowered
        no_accents = _remove_diacritics(word)
        SMART_KEYWORD_INDEX[no_accents] = lowered


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
            'slug': getattr(user, 'slug', None),
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_search_view(request):
    """Dashboard search - vyhľadávanie zručností a používateľov"""
    # Základné parametre vyhľadávania
    raw_query = (request.GET.get('q') or '').strip()
    raw_location = (request.GET.get('location') or '').strip()
    raw_district = (request.GET.get('district') or '').strip()

    # Pokročilé filtre pre ponuky
    offer_type = (request.GET.get('offer_type') or '').strip().lower()  # 'offer' | 'seeking' | ''
    only_my_location = (request.GET.get('only_my_location') or '').strip().lower() in ('1', 'true', 'yes')
    price_min_raw = (request.GET.get('price_min') or '').strip()
    price_max_raw = (request.GET.get('price_max') or '').strip()
    
    # Filter podľa krajiny
    country_filter = (request.GET.get('country') or '').strip().upper()  # 'SK' | 'CZ' | 'PL' | etc.

    # Paginácia – bezpečné limity
    try:
        page = int(request.GET.get('page', 1))
    except (TypeError, ValueError):
        page = 1

    try:
        per_page = int(request.GET.get('per_page', 20))
    except (TypeError, ValueError):
        per_page = 20

    if per_page < 1:
        per_page = 20
    per_page = min(per_page, 50)

    # Rozdelenie query na jednotlivé výrazy (napr. "auto upratovanie")
    base_terms = [term for term in raw_query.replace(',', ' ').split() if term]

    # Location parametre môžu dopĺňať dotaz (napr. ak by bol samostatný input)
    location_terms = []
    if raw_district:
        location_terms.append(raw_district)
    if raw_location and raw_location not in location_terms:
        location_terms.append(raw_location)

    # Základné vyhľadávacie termíny pre zručnosti – query + prípadná lokalita
    skill_terms = set()
    for term in base_terms + location_terms:
        normalized = term.strip()
        if not normalized:
            continue
        skill_terms.add(normalized)
        # Smart search – ak term zodpovedá niektorej synonymickej skupine, pridaj aj jej členov
        group = SMART_KEYWORD_INDEX.get(normalized.lower())
        if group:
            for g in group:
                skill_terms.add(g)

    # Termíny pre používateľov – meno / username / lokalita
    user_terms = set()
    for term in base_terms + location_terms:
        normalized = term.strip()
        if normalized:
            user_terms.add(normalized)

    # =========================
    #  Vyhľadávanie v zručnostiach (OfferedSkill)
    # =========================
    skills_qs = OfferedSkill.objects.select_related('user').filter(user__is_public=True)

    if skill_terms:
        skill_query = Q()
        for term in skill_terms:
            pattern = _build_accent_insensitive_pattern(term)
            # Hľadanie podľa kategórie, podkategórie, tagov a lokality (miesto + okres)
            skill_query |= (
                Q(category__iregex=pattern)
                | Q(subcategory__iregex=pattern)
                | Q(tags__icontains=term)  # JSON pole – ponecháme icontains
                | Q(location__iregex=pattern)
                | Q(district__iregex=pattern)
                | Q(user__location__iregex=pattern)
                | Q(user__district__iregex=pattern)
            )
        skills_qs = skills_qs.filter(skill_query)

    # Filter: typ ponuky (PONÚKAM / HĽADÁM)
    if offer_type == 'offer':
        skills_qs = skills_qs.filter(is_seeking=False)
    elif offer_type == 'seeking':
        skills_qs = skills_qs.filter(is_seeking=True)
    
    # Filter: krajina používateľa
    if country_filter:
        # Najskôr skúsime user.country ak existuje, inak fallback na detekciu z názvu krajiny
        # Pre teraz použijem location/district mapping (neskôr sa pridá user.country field)
        country_location_mapping = {
            'SK': ['slovakia', 'slovensko', 'slovak'],
            'CZ': ['czech', 'česko', 'česká', 'ceska'],
            'PL': ['poland', 'poľsko', 'polsko', 'polish'],
            'HU': ['hungary', 'maďarsko', 'madarska', 'hungarian'],
            'DE': ['germany', 'nemecko', 'deutschland', 'german'],
            'AT': ['austria', 'rakúsko', 'rakusko', 'österreich'],
        }
        
        if country_filter in country_location_mapping:
            country_terms = country_location_mapping[country_filter]
            country_query = Q()
            for term in country_terms:
                country_query |= (
                    Q(user__location__icontains=term) |
                    Q(user__district__icontains=term)
                )
            skills_qs = skills_qs.filter(country_query)

    # Filter: cena od / do
    price_min = None
    price_max = None
    if price_min_raw:
        try:
            price_min = Decimal(price_min_raw.replace(',', '.'))
        except InvalidOperation:
            price_min = None
    if price_max_raw:
        try:
            price_max = Decimal(price_max_raw.replace(',', '.'))
        except InvalidOperation:
            price_max = None

    if price_min is not None:
        skills_qs = skills_qs.filter(price_from__gte=price_min)
    if price_max is not None:
        skills_qs = skills_qs.filter(price_from__lte=price_max)

    # Uprednostniť overených používateľov, novšie a relevantnejšie ponuky
    if raw_query:
        skills_qs = skills_qs.annotate(
            relevance=Case(
                When(category__icontains=raw_query, then=3),
                When(subcategory__icontains=raw_query, then=3),
                When(tags__icontains=raw_query, then=2),
                When(location__icontains=raw_query, then=1),
                When(district__icontains=raw_query, then=1),
                default=0,
                output_field=IntegerField(),
            )
        ).order_by('-relevance', '-user__is_verified', '-created_at')
    else:
        skills_qs = skills_qs.order_by('-user__is_verified', '-created_at')

    skills_paginator = Paginator(skills_qs, per_page)
    skills_page = skills_paginator.get_page(page)

    skills_data = OfferedSkillSerializer(
        skills_page.object_list,
        many=True,
        context={'request': request},
    ).data

    # =========================
    #  Vyhľadávanie v používateľoch (User)
    #  (dočasne neobmedzujeme na is_public, aby sa dali nájsť všetci testovací používatelia)
    # =========================
    users_qs = User.objects.filter(is_active=True)

    if user_terms:
        user_query = Q()
        for term in user_terms:
          pattern = _build_accent_insensitive_pattern(term)
          # Hľadanie podľa mena, username a lokality (bez emailu / job title / firmy)
          user_query |= (
              Q(first_name__iregex=pattern)
              | Q(last_name__iregex=pattern)
              | Q(username__iregex=pattern)
              | Q(location__iregex=pattern)
              | Q(district__iregex=pattern)
          )
        users_qs = users_qs.filter(user_query)

    # Filter: krajina používateľa
    if country_filter:
        # Rovnaký mapping ako pre skills
        country_location_mapping = {
            'SK': ['slovakia', 'slovensko', 'slovak'],
            'CZ': ['czech', 'česko', 'česká', 'ceska'],
            'PL': ['poland', 'poľsko', 'polsko', 'polish'],
            'HU': ['hungary', 'maďarsko', 'madarska', 'hungarian'],
            'DE': ['germany', 'nemecko', 'deutschland', 'german'],
            'AT': ['austria', 'rakúsko', 'rakusko', 'österreich'],
        }
        
        if country_filter in country_location_mapping:
            country_terms = country_location_mapping[country_filter]
            user_country_query = Q()
            for term in country_terms:
                user_country_query |= (
                    Q(location__icontains=term) |
                    Q(district__icontains=term)
                )
            users_qs = users_qs.filter(user_country_query)

    # Filter: len v mojej lokalite (podľa profilu)
    if only_my_location:
        profile_loc_q = Q()
        profile_user = request.user
        if getattr(profile_user, 'location', None):
            profile_loc_q |= Q(location__icontains=profile_user.location)
        if getattr(profile_user, 'district', None):
            profile_loc_q |= Q(district__icontains=profile_user.district)

        if profile_loc_q:
            users_qs = users_qs.filter(profile_loc_q)

        skill_loc_q = Q()
        if getattr(profile_user, 'location', None):
            skill_loc_q |= (
                Q(location__icontains=profile_user.location)
                | Q(user__location__icontains=profile_user.location)
            )
        if getattr(profile_user, 'district', None):
            skill_loc_q |= (
                Q(district__icontains=profile_user.district)
                | Q(user__district__icontains=profile_user.district)
            )
        if skill_loc_q:
            skills_qs = skills_qs.filter(skill_loc_q)

    # Overení, aktívnejší a relevantnejší používatelia vyššie
    if raw_query:
        users_qs = users_qs.annotate(
            relevance=Case(
                When(username__icontains=raw_query, then=3),
                When(first_name__icontains=raw_query, then=2),
                When(last_name__icontains=raw_query, then=2),
                When(location__icontains=raw_query, then=1),
                When(district__icontains=raw_query, then=1),
                default=0,
                output_field=IntegerField(),
            )
        ).order_by('-relevance', '-is_verified', '-updated_at')
    else:
        users_qs = users_qs.order_by('-is_verified', '-updated_at')

    users_paginator = Paginator(users_qs, per_page)
    users_page = users_paginator.get_page(page)

    # Serializácia používateľov – jednoduché, bezpečné pole
    users_data = []
    for user in users_page.object_list:
        avatar_url = None
        try:
            if getattr(user, 'avatar', None) and hasattr(user.avatar, 'url'):
                url = user.avatar.url
                if request:
                    avatar_url = request.build_absolute_uri(url)
                else:
                    avatar_url = url
        except Exception:
            avatar_url = None

        users_data.append(
            {
                'id': user.id,
                'display_name': user.display_name,
                'district': user.district,
                'location': user.location,
                'is_verified': user.is_verified,
                'avatar_url': avatar_url,
                'slug': getattr(user, 'slug', None),
            }
        )

    results = {
        'skills': skills_data,
        'users': users_data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_skills': skills_paginator.count,
            'total_users': users_paginator.count,
            'total_pages_skills': skills_paginator.num_pages,
            'total_pages_users': users_paginator.num_pages,
        },
    }

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_profile_detail_view(request, user_id: int):
    """
    Read‑only detail profilu iného používateľa pre dashboard / vyhľadávanie.
    """
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'Používateľ nebol nájdený'}, status=status.HTTP_404_NOT_FOUND)

    # Debug log - zistiť, čo má používateľ v databáze
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f'🔍 Backend DEBUG - User ID {user_id}: user_type v DB = {user.user_type}, ico = {user.ico}, contact_email = {user.contact_email}')

    from ..serializers import UserProfileSerializer

    serializer = UserProfileSerializer(user, context={'request': request})
    
    # Debug log - čo serializer vracia
    logger.info(f'🔍 Backend DEBUG - Serializer data: user_type = {serializer.data.get("user_type")}, ico = {serializer.data.get("ico")}, contact_email = {serializer.data.get("contact_email")}')
    
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_profile_detail_by_slug_view(request, slug: str):
    """
    Read‑only detail profilu iného používateľa podľa slug-u.
    """
    try:
        user = User.objects.get(slug=slug, is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'Používateľ nebol nájdený'}, status=status.HTTP_404_NOT_FOUND)

    # Debug log - zistiť, čo má používateľ v databáze
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f'🔍 Backend DEBUG - User slug {slug}: user_type v DB = {user.user_type}, ico = {user.ico}, contact_email = {user.contact_email}')

    from ..serializers import UserProfileSerializer

    serializer = UserProfileSerializer(user, context={'request': request})
    
    # Debug log - čo serializer vracia
    logger.info(f'🔍 Backend DEBUG - Serializer data: user_type = {serializer.data.get("user_type")}, ico = {serializer.data.get("ico")}, contact_email = {serializer.data.get("contact_email")}')
    
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_skills_view(request, user_id: int):
    """
    Read‑only zoznam zručností (ponúk) iného používateľa pre dashboard / vyhľadávanie.
    """
    skills_qs = OfferedSkill.objects.filter(user_id=user_id).order_by('-updated_at')
    serializer = OfferedSkillSerializer(skills_qs, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_skills_by_slug_view(request, slug: str):
    """
    Read‑only zoznam zručností iného používateľa podľa slug-u.
    """
    try:
        user = User.objects.get(slug=slug, is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'Používateľ nebol nájdený'}, status=status.HTTP_404_NOT_FOUND)

    skills_qs = OfferedSkill.objects.filter(user_id=user.id).order_by('-updated_at')
    serializer = OfferedSkillSerializer(skills_qs, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


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
