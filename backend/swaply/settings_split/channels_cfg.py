from .env import os

# Django Channels (WebSocket)
ASGI_APPLICATION = "swaply.asgi.application"

REDIS_URL = os.getenv("REDIS_URL", None)
CHANNELS_REDIS_URL = os.getenv("CHANNELS_REDIS_URL", None) or REDIS_URL

if CHANNELS_REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [CHANNELS_REDIS_URL]},
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
