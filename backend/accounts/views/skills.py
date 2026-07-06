"""
Skills views pre Swaply
"""

import os
from time import perf_counter
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F, Avg, Count
from django.core.cache import cache

from swaply.rate_limiting import api_rate_limit

from ..models import (
    OfferedSkill,
    OfferedSkillImage,
    OfferedSkillLike,
    Review,
    REVIEWABLE_SKILL_REQUEST_STATUSES,
    SkillRequest,
)
from ..serializers import OfferedSkillSerializer
from django.core.exceptions import ValidationError

from .skill_helpers import (
    SKILLS_LIST_CACHE_TTL_SECONDS,
    _record_skills_timing,
    _skills_list_cache_invalidate,
    _skills_list_cache_key,
    _skills_list_context,
    _skills_list_queryset,
)
# Re-export image upload views (presunuté do skills_upload) pre spätnú kompatibilitu
# (views/__init__ ich importuje z .skills).
from .skills_upload import (  # noqa: F401
    skill_images_upload_complete_view,
    skill_images_upload_init_view,
)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skills_list_view(request):
    """
    GET: Zoznam zručností používateľa
    POST: Vytvorenie novej zručnosti
    """
    if request.method == "GET":
        # Cache môže byť zdieľaná medzi doménami (napr. staging+prod na jednom Redis).
        # Payload obsahuje absolútne URL (host-specifické), preto host ukladáme do
        # hodnoty a pri čítaní akceptujeme len zhodu (kľúč aj invalidácia ostávajú
        # host-agnostické – invalidácia beží aj zo signálov bez requestu).
        try:
            host = request.get_host()
        except Exception:
            host = ""
        t_cache0 = perf_counter()
        cached = None
        try:
            cached = cache.get(_skills_list_cache_key(request.user.id))
        except Exception:
            cached = None
        cache_ms = (perf_counter() - t_cache0) * 1000.0
        if (
            isinstance(cached, dict)
            and cached.get("host") == host
            and isinstance(cached.get("data"), list)
        ):
            _record_skills_timing(
                request,
                skills_cache=cache_ms,
                skills_cache_get=cache_ms,
                skills_cache_set=0.0,
            )
            return Response(cached["data"], status=status.HTTP_200_OK)

        t_db0 = perf_counter()
        base = OfferedSkill.objects.filter(user=request.user)
        skills_qs = _skills_list_queryset(base)
        skills_list = list(skills_qs)
        t_db1 = perf_counter()
        offer_ids = [s.id for s in skills_list]
        ctx = {"request": request, **_skills_list_context(request, offer_ids)}
        t_ser0 = perf_counter()
        serializer = OfferedSkillSerializer(skills_list, many=True, context=ctx)
        # Ensure cache payload is plain list (avoid pickling issues with DRF ReturnList).
        data = list(serializer.data)
        t_ser1 = perf_counter()
        t_cache_set0 = perf_counter()
        try:
            cache.set(
                _skills_list_cache_key(request.user.id),
                {"host": host, "data": data},
                timeout=SKILLS_LIST_CACHE_TTL_SECONDS,
            )
        except Exception:
            pass
        cache_set_ms = (perf_counter() - t_cache_set0) * 1000.0
        _record_skills_timing(
            request,
            skills_cache_get=cache_ms,
            skills_cache_set=cache_set_ms,
            skills_qs=(t_db1 - t_db0) * 1000.0,
            skills_serialize=(t_ser1 - t_ser0) * 1000.0,
        )
        return Response(data, status=status.HTTP_200_OK)

    elif request.method == "POST":
        # Log pre debugging (len v development)
        import logging

        logger = logging.getLogger(__name__)
        try:
            from django.conf import settings

            if getattr(settings, "DEBUG", False):
                logger.info(
                    "POST /api/auth/skills/ - payload keys: %s",
                    sorted(getattr(request.data, "keys", lambda: [])()),
                )
        except Exception:
            pass

        serializer = OfferedSkillSerializer(
            data=request.data, context={"request": request}
        )

        if not serializer.is_valid():
            try:
                from django.conf import settings

                if getattr(settings, "DEBUG", False):
                    logger.warning(f"Serializer validation errors: {serializer.errors}")
            except Exception:
                pass
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        category = serializer.validated_data.get("category")
        subcategory = serializer.validated_data.get("subcategory")
        is_seeking = serializer.validated_data.get("is_seeking", False)

        # Kontrola limitu 3 karty pre každý typ samostatne (Ponúkam vs Hľadám)
        count_by_type = OfferedSkill.objects.filter(
            user=request.user, is_seeking=is_seeking
        ).count()

        if count_by_type >= 3:
            skill_type = "Hľadám" if is_seeking else "Ponúkam"
            return Response(
                {"error": f'Môžeš mať maximálne 3 karty v sekcii "{skill_type}".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if OfferedSkill.objects.filter(
            user=request.user, category=category, subcategory=subcategory
        ).exists():
            return Response(
                {"error": "Táto zručnosť už existuje"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save(user=request.user)
        _skills_list_cache_invalidate(request.user.id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skills_detail_view(request, skill_id):
    """
    GET: Detail zručnosti (aj pre cudzieho používateľa, ak profil je verejný a karta nie je skrytá)
    PUT/PATCH: Aktualizácia zručnosti (len vlastník)
    DELETE: Odstránenie zručnosti (len vlastník)
    """
    try:
        skill = OfferedSkill.objects.select_related("user").get(id=skill_id)
    except OfferedSkill.DoesNotExist:
        return Response(
            {"error": "Zručnosť nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
        )

    is_owner = skill.user_id == request.user.id

    if request.method == "GET":
        # Cudzí používateľ nesmie vidieť skrytú kartu ani kartu z privátneho profilu
        if not is_owner and (
            skill.is_hidden or not getattr(skill.user, "is_public", True)
        ):
            return Response(
                {"error": "Zručnosť nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = OfferedSkillSerializer(skill, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    # PUT/PATCH/DELETE len vlastník
    if not is_owner:
        return Response(
            {"error": "Zručnosť nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
        )

    if request.method in ["PUT", "PATCH"]:
        serializer = OfferedSkillSerializer(
            skill,
            data=request.data,
            partial=request.method == "PATCH",
            context={"request": request},
        )
        if serializer.is_valid():
            # Kontrola duplikátov pri update (ak sa mení category/subcategory)
            category = serializer.validated_data.get("category", skill.category)
            subcategory = serializer.validated_data.get(
                "subcategory", skill.subcategory
            )

            if category != skill.category or subcategory != skill.subcategory:
                if (
                    OfferedSkill.objects.filter(
                        user=request.user, category=category, subcategory=subcategory
                    )
                    .exclude(id=skill_id)
                    .exists()
                ):
                    return Response(
                        {"error": "Táto zručnosť už existuje"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            serializer.save()
            _skills_list_cache_invalidate(request.user.id)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        skill.delete()
        _skills_list_cache_invalidate(request.user.id)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_images_view(request, skill_id):
    """
    GET: Zoznam obrázkov pre zručnosť používateľa
    POST: Upload nového obrázka (multipart/form-data, pole: image)
    """
    try:
        skill = OfferedSkill.objects.get(id=skill_id, user=request.user)
    except OfferedSkill.DoesNotExist:
        return Response(
            {"error": "Zručnosť nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "GET":
        serializer = OfferedSkillSerializer(skill, context={"request": request})
        # Vrátime iba images pole pre efektivitu
        return Response(
            {"images": serializer.data.get("images", [])}, status=status.HTTP_200_OK
        )

    # POST upload
    # Log pre debugging (len v development)
    import logging

    logger = logging.getLogger(__name__)
    from time import perf_counter

    req_t0 = perf_counter()
    try:
        from django.conf import settings

        if getattr(settings, "DEBUG", False):
            logger.info(
                f"POST /api/auth/skills/{skill_id}/images/ - Files: {list(request.FILES.keys()) if request.FILES else 'No files'}"
            )
    except Exception:
        pass

    if "image" not in request.FILES:
        try:
            from django.conf import settings

            if getattr(settings, "DEBUG", False):
                logger.warning(
                    f"POST /api/auth/skills/{skill_id}/images/ - Missing 'image' field"
                )
        except Exception:
            pass
        return Response(
            {"error": 'Pole "image" je povinné'}, status=status.HTTP_400_BAD_REQUEST
        )

    # Limit počtu obrázkov na 6
    if skill.images.count() >= 6:
        return Response(
            {"error": "Maximálny počet obrázkov je 6"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    file = request.FILES["image"]

    # Explicitne validovať obrázok pred vytvorením (vrátane moderácie)
    from swaply.validators import validate_image_file

    try:
        t0 = perf_counter()
        validate_image_file(file)
        validate_ms = int((perf_counter() - t0) * 1000)
    except ValidationError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # Reset file pointer po validácii
    file.seek(0)

    try:
        t1 = perf_counter()
        img = OfferedSkillImage.objects.create(
            skill=skill, image=file, order=skill.images.count()
        )
        create_ms = int((perf_counter() - t1) * 1000)
    except ValidationError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    _skills_list_cache_invalidate(request.user.id)

    # Vráť jednoduché info o obrázku
    url = img.image.url if img.image else None
    if request and url:
        url = request.build_absolute_uri(url)

    try:
        from django.conf import settings

        if getattr(settings, "SAFESEARCH_TIMING_LOG", False) or getattr(
            settings, "SAFESEARCH_DEBUG_LOG", False
        ):
            total_ms = int((perf_counter() - req_t0) * 1000)
            logger.info(
                "skill_images_view timing: total_ms=%s validate_ms=%s storage_create_ms=%s size=%s name=%s",
                total_ms,
                validate_ms,
                create_ms,
                getattr(file, "size", None),
                getattr(file, "name", None),
            )
    except Exception:
        pass
    return Response(
        {"id": img.id, "image_url": url, "order": img.order},
        status=status.HTTP_201_CREATED,
    )



@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_image_detail_view(request, skill_id, image_id):
    """DELETE: Odstránenie jedného obrázka danej zručnosti"""
    try:
        skill = OfferedSkill.objects.get(id=skill_id, user=request.user)
    except OfferedSkill.DoesNotExist:
        return Response(
            {"error": "Zručnosť nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
        )

    try:
        image = skill.images.get(id=image_id)
    except OfferedSkillImage.DoesNotExist:
        return Response(
            {"error": "Obrázok nebol nájdený"}, status=status.HTTP_404_NOT_FOUND
        )

    image.delete()
    _skills_list_cache_invalidate(request.user.id)
    return Response(status=status.HTTP_204_NO_CONTENT)
