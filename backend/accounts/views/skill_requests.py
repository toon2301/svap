"""
Skill request (Žiadosti) API views.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..models import (
    SkillRequest,
    SkillRequestStatus,
    Notification,
    NotificationType,
)
from ..serializers import SkillRequestCreateSerializer, SkillRequestSerializer, NotificationSerializer
from typing import Optional

from ..realtime import notify_user


def _notify_unread_count(user_id: int, notif: Optional[Notification] = None) -> None:
    try:
        unread = Notification.objects.filter(
            user_id=user_id,
            type=NotificationType.SKILL_REQUEST,
            is_read=False,
        ).count()
    except Exception:
        unread = 0

    event = {
        "type": "skill_request",
        "unread_count": unread,
    }
    if notif is not None:
        try:
            event["notification"] = NotificationSerializer(notif).data
        except Exception:
            pass

    notify_user(user_id, event)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_requests_view(request):
    """
    GET: vráti {received: [], sent: []}
    POST: vytvorí žiadosť o kartu (offer_id)
    """
    if request.method == 'GET':
        received = SkillRequest.objects.filter(recipient=request.user).select_related(
            'requester', 'recipient', 'offer', 'offer__user'
        )
        sent = SkillRequest.objects.filter(requester=request.user).select_related(
            'requester', 'recipient', 'offer', 'offer__user'
        )
        received_serializer = SkillRequestSerializer(received, many=True, context={'request': request})
        sent_serializer = SkillRequestSerializer(sent, many=True, context={'request': request})

        received_data = received_serializer.data
        return Response(
            {
                'received': received_data,
                'sent': sent_serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # POST
    create_serializer = SkillRequestCreateSerializer(data=request.data, context={'request': request})
    if not create_serializer.is_valid():
        return Response(create_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    offer = create_serializer.context.get('offer_obj')
    if not offer:
        return Response({'error': 'Karta neexistuje.'}, status=status.HTTP_400_BAD_REQUEST)

    recipient = offer.user

    created = False
    try:
        obj = SkillRequest.objects.select_related('offer', 'requester', 'recipient').get(
            requester=request.user, offer=offer
        )
        # Re-open pri zrušení / zamietnutí
        if obj.status in (SkillRequestStatus.CANCELLED, SkillRequestStatus.REJECTED):
            obj.status = SkillRequestStatus.PENDING
            obj.recipient = recipient
            obj.save(update_fields=['status', 'recipient', 'updated_at'])
        else:
            return Response(SkillRequestSerializer(obj, context={'request': request}).data, status=status.HTTP_200_OK)
    except SkillRequest.DoesNotExist:
        obj = SkillRequest.objects.create(
            requester=request.user,
            recipient=recipient,
            offer=offer,
            status=SkillRequestStatus.PENDING,
        )
        created = True

    # Notifikácia pre vlastníka karty
    try:
        if offer.is_seeking:
            title = 'Nová žiadosť'
            body = f"{request.user.display_name} ponúka pomoc s kartou: {offer.subcategory or offer.category}"
        else:
            title = 'Nová žiadosť'
            body = f"{request.user.display_name} má záujem o ponuku: {offer.subcategory or offer.category}"

        notif = Notification.objects.create(
            user=recipient,
            type=NotificationType.SKILL_REQUEST,
            title=title,
            body=body,
            data={
                'skill_request_id': obj.id,
                'offer_id': offer.id,
                'offer_is_seeking': bool(offer.is_seeking),
                'from_user_id': request.user.id,
            },
            skill_request=obj,
        )
        _notify_unread_count(recipient.id, notif)
    except Exception:
        # fail-open: žiadosť je dôležitejšia ako notifikácia
        pass

    return Response(
        SkillRequestSerializer(obj, context={'request': request}).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_requests_status_view(request):
    """
    GET /skill-requests/status/?offer_ids=1,2,3
    Vráti mapu: { "1": "pending", ... }
    """
    raw = (request.query_params.get('offer_ids') or '').strip()
    if not raw:
        return Response({}, status=status.HTTP_200_OK)

    ids = []
    for part in raw.split(','):
        part = part.strip()
        if not part:
            continue
        try:
            ids.append(int(part))
        except Exception:
            continue

    if not ids:
        return Response({}, status=status.HTTP_200_OK)

    qs = SkillRequest.objects.filter(requester=request.user, offer_id__in=ids)
    result = {str(r.offer_id): r.status for r in qs}
    return Response(result, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_request_detail_view(request, request_id: int):
    """
    PATCH /skill-requests/<id>/
    Body: { action: 'accept'|'reject'|'cancel' }
    """
    try:
        obj = SkillRequest.objects.select_related('offer', 'requester', 'recipient').get(id=request_id)
    except SkillRequest.DoesNotExist:
        return Response({'error': 'Žiadosť neexistuje.'}, status=status.HTTP_404_NOT_FOUND)

    # AuthZ
    if request.user.id not in (obj.requester_id, obj.recipient_id):
        return Response({'error': 'Nemáš prístup.'}, status=status.HTTP_403_FORBIDDEN)

    action = (request.data.get('action') or '').strip().lower()
    if action not in {'accept', 'reject', 'cancel'}:
        return Response({'error': 'Neplatná akcia.'}, status=status.HTTP_400_BAD_REQUEST)

    # Recipient môže accept/reject, requester môže cancel
    if action in {'accept', 'reject'} and request.user.id != obj.recipient_id:
        return Response({'error': 'Nemáš oprávnenie.'}, status=status.HTTP_403_FORBIDDEN)
    if action == 'cancel' and request.user.id != obj.requester_id:
        return Response({'error': 'Nemáš oprávnenie.'}, status=status.HTTP_403_FORBIDDEN)

    # Stavové prechody
    if action == 'accept' and obj.status == SkillRequestStatus.PENDING:
        obj.status = SkillRequestStatus.ACCEPTED
        obj.save(update_fields=['status', 'updated_at'])
    elif action == 'reject' and obj.status == SkillRequestStatus.PENDING:
        obj.status = SkillRequestStatus.REJECTED
        obj.save(update_fields=['status', 'updated_at'])
    elif action == 'cancel' and obj.status == SkillRequestStatus.PENDING:
        obj.status = SkillRequestStatus.CANCELLED
        obj.save(update_fields=['status', 'updated_at'])
    else:
        # nič nemeníme, ale vrátime aktuálny stav
        return Response(SkillRequestSerializer(obj, context={'request': request}).data, status=status.HTTP_200_OK)

    # Notifikácia pre druhú stranu (prijatie/zamietnutie)
    try:
        if obj.status == SkillRequestStatus.ACCEPTED:
            notif_type = NotificationType.SKILL_REQUEST_ACCEPTED
            title = 'Žiadosť prijatá'
            body = f"{obj.recipient.display_name} prijal/a tvoju žiadosť."
            notif_user = obj.requester
        elif obj.status == SkillRequestStatus.REJECTED:
            notif_type = NotificationType.SKILL_REQUEST_REJECTED
            title = 'Žiadosť zamietnutá'
            body = f"{obj.recipient.display_name} zamietol/a tvoju žiadosť."
            notif_user = obj.requester
        else:
            notif_type = NotificationType.SKILL_REQUEST_CANCELLED
            title = 'Žiadosť zrušená'
            body = f"{obj.requester.display_name} zrušil/a žiadosť."
            notif_user = obj.recipient

        notif = Notification.objects.create(
            user=notif_user,
            type=notif_type,
            title=title,
            body=body,
            data={
                'skill_request_id': obj.id,
                'offer_id': obj.offer_id,
            },
            skill_request=obj,
        )
        # Badge aktualizujeme len pre SKILL_REQUEST typ (počet „neprečítaných žiadostí“)
        if notif_user and notif_user.id:
            _notify_unread_count(notif_user.id, notif if notif.type == NotificationType.SKILL_REQUEST else None)
    except Exception:
        pass

        return Response(SkillRequestSerializer(obj, context={'request': request}).data, status=status.HTTP_200_OK)
    return Response(SkillRequestSerializer(obj, context={'request': request}).data, status=status.HTTP_200_OK)


