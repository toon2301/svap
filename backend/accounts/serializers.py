"""Compatibility exports for account serializers.

Serializers live in domain-specific modules so each file stays small and focused.
Keep importing from accounts.serializers for backwards compatibility.
"""

from .auth_serializers import (
    EmailVerificationSerializer,
    ResendVerificationSerializer,
    UserLoginSerializer,
    UserRegistrationSerializer,
)
from .notification_serializers import NotificationSerializer
from .offer_serializers import OfferedSkillSearchSerializer, OfferedSkillSerializer
from .profile_serializers import UserProfileSerializer
from .review_serializers import ReviewSerializer
from .skill_request_serializers import (
    SkillRequestCreateSerializer,
    SkillRequestSerializer,
)

__all__ = [
    "EmailVerificationSerializer",
    "NotificationSerializer",
    "OfferedSkillSearchSerializer",
    "OfferedSkillSerializer",
    "ResendVerificationSerializer",
    "ReviewSerializer",
    "SkillRequestCreateSerializer",
    "SkillRequestSerializer",
    "UserLoginSerializer",
    "UserProfileSerializer",
    "UserRegistrationSerializer",
]
