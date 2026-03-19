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

from ..models import OfferedSkill, OfferedSkillImage, Review, SkillRequest, SkillRequestStatus
from ..serializers import OfferedSkillSerializer
from django.core.exceptions import ValidationError


def _skills_list_queryset(base_qs):
    """Optimalizovaný queryset: select_related, prefetch_related, annotate – zníženie N+1."""
    return (
        base_qs.select_related("user")
        .prefetch_related("images")
        .annotate(
            _avg_rating=Avg("reviews__rating"),
            _reviews_count=Count("reviews", distinct=True),
        )
    )


def _skills_list_context(request, offer_ids):
    """Bulk dotazy pre can_review a already_reviewed – namiesto N+1."""
    if not offer_ids:
        return {}
    reviewed = set(
        Review.objects.filter(offer_id__in=offer_ids, reviewer=request.user).values_list(
            "offer_id", flat=True
        )
    )
    can_review = set(
        SkillRequest.objects.filter(
            offer_id__in=offer_ids,
            requester=request.user,
            status=SkillRequestStatus.ACCEPTED,
        ).values_list("offer_id", flat=True)
    )
    return {"reviewed_offer_ids": reviewed, "can_review_offer_ids": can_review}

SKILLS_LIST_CACHE_TTL_SECONDS = int(os.getenv("SKILLS_LIST_CACHE_TTL_SECONDS", "10") or "10")


def _skills_list_cache_key(user_id: int) -> str:
    return f"skills_list_v1:{int(user_id)}"


def _skills_list_cache_invalidate(user_id: int) -> None:
    try:
        cache.delete(_skills_list_cache_key(user_id))
    except Exception:
        pass


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skills_list_view(request):
    """
    GET: Zoznam zručností používateľa
    POST: Vytvorenie novej zručnosti
    """
    if request.method == "GET":
        t_cache0 = perf_counter()
        cached = None
        try:
            cached = cache.get(_skills_list_cache_key(request.user.id))
        except Exception:
            cached = None
        cache_ms = (perf_counter() - t_cache0) * 1000.0
        if isinstance(cached, list):
            try:
                base_req = getattr(request, "_request", request)
                st = getattr(base_req, "_server_timing", None)
                if not isinstance(st, dict):
                    st = {}
                st["skills_cache"] = cache_ms
                base_req._server_timing = st
            except Exception:
                pass
            return Response(cached, status=status.HTTP_200_OK)

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
        try:
            cache.set(_skills_list_cache_key(request.user.id), data, timeout=SKILLS_LIST_CACHE_TTL_SECONDS)
        except Exception:
            pass
        try:
            base_req = getattr(request, "_request", request)
            st = getattr(base_req, "_server_timing", None)
            if not isinstance(st, dict):
                st = {}
            st["skills_qs"] = (t_db1 - t_db0) * 1000.0
            st["skills_serialize"] = (t_ser1 - t_ser0) * 1000.0
            base_req._server_timing = st
        except Exception:
            pass
        return Response(data, status=status.HTTP_200_OK)

    elif request.method == "POST":
        # Log pre debugging (len v development)
        import logging

        logger = logging.getLogger(__name__)
        try:
            from django.conf import settings

            if getattr(settings, "DEBUG", False):
                logger.info(f"POST /api/auth/skills/ - Data: {request.data}")
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
        return Response(
            {"message": "Zručnosť bola odstránená"}, status=status.HTTP_204_NO_CONTENT
        )


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


