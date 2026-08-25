"""Zostavovanie komentárového querysetu a jeho stránkovanie.

Vyčlenené z ``feed_interactions``: window funkcia pre strop odpovedí,
prefetch a počty tvoria súvislý celok, ktorý s HTTP vrstvou nesúvisí.
"""

import logging

from django.db.models import Count, F, OuterRef, Prefetch, Subquery, Value, Window
from django.db.models.functions import Coalesce, RowNumber
from rest_framework.pagination import CursorPagination


from ..models import (
    FeedPostComment,
    FeedPostCommentLike,
)

logger = logging.getLogger(__name__)


#: Koľko odpovedí sa načíta pod jeden komentár. Zvyšok je dostupný cez
#: `replies_count` – klient vie, že tam sú, aj keď ich zatiaľ nevidí.
FEED_REPLIES_PREVIEW_LIMIT = 10


class FeedCommentCursorPagination(CursorPagination):
    """Cursor ako feed (konzistentné), ale chronologicky NAHOR – komentáre sa
    čítajú od najstaršieho (vlákno), nové prichádzajú na koniec."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50
    ordering = ("created_at", "id")
    #: Nastaví view, keď sa celkový počet líši od stránkovaného querysetu.
    forced_total_count: int | None = None

    def paginate_queryset(self, queryset, request, view=None):
        """Count počíta LEN pri prvom načítaní (request bez cursoru).

        CursorPagination count zámerne nepočíta – tu ho FE potrebuje, aby číslo
        pri ikone komentárov vychádzalo z toho istého načítania ako zoznam.
        Pri pokračovacích stránkach je však zbytočný a DRAHÝ: queryset je
        anotovaný ``Count("likes")``, takže `.count()` sa zabalí do subquery
        nad joinom komentárov a lajkov (nie prostý index count). Počítať ho pri
        každom „načítaj ďalšie" znamená opakovane skenovať celé vlákno –
        práca rastie s počtom stránok, teda kvadraticky s veľkosťou vlákna.
        FE ho pri donačítavaní aj tak zahadzuje.
        """
        self.total_count = None
        if request.query_params.get(self.cursor_query_param) is None:
            # `total_count` sa nastavuje zvonku (view), keď sa počet líši od
            # veľkosti stránkovaného querysetu – zoznam nesie len vrcholové
            # komentáre, ale číslo pri ikone musí zahŕňať aj odpovede.
            self.total_count = (
                self.forced_total_count
                if self.forced_total_count is not None
                else queryset.count()
            )
        return super().paginate_queryset(queryset, request, view=view)

    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        # Pri cursor requestoch pole ZÁMERNE chýba (nie None) – klient si tak
        # nemôže omylom prepísať správny počet nulou.
        if self.total_count is not None:
            response.data["count"] = self.total_count
        return response


def _liked_comment_ids(viewer, comments) -> set[int]:
    """ID komentárov lajknutých viewerom – 1 dotaz na stránku, anonym → set().

    Rovnaký vzor ako _liked_post_ids vo feed_posts (žiadne N+1).
    """
    if not getattr(viewer, "is_authenticated", False) or not comments:
        return set()
    return set(
        FeedPostCommentLike.objects.filter(
            user=viewer, comment_id__in=[comment.id for comment in comments]
        ).values_list("comment_id", flat=True)
    )


def post_comments_queryset(post):
    """Vrcholové komentáre príspevku s vnorenými odpoveďami a počtami.

    Presunuté 1:1 z ``feed_post_comments_view`` – dotaz sa nemenil,
    len prestal bývať uprostred HTTP vrstvy.
    """
    # Count bez distinct je tu bezpečný: v dotaze je JEDINÝ „many" vzťah, takže
    # nevzniká krížový join ako pri lajkoch × komentároch vo feede.
    # Stránkujú sa LEN vrcholové komentáre; odpovede prídu vnorené v nich,
    # takže kurzor ostáva stabilný a stránka má predvídateľnú veľkosť.
    #
    # Odpovedí sa načíta najviac FEED_REPLIES_PREVIEW_LIMIT na komentár. Bez
    # stropu by jeden komentár s tisíckami odpovedí stiahol celé vlákno do
    # jednej odpovede API. Reže sa NA ÚROVNI DB (window funkcia číslujúca
    # odpovede v rámci rodiča), nie až v Pythone – inak by sa riadky aj tak
    # museli všetky načítať a strop by nič neušetril.
    #
    # Nič sa nestráca: `replies_count` nesie skutočný počet, takže klient vie,
    # že je ich viac. Endpoint na dotiahnutie zvyšku zámerne nepridávam –
    # zadanie ho nežiada a dnešné vlákna sú krátke.
    ranked_replies = (
        # Zúžiť PRED očíslovaním: filtre uplatnené pred `Window` idú do
        # vnútorného dotazu, takže sa poradové čísla počítajú len nad
        # odpoveďami TOHTO príspevku. Bez toho okno prechádzalo celú tabuľku
        # komentárov appky – vrátane vrcholových, ktoré s `parent_comment_id`
        # NULL padali do jednej spoločnej partície a do očíslovania vôbec
        # nepatria.
        FeedPostComment.objects.filter(post=post, parent_comment__isnull=False)
        .annotate(
            _reply_rank=Window(
                expression=RowNumber(),
                partition_by=[F("parent_comment_id")],
                order_by=[F("created_at").asc(), F("id").asc()],
            )
        )
        .filter(_reply_rank__lte=FEED_REPLIES_PREVIEW_LIMIT)
    )

    replies_prefetch = Prefetch(
        "replies",
        queryset=FeedPostComment.objects.filter(
            pk__in=ranked_replies.values("pk")
        )
        .select_related("author")
        .annotate(_likes_count=Count("likes"))
        .order_by("created_at", "id"),
    )
    queryset = (
        FeedPostComment.objects.filter(post=post, parent_comment__isnull=True)
        .select_related("author")
        # Subquery, nie druhý Count: dva „many" vzťahy v jednom dotaze sa
        # spoja krížom (lajky × odpovede) – rovnaký dôvod, pre aký existuje
        # `_related_count_subquery` vo feed_posts.
        .annotate(
            _likes_count=Count("likes"),
            _replies_count=Coalesce(
                Subquery(
                    FeedPostComment.objects.filter(parent_comment=OuterRef("pk"))
                    .order_by()
                    .values("parent_comment")
                    .annotate(total=Count("pk"))
                    .values("total")[:1]
                ),
                Value(0),
            ),
        )
        .prefetch_related(replies_prefetch)
    )
    return queryset

