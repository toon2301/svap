"""Upload fotiek pre FeedPost (Fáza 4.4) – rovnaký reťazec ako portfólio:
init (presigned S3 POST) → klient nahrá do stagingu → complete (head_object +
SafeSearch moderácia) → Celery WEBP varianty.

Od Fázy 4.4 je limit 5 fotiek na príspevok a každá žije vo vlastnom
``FeedPostImage`` riadku (predtým 1 fotka v poliach na FeedPost). Endpointy sú
preto per-obrázok, presne ako portfolio ``image_views``:
  - ``POST .../images/upload-init/``            → vytvorí záznam, vráti presigned
  - ``POST .../images/<image_id>/upload-complete/`` → moderácia + spracovanie

Každá fotka prechádza moderáciou NEZÁVISLE – zamietnutie jednej ostatné
neovplyvní. Stále bez local-upload presign fallbacku (dev-only vetva portfólia
je naviazaná na portfolio kľúče; spracovanie local storage podporuje).
"""

import logging
import os
import uuid

from django.conf import settings
from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from portfolio.image_storage import delete_storage_keys
from portfolio.image_storage import get_s3_client as _get_s3_client
from portfolio.local_upload import local_portfolio_upload_enabled
from portfolio.upload_constraints import allowed_image_extensions, max_image_bytes
from swaply.rate_limiting import api_rate_limit

from ..feed_image_processing import PROCESSING_ENQUEUE_ERROR
from ..models import MAX_FEED_POST_IMAGES, FeedPost, FeedPostImage

logger = logging.getLogger(__name__)

UPLOAD_EXPIRES_SECONDS = 600
# Zhodné s FeedPostImage.original_filename.max_length.
MAX_ORIGINAL_FILENAME_LENGTH = 255


def _post_not_found():
    return Response(
        {"error": "Prispevok nebol najdeny."},
        status=status.HTTP_404_NOT_FOUND,
    )


def _image_not_found():
    return Response(
        {"error": "Fotka nebola najdena."},
        status=status.HTTP_404_NOT_FOUND,
    )


