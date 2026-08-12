"""Celkový počet komentárov v cursor stránke.

FE ho potrebuje pri PRVOM načítaní (číslo pri ikone musí vychádzať z toho
istého dotazu ako zoznam). Pri donačítavaní ho zahadzuje, a keďže je queryset
anotovaný ``Count("likes")``, `.count()` sa zabalí do subquery nad joinom
komentárov a lajkov – opakovať ho pri každej stránke je zbytočne drahé.
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import FeedPost, FeedPostComment

User = get_user_model()


def _user(name):
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password="StrongPass123",
        is_public=True,
    )


class FeedCommentCountTests(APITestCase):
    def setUp(self):
        self.author = _user("fcc-author")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Príspevok",
        )
        for index in range(7):
            FeedPostComment.objects.create(
                post=self.post, author=self.author, text=f"Komentár {index}"
            )
        self.url = reverse("accounts:feed_post_comments", args=[self.post.id])

    def test_first_page_carries_the_total_count(self):
        response = self.client.get(self.url, {"page_size": 3})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)
        # Celkový počet, nie veľkosť stránky.
        self.assertEqual(response.data["count"], 7)

    def test_cursor_page_omits_count_entirely(self):
        first = self.client.get(self.url, {"page_size": 3})
        next_url = first.data["next"]
        self.assertIsNotNone(next_url)

        response = self.client.get(next_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # ZÁMERNE chýba, nie None – klient si tak nemôže prepísať správny
        # počet nulou.
        self.assertNotIn("count", response.data)

    def test_cursor_page_runs_no_count_query(self):
        first = self.client.get(self.url, {"page_size": 3})
        next_url = first.data["next"]

        from accounts.views.feed_interactions import FeedCommentCursorPagination

        # Patch priamo na QuerySet.count – `total_count is None` sa dá dosiahnuť
        # aj tak, že sa count zavolá a výsledok zahodí; toto overuje, že dotaz
        # naozaj NEPADNE (o to pri kvadratickej práci ide).
        with (
            patch.object(
                QuerySet, "count", autospec=True, side_effect=QuerySet.count
            ) as count_spy,
            patch.object(
                FeedCommentCursorPagination,
                "paginate_queryset",
                autospec=True,
                side_effect=FeedCommentCursorPagination.paginate_queryset,
            ) as spy,
        ):
            response = self.client.get(next_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        count_spy.assert_not_called()
        paginator = spy.call_args.args[0]
        # Agregácia sa pri pokračovaní vôbec nespustí.
        self.assertIsNone(paginator.total_count)

    def test_first_page_does_run_the_count_query(self):
        """Protipól predošlého testu – bez neho by `assert_not_called` prešiel
        aj vtedy, keby sa count nevolal NIKDY (teda ani na prvej stránke)."""
        from django.db.models import QuerySet as _QuerySet

        with patch.object(
            _QuerySet, "count", autospec=True, side_effect=_QuerySet.count
        ) as count_spy:
            response = self.client.get(self.url, {"page_size": 3})

        self.assertEqual(response.data["count"], 7)
        self.assertTrue(count_spy.called)
