"""Doménové create_*_notification funkcie.

Rozdelené do modulov podľa domény kvôli limitu 500 riadkov na produkčný BE
súbor. Jadro (create_notification, dispatch, unread count, cache, in_app gate)
žije v ``notification_core`` (leaf) a tieto funkcie ho volajú – tým sa vyhýbame
circular importu s ``notifications`` hubom.

Verejné rozhranie ostáva nezmenené: všetko sa re-exportuje sem, takže pôvodné
importy (``from accounts.services.notification_events import ...`` aj
``from accounts.services.notifications import ...``) fungujú bez úpravy.
"""

from .feed import (
    create_feed_post_comment_liked_notification,
    create_feed_post_comment_reply_notification,
    create_feed_post_commented_notification,
    create_feed_post_liked_notification,
    create_feed_post_shared_notification,
    create_feed_post_tagged_notification,
)
from .group_invitations import create_group_invitation_notification
from .likes import (
    create_offer_liked_notification,
    create_portfolio_liked_notification,
    create_profile_liked_notification,
)
from .offer_watches import create_offer_watch_match_notification
from .reviews import (
    create_review_created_notification,
    create_review_liked_notification,
    create_review_reply_notification,
)
from .skill_requests import (
    create_skill_request_accepted_notification,
    create_skill_request_completed_notification,
    create_skill_request_completion_requested_notification,
    create_skill_request_notification,
    create_skill_request_rejected_notification,
    create_skill_request_terminated_notification,
)

__all__ = [
    "create_feed_post_comment_liked_notification",
    "create_feed_post_comment_reply_notification",
    "create_feed_post_commented_notification",
    "create_feed_post_liked_notification",
    "create_feed_post_shared_notification",
    "create_feed_post_tagged_notification",
    "create_group_invitation_notification",
    "create_offer_liked_notification",
    "create_offer_watch_match_notification",
    "create_portfolio_liked_notification",
    "create_profile_liked_notification",
    "create_review_created_notification",
    "create_review_liked_notification",
    "create_review_reply_notification",
    "create_skill_request_accepted_notification",
    "create_skill_request_completed_notification",
    "create_skill_request_completion_requested_notification",
    "create_skill_request_notification",
    "create_skill_request_rejected_notification",
    "create_skill_request_terminated_notification",
]