def _images_limit_response():
    return Response(
        {
            "error": f"Maximalny pocet fotiek prispevku je {MAX_FEED_POST_IMAGES}.",
            "code": "feed_post_images_limit_reached",
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


def _reject_pending_image(image_id: int, reason: str) -> None:
    """Uvoľní miesto v limite po neúspešnom uploade.

    Záznam vzniká už pri INITE, takže keď complete zlyhá, nesmie ostať PENDING:
    ``_active_images_q()`` by ho počítal naveky a používateľ by po piatich
    neúspešných pokusoch narazil na falošný limit bez možnosti nahrať náhradu.
    ``pending_key`` sa zároveň čistí – staging objekt je vtedy už zmazaný,
    takže by kľúč držal mŕtvy odkaz.

    Filter na PENDING drží idempotenciu: hotovú APPROVED fotku (opakovaný
    complete) to nesmie zhodiť.
    """
    FeedPostImage.objects.filter(
        id=image_id, status=FeedPostImage.Status.PENDING
    ).update(
        status=FeedPostImage.Status.REJECTED,
        rejected_reason=reason[:255],
        pending_key="",
        processed_at=timezone.now(),
    )


def _parse_bool(value) -> bool:
    """Tolerantné čítanie príznaku – JSON pošle bool, multipart reťazec.

    Zhodné s ``feed_posts._parse_bool``; kopíruje sa zámerne, aby si upload
    modul neťahal závislosť na module s vytváraním príspevku.
    """
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _get_own_free_post(request, post_id: int) -> FeedPost | None:
    """Fotky smie mať len VLASTNÝ voľný príspevok.

    Zdieľania fotku nemajú – od Fázy 4.4 to už nevynucuje DB CheckConstraint
    (počet riadkov v child tabuľke sa constraintom vyjadriť nedá), takže je to
    jediné miesto, kde sa to kontroluje.
    """
    try:
        return FeedPost.objects.get(
            id=post_id,
            author=request.user,
            post_type=FeedPost.PostType.FREE_POST,
        )
    except FeedPost.DoesNotExist:
        return None


def _active_images_q():
    """Miesto v limite zaberá aj rozpracovaná fotka – inak by sa dalo cez
    opakovaný init nahrať viac než MAX_FEED_POST_IMAGES."""
    return Q(status=FeedPostImage.Status.PENDING) | Q(
        status=FeedPostImage.Status.APPROVED
    )


def _next_image_order(post: FeedPost) -> int:
    current_max = post.images.aggregate(value=Max("order"))["value"]
    return 0 if current_max is None else current_max + 1


def _validate_upload_metadata(request):
    """Rovnaká validácia ako portfólio upload-init (filename/veľkosť/prípona)."""
    filename = str(request.data.get("filename") or "").strip()
    content_type = str(request.data.get("content_type") or "").strip()
    try:
        size_bytes = int(request.data.get("size_bytes") or 0)
    except (TypeError, ValueError):
        size_bytes = 0

    if not filename:
        return None, None, 0, Response(
            {"error": "Chyba filename."}, status=status.HTTP_400_BAD_REQUEST
        )

    max_bytes = max_image_bytes()
    if size_bytes <= 0 or size_bytes > max_bytes:
        return None, None, 0, Response(
            {
                "error": (
                    "Neplatna velkost suboru. Maximum je "
                    f"{max_bytes // (1024 * 1024)}MB."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_image_extensions():
        return None, None, 0, Response(
            {"error": "Neplatny typ suboru."}, status=status.HTTP_400_BAD_REQUEST
        )

    return filename, content_type, size_bytes, None


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_image_upload_init_view(request, post_id: int):
    """Vytvorí FeedPostImage záznam a vráti presigned POST pre TÚTO fotku."""
    post = _get_own_free_post(request, post_id)
    if post is None:
        return _post_not_found()

    filename, content_type, size_bytes, error_response = _validate_upload_metadata(
        request
    )
    if error_response is not None:
        return error_response

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if not bucket:
        return Response(
            {"error": "Storage nie je nakonfigurovane."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    ext = os.path.splitext(filename)[1].lower()

    # Limit aj vytvorenie záznamu pod zámkom príspevku – dva súbežné inity by
    # inak obe videli count() < MAX a limit by sa dal prekročiť.
    with transaction.atomic():
        locked = FeedPost.objects.select_for_update().filter(pk=post.pk).first()
        if locked is None:
            return _post_not_found()
        if locked.images.filter(_active_images_q()).count() >= MAX_FEED_POST_IMAGES:
            return _images_limit_response()

        image = FeedPostImage.objects.create(
            post=locked,
            order=_next_image_order(locked),
            status=FeedPostImage.Status.PENDING,
            original_filename=filename[:MAX_ORIGINAL_FILENAME_LENGTH],
            content_type=content_type or "",
            size_bytes=size_bytes,
        )

    key = f"uploads/feed/{post_id}/{image.id}/{uuid.uuid4().hex}{ext}"
    try:
        presigned = _get_s3_client().generate_presigned_post(
            Bucket=bucket,
            Key=key,
            Conditions=[
                ["content-length-range", 1, max_image_bytes()],
            ],
            ExpiresIn=UPLOAD_EXPIRES_SECONDS,
        )
    except Exception:
        logger.exception(
            "Failed to generate feed image presigned upload",
            extra={"feed_post_id": post_id, "feed_post_image_id": image.id},
        )
        # Bez presigned URL sa fotka nikdy nenahrá – prázdny PENDING záznam by
        # navždy zaberal miesto v limite.
        image.delete()
        return Response(
            {"error": "Nepodarilo sa pripravit upload."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "image_id": image.id,
            "url": presigned.get("url"),
            "fields": presigned.get("fields", {}),
            "key": key,
            "expires_in": UPLOAD_EXPIRES_SECONDS,
            "content_type": content_type or None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_image_upload_complete_view(request, post_id: int, image_id: int):
    """Overí staging objekt, prejde moderáciou a naplánuje spracovanie."""
    post = _get_own_free_post(request, post_id)
    if post is None:
        # Príspevok medzitým zanikol – staging objekt už nemá komu patriť,
        # takže by inak visel v úložisku navždy.
        #
        # Upratuje sa LEN keď riadok naozaj neexistuje: pri CUDZOM príspevku
        # (ktorý sem spadne tiež) by sa takto dal zmazať rozbehnutý upload
        # niekoho iného. Kontrola prefixu ostáva, nech sa nedá podstrčiť kľúč
        # mimo tohto príspevku.
        stale_key = str(request.data.get("key") or "").strip()
        if (
            stale_key.startswith(f"uploads/feed/{post_id}/")
            and not FeedPost.objects.filter(pk=post_id).exists()
        ):
            delete_storage_keys([stale_key])
        return _post_not_found()

    if not FeedPostImage.objects.filter(pk=image_id, post_id=post.id).exists():
        return _image_not_found()

    filename = str(request.data.get("filename") or "").strip()
    key = str(request.data.get("key") or "").strip()
    if not key:
        _reject_pending_image(image_id, "Upload sa nedokoncil.")
        return Response({"error": "Chyba key."}, status=status.HTTP_400_BAD_REQUEST)

    # Kľúč musí patriť TEJTO fotke tohto príspevku – inak by sa dal podstrčiť
    # staging objekt z cudzieho uploadu.
    expected_prefix = f"uploads/feed/{post_id}/{image_id}/"
    if not key.startswith(expected_prefix):
        _reject_pending_image(image_id, "Upload sa nedokoncil.")
        return Response(
            {"error": "Neplatny key."}, status=status.HTTP_400_BAD_REQUEST
        )

    ext = os.path.splitext(key)[1].lower()
    if ext not in allowed_image_extensions():
        # Kľúč už prešiel kontrolou prefixu, takže patrí TEJTO fotke –
        # zmazať ho je bezpečné a inak by staging objekt ostal ako orphan.
        delete_storage_keys([key])
        _reject_pending_image(image_id, "Neplatny typ suboru.")
        return Response(
            {"error": "Neplatny typ suboru."}, status=status.HTTP_400_BAD_REQUEST
        )

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if not bucket:
        _reject_pending_image(image_id, "Storage nie je dostupne.")
        return Response(
            {"error": "Storage nie je nakonfigurovane."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        head = _get_s3_client().head_object(Bucket=bucket, Key=key)
    except Exception:
        # head_object mohol zlyhať aj inak než „objekt neexistuje" (timeout,
        # 5xx) – vtedy objekt visí v stagingu, takže sa maže best-effort.
        delete_storage_keys([key])
        _reject_pending_image(image_id, "Upload nebol najdeny.")
        return Response(
            {"error": "Upload nebol najdeny."}, status=status.HTTP_400_BAD_REQUEST
        )
    size_bytes = int(head.get("ContentLength") or 0)
    content_type = str(head.get("ContentType") or "")

    if size_bytes <= 0 or size_bytes > max_image_bytes():
        delete_storage_keys([key])
        _reject_pending_image(image_id, "Neplatny subor.")
        return Response(
            {"error": "Neplatny subor."}, status=status.HTTP_400_BAD_REQUEST
        )

    # Preflight SafeSearch moderácia pred zápisom do DB (vzor portfólia).
    # Beží pre KAŽDÚ fotku zvlášť – rovnaký bezpečnostný štandard ako pri jednej.
    if getattr(settings, "SAFESEARCH_ENABLED", False):
        # Import MIMO try – keby zlyhal vnútri, except vetva by odkazovala na
        # nedefinovaný ModerationRejectedError (NameError namiesto čistej chyby).
        from swaply.staged_image_moderation import (
            ModerationRejectedError,
            moderate_staged_s3_image,
        )

        try:
            moderate_staged_s3_image(bucket, key)
        except ModerationRejectedError as e:
            # Defense-in-depth orphan cleanup (rovnaký vzor ako portfólio).
            delete_storage_keys([key])
            _reject_pending_image(image_id, e.user_message)
            return Response(
                {"error": e.user_message, "code": e.code},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            # Výpadok moderácie nesmie nechať staging objekt visieť ani vrátiť
            # neošetrenú 500 – fotku neprijmeme (fail-closed, ako pri rejectnutí).
            logger.exception(
                "Feed image moderation failed",
                extra={"feed_post_id": post_id, "feed_post_image_id": image_id},
            )
            delete_storage_keys([key])
            _reject_pending_image(image_id, "Overenie obrazka zlyhalo.")
            return Response(
                {"error": "Nepodarilo sa overit obrazok. Skuste to znova."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    with transaction.atomic():
        # Príspevok pod zámkom: medzi kontrolami vyššie a zápisom ho mohol
        # majiteľ zmazať alebo mu odobrať poslednú fotku. Zámok drží pravidlo
        # „príspevok nesmie ostať prázdny" a značku úpravy v jednej transakcii
        # so zápisom fotky – rovnaké poradie zámkov (FeedPost, potom
        # FeedPostImage) ako vo `FeedPost.save()`.
        locked_post = FeedPost.objects.select_for_update().filter(pk=post.id).first()
        if locked_post is None:
            transaction.on_commit(lambda: delete_storage_keys([key]))
            return _post_not_found()

        image = (
            FeedPostImage.objects.select_for_update()
            .filter(pk=image_id, post_id=locked_post.id)
            .first()
        )
        if image is None:
            transaction.on_commit(lambda: delete_storage_keys([key]))
            return _image_not_found()

        if image.status == FeedPostImage.Status.APPROVED:
            transaction.on_commit(lambda: delete_storage_keys([key]))
            return Response(
                {"error": "Fotka uz bola spracovana.", "code": "feed_image_exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        image.status = FeedPostImage.Status.PENDING
        image.pending_key = key
        # Klientom poslaný názov orež na dĺžku poľa – inak by save() spadol na
        # DataError (názov je len kozmetický údaj, nie dôvod odmietnuť upload).
        image.original_filename = (
            filename[:MAX_ORIGINAL_FILENAME_LENGTH] or image.original_filename
        )
        image.content_type = content_type
        image.size_bytes = size_bytes
        image.rejected_reason = ""
        # Retry po zamietnutí: starý čas spracovania by inak ostal a tváril sa,
        # že tento (ešte nespracovaný) PENDING upload je už vybavený.
        image.processed_at = None
        image.save(
            update_fields=[
                "status",
                "pending_key",
                "original_filename",
                "content_type",
                "size_bytes",
                "rejected_reason",
                "processed_at",
            ]
        )

        # Fotka pridaná ÚPRAVOU značí príspevok ako upravený; fotka nahraná
        # hneď po vytvorení nie – tam je to súčasť vzniku, nie zmena.
        #
        # Rozlíšiť to server sám nevie: obe cesty volajú ten istý endpoint nad
        # príspevkom, ktorý už existuje (S3 kľúč potrebuje post_id), takže
        # žiadny stav v DB tie dva prípady neodlíši. Preto to hovorí klient –
        # rovnako vedomá dôvera ako pri ``will_attach_photo`` vo
        # ``_create_feed_post``. Zneužitie nič neotvára: ``is_edited`` je
        # kozmetický príznak, ktorý backend posiela LEN autorovi, takže
        # klamstvom si používateľ nanajvýš označí vlastný príspevok sám sebe.
        #
        # Zapisuje sa POD ZÁMKOM, spolu s fotkou – po jeho uvoľnení by riadok
        # už nemusel existovať.
        if _parse_bool(request.data.get("is_edit")):
            from .feed_edits import _mark_post_edited

            _mark_post_edited(locked_post)

        def enqueue_processing(image_id=image.id, key=key):
            try:
                if local_portfolio_upload_enabled():
                    from accounts.feed_image_processing import (
                        process_feed_post_image_record,
                    )

                    process_feed_post_image_record(image_id)
                else:
                    from swaply.tasks.feed_images import process_feed_post_image

                    process_feed_post_image.delay(image_id)
            except Exception as exc:
                logger.exception(
                    "Failed to enqueue feed post image processing",
                    extra={"feed_post_image_id": image_id, "error": str(exc)},
                )
                processed_at = timezone.now()
                FeedPostImage.objects.filter(
                    id=image_id,
                    status=FeedPostImage.Status.PENDING,
                ).update(
                    status=FeedPostImage.Status.REJECTED,
                    rejected_reason=PROCESSING_ENQUEUE_ERROR,
                    processed_at=processed_at,
                )
                delete_storage_keys([key])

        transaction.on_commit(enqueue_processing)

    image.refresh_from_db()
    return Response(
        {
            "id": image.id,
            "post_id": image.post_id,
            "status": image.status,
        },
        status=status.HTTP_200_OK,
    )
