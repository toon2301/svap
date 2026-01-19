"""
Split settings base: imports settings chunks in the same order as the original settings.py
to preserve behavior.
"""

from .env import *  # noqa
from .security import *  # noqa
from .apps import *  # noqa
from .middleware_cfg import *  # noqa
from .templates_cfg import *  # noqa
from .database import *  # noqa
from .passwords import *  # noqa
from .i18n import *  # noqa
from .static_media import *  # noqa
from .rest_framework_cfg import *  # noqa
from .jwt import *  # noqa
from .cors_csrf import *  # noqa
from .cache import *  # noqa
from .rate_limiting_cfg import *  # noqa
from .captcha import *  # noqa
from .safesearch import *  # noqa
from .email import *  # noqa
from .auth import *  # noqa
from .logging_cfg import *  # noqa
from .oauth import *  # noqa
from .redirects import *  # noqa
from .channels_cfg import *  # noqa


