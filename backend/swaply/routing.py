from django.urls import re_path

from accounts.consumers import NotificationConsumer

websocket_urlpatterns = [
    # Channels scope['path'] môže mať aj vedúce '/', preto povoľme oba tvary.
    re_path(r'^/?ws/notifications/$', NotificationConsumer.as_asgi()),
]


