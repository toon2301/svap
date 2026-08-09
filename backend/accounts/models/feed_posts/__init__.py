"""Nástenka/Feed – dátové modely (Fáza 1: modely + upload fotky).

Rozdelené do modulov kvôli limitu 500 riadkov na produkčný BE súbor. Verejné
rozhranie ostáva nezmenené – všetky modely aj pomocné funkcie sa re-exportujú
sem, takže pôvodné importy (``from accounts.models.feed_posts import FeedPost``
aj ``from accounts.models import FeedPost``) fungujú bez úpravy.
"""

from .interactions import (
    FeedPostComment,
    FeedPostCommentLike,
    FeedPostLike,
    FeedPostTag,
)
from .post import SHARED_SNAPSHOT_FIELDS, FeedPost
from .reports import FeedPostReport
from .text_limits import (
    MAX_TEXT_LENGTH,
    _ensure_text_within_limit,
    ensure_text_within_limit,
)

__all__ = [
    "MAX_TEXT_LENGTH",
    "SHARED_SNAPSHOT_FIELDS",
    "FeedPost",
    "FeedPostComment",
    "FeedPostCommentLike",
    "FeedPostLike",
    "FeedPostReport",
    "FeedPostTag",
    "_ensure_text_within_limit",
    "ensure_text_within_limit",
]
