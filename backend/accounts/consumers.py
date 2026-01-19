import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Channels `scope` je dict, nie objekt – user je uložený pod kľúčom 'user'
        user = self.scope.get('user')
        if not user or isinstance(user, AnonymousUser) or not getattr(user, 'is_authenticated', False):
            # Debug prečo auth zlyhal (nastavené v JwtAuthMiddleware)
            try:
                logger.warning("WS reject: unauthenticated. path=%s error=%s", self.scope.get('path'), self.scope.get('ws_auth_error'))
            except Exception:
                pass
            await self.close(code=4401)
            return

        self.user_id = int(user.id)
        self.group_name = f"user_{self.user_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        try:
            if hasattr(self, 'group_name'):
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
        except Exception:
            return

    async def notify(self, event):
        payload = event.get('event') or {}
        await self.send(text_data=json.dumps(payload))


