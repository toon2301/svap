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
    USER_SKILL_REQUEST_TERMINATION_REASONS,
    exclude_block_terminated_requests,
    skill_request_is_reviewable,
)
from .notifications import Notification, NotificationType
from .offer_watches import (
    MAX_OFFER_WATCHES_PER_USER,
    OfferWatch,
    OfferWatchMatchOutbox,
    OfferWatchNotification,
)
from .feed_posts import (
    MAX_FEED_POST_IMAGES,
    FeedPost,
    FeedPostComment,
    FeedPostCommentLike,
    FeedPostImage,
    FeedPostLike,
    FeedPostReport,
    FeedPostTag,
)
from .profile_likes import ProfileLike
from .profile_visits import ProfileVisit
from .user_blocks import UserBlock
from .reviews import OfferedSkillLike, Review, ReviewLike
from .reports import FavoriteUser, PhotoReport, ReviewReport, UserReport
from .bug_reports import (
    BugReport,
    BugReportCategory,
    BugReportDeviceType,
    BugReportNotificationOutbox,
    BugReportPriority,
    BugReportStatus,
)

# WebPushSubscription žije v samostatnom module; re-export zachováva pôvodné
# `from accounts.models import WebPushSubscription`.
from ..webpush_models import WebPushSubscription

__all__ = [
    "MAX_FEED_POST_IMAGES",
    "BugReport",
    "BugReportCategory",
    "BugReportDeviceType",
    "BugReportNotificationOutbox",
    "BugReportPriority",
    "BugReportStatus",
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
    "USER_SKILL_REQUEST_TERMINATION_REASONS",
    "REVIEWABLE_SKILL_REQUEST_STATUSES",
    "exclude_block_terminated_requests",
    "skill_request_is_reviewable",
    "Notification",
    "NotificationType",
    "MAX_OFFER_WATCHES_PER_USER",
    "OfferWatch",
    "OfferWatchMatchOutbox",
    "OfferWatchNotification",
    "FeedPost",
    "FeedPostComment",
    "FeedPostCommentLike",
    "FeedPostImage",
    "FeedPostLike",
    "FeedPostReport",
    "FeedPostTag",
    "ProfileLike",
    "ProfileVisit",
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
