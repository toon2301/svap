"""
accounts models package.

Pôvodný veľký ``models.py`` bol rozdelený do tématických submodulov. Všetky
verejné mená sú re-exportované sem, takže ``from accounts.models import X``
funguje pre všetky existujúce import-sity bez zmeny.
"""

from .mfa import decrypt_mfa_secret, encrypt_mfa_secret
from .enums import (
    DesktopOnboardingStep,
    MobileOnboardingStatus,
    MobileOnboardingStep,
    SubscriptionTier,
    UserType,
)
from .user import User, UserProfile
from .verification import AccountDeletionRequest, EmailVerification
from .skills import (
    DashboardSkillSearchProjection,
    OfferedSkill,
    OfferedSkillImage,
)
from .skill_requests import (
    REVIEWABLE_SKILL_REQUEST_STATUSES,
    SkillRequest,
    SkillRequestStatus,
    SkillRequestTermination,
    SkillRequestTerminationReason,
)
from .notifications import Notification, NotificationType
from .profile_likes import ProfileLike
from .user_blocks import UserBlock
from .reviews import OfferedSkillLike, Review, ReviewLike
from .reports import FavoriteUser, PhotoReport, ReviewReport, UserReport

# WebPushSubscription žije v samostatnom module; re-export zachováva pôvodné
# `from accounts.models import WebPushSubscription`.
from ..webpush_models import WebPushSubscription

__all__ = [
    "decrypt_mfa_secret",
    "encrypt_mfa_secret",
    "UserType",
    "SubscriptionTier",
    "MobileOnboardingStatus",
    "MobileOnboardingStep",
    "DesktopOnboardingStep",
    "User",
    "UserProfile",
    "EmailVerification",
    "AccountDeletionRequest",
    "OfferedSkill",
    "DashboardSkillSearchProjection",
    "OfferedSkillImage",
    "SkillRequest",
    "SkillRequestStatus",
    "SkillRequestTerminationReason",
    "SkillRequestTermination",
    "REVIEWABLE_SKILL_REQUEST_STATUSES",
    "Notification",
    "NotificationType",
    "ProfileLike",
    "UserBlock",
    "Review",
    "ReviewLike",
    "OfferedSkillLike",
    "PhotoReport",
    "ReviewReport",
    "UserReport",
    "FavoriteUser",
    "WebPushSubscription",
]
