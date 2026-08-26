"""Feed interakcie – spätne kompatibilný vstupný bod.

Obsah sa rozrástol nad únosnú mieru pre jeden súbor, preto žije v menších
moduloch podľa príbuznosti:

* ``feed_interaction_helpers`` – viditeľnosť príspevku a 404 odpovede,
* ``feed_comment_queries``     – queryset komentárov a jeho stránkovanie,
* ``feed_likes``               – lajky a zoznamy tých, čo lajkli,
* ``feed_comments``            – komentáre a odpovede,
* ``feed_tags``                – odstránenie vlastného označenia,
* ``feed_reports``             – nahlásenie príspevku.

Tento modul ostáva ako re-export: ``urls.py``, ``views/__init__.py`` aj testy
importujú ďalej z pôvodnej cesty, takže rozdelenie je čisto presun kódu.
"""

from .feed_comment_queries import (
    FEED_REPLIES_PREVIEW_LIMIT,
    FeedCommentCursorPagination,
    _liked_comment_ids,
    post_comments_queryset,
)
from .feed_comments import (
    _create_comment,
    feed_post_comment_detail_view,
    feed_post_comment_replies_view,
    feed_post_comments_view,
)
from .feed_interaction_helpers import (
    _comment_not_found,
    _get_visible_post,
    _post_not_found,
)
from .feed_likes import (
    FeedLikersCursorPagination,
    _comment_like_payload,
    _like_payload,
    _likers_response,
    feed_post_comment_like_view,
    feed_post_comment_likers_view,
    feed_post_like_view,
    feed_post_likers_view,
)
from .feed_reports import _report_duplicate_response, feed_post_report_view
from .feed_tags import feed_post_self_tag_view

__all__ = [
    "FEED_REPLIES_PREVIEW_LIMIT",
    "FeedCommentCursorPagination",
    "FeedLikersCursorPagination",
    "_comment_like_payload",
    "_comment_not_found",
    "_create_comment",
    "_get_visible_post",
    "_like_payload",
    "_liked_comment_ids",
    "_likers_response",
    "_post_not_found",
    "_report_duplicate_response",
    "feed_post_comment_detail_view",
    "feed_post_comment_replies_view",
    "feed_post_comment_like_view",
    "feed_post_comment_likers_view",
    "feed_post_comments_view",
    "feed_post_like_view",
    "feed_post_likers_view",
    "feed_post_report_view",
    "feed_post_self_tag_view",
    "post_comments_queryset",
]
