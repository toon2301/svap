from __future__ import annotations

from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from swaply.rate_limiting import api_rate_limit

from ..models import ConversationParticipant
from ..services.presence import store_message_presence
from .serializers import MessagePresenceSerializer


class MessagePresenceView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(api_rate_limit)
    def post(self, request):
        serializer = MessagePresenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        visible = bool(serializer.validated_data["visible"])
        active_conversation_id = serializer.validated_data.get(
            "active_conversation_id"
        )

        if visible and active_conversation_id is not None:
            is_participant = ConversationParticipant.objects.filter(
                conversation_id=active_conversation_id,
                user_id=request.user.id,
            ).exists()
            if not is_participant:
                return Response(
                    {"error": "Neplatne udaje."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        payload = store_message_presence(
            user_id=request.user.id,
            visible=visible,
            active_conversation_id=active_conversation_id,
        )
        return Response({"ok": True, "presence": payload}, status=status.HTTP_200_OK)