def _get_s3_client():
    import boto3
    from django.conf import settings

    return boto3.client(
        "s3",
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
        region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_images_upload_init_view(request, skill_id):
    """
    Init direct-to-S3 upload for offer images.

    Returns a presigned POST payload:
      { url, fields, key, expires_in }
    Client uploads to S3 under `uploads/` prefix, then calls complete endpoint.
    """
    from django.conf import settings
    import os
    import uuid

    try:
        skill = OfferedSkill.objects.get(id=skill_id, user=request.user)
    except OfferedSkill.DoesNotExist:
        return Response({"error": "Zručnosť nebola nájdená"}, status=status.HTTP_404_NOT_FOUND)

    if skill.images.count() >= 6:
        return Response(
            {"error": "Maximálny počet obrázkov je 6"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    filename = str(request.data.get("filename") or "").strip()
    content_type = str(request.data.get("content_type") or "").strip()
    try:
        size_bytes = int(request.data.get("size_bytes") or 0)
    except Exception:
        size_bytes = 0

    if not filename or size_bytes <= 0:
        return Response({"error": "Neplatný súbor."}, status=status.HTTP_400_BAD_REQUEST)

    # Enforce max size (reuse same limit as validator)
    try:
        max_mb = int(getattr(settings, "IMAGE_MAX_SIZE_MB", 5))
    except Exception:
        max_mb = 5
    if size_bytes > max_mb * 1024 * 1024:
        return Response(
            {"error": f"Obrázok je príliš veľký. Maximálna veľkosť je {max_mb}MB."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ext = os.path.splitext(filename)[1].lower()
    allowed_extensions = [
        e.strip().lower()
        for e in getattr(
            settings,
            "ALLOWED_IMAGE_EXTENSIONS",
            [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"],
        )
    ]
    if ext not in allowed_extensions:
        return Response(
            {"error": "Neplatný typ súboru."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if not bucket:
        return Response({"error": "Storage nie je nakonfigurované."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Randomized key under uploads/; include skill_id for easy server-side validation
    key = f"uploads/offers/{skill_id}/{uuid.uuid4().hex}{ext}"

    expires_in = 120
    try:
        s3 = _get_s3_client()
        presigned = s3.generate_presigned_post(
            Bucket=bucket,
            Key=key,
            Conditions=[
                ["content-length-range", 1, max_mb * 1024 * 1024],
            ],
            ExpiresIn=expires_in,
        )
    except Exception as e:
        return Response(
            {"error": "Nepodarilo sa pripraviť upload."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "url": presigned.get("url"),
            "fields": presigned.get("fields", {}),
            "key": key,
            "expires_in": expires_in,
            "content_type": content_type or None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_images_upload_complete_view(request, skill_id):
    """
    Confirm a direct-to-S3 upload and create DB record as PENDING.
    Enqueues background processing (HEIC decode, resize, SafeSearch, move to media/).
    """
    from django.conf import settings
    import os

    try:
        skill = OfferedSkill.objects.get(id=skill_id, user=request.user)
    except OfferedSkill.DoesNotExist:
        return Response({"error": "Zručnosť nebola nájdená"}, status=status.HTTP_404_NOT_FOUND)

    if skill.images.count() >= 6:
        return Response(
            {"error": "Maximálny počet obrázkov je 6"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    key = str(request.data.get("key") or "").strip()
    if not key:
        return Response({"error": "Chýba key."}, status=status.HTTP_400_BAD_REQUEST)

    expected_prefix = f"uploads/offers/{skill_id}/"
    if not key.startswith(expected_prefix):
        return Response({"error": "Neplatný key."}, status=status.HTTP_400_BAD_REQUEST)

    ext = os.path.splitext(key)[1].lower()
    allowed_extensions = [
        e.strip().lower()
        for e in getattr(
            settings,
            "ALLOWED_IMAGE_EXTENSIONS",
            [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"],
        )
    ]
    if ext not in allowed_extensions:
        return Response({"error": "Neplatný typ súboru."}, status=status.HTTP_400_BAD_REQUEST)

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if not bucket:
        return Response({"error": "Storage nie je nakonfigurované."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Verify object exists in S3 and capture metadata
    try:
        s3 = _get_s3_client()
        head = s3.head_object(Bucket=bucket, Key=key)
    except Exception:
        return Response({"error": "Upload nebol nájdený."}, status=status.HTTP_400_BAD_REQUEST)

    size_bytes = int(head.get("ContentLength") or 0)
    content_type = str(head.get("ContentType") or "")

    order = skill.images.count()
    img = OfferedSkillImage.objects.create(
        skill=skill,
        order=order,
        status=OfferedSkillImage.Status.PENDING,
        pending_key=key,
        approved_key="",
        original_filename=str(request.data.get("filename") or ""),
        content_type=content_type,
        size_bytes=size_bytes or None,
    )
    _skills_list_cache_invalidate(request.user.id)

    # Enqueue background job (lazy import to avoid hard dependency if worker not deployed yet)
    try:
        from swaply.tasks.offer_images import process_offered_skill_image

        process_offered_skill_image.delay(img.id)
    except Exception:
        # Fail-open: record stays pending; can be retried manually by admin/command later
        pass

    return Response(
        {
            "id": img.id,
            "status": img.status,
            "order": img.order,
        },
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
