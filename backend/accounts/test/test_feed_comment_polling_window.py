"""Kontrakt endpointu komentárov, na ktorom stojí polling na FE.

Vzniklo z nálezu G3: zmazaný komentár ostával na obrazovke až do reloadu.
Príčina nebola v zlučovaní na FE, ale v tvare dopytu – polling sa pýtal cez
uložený kurzor a odpoveď kurzorovej stránky o ničom PRED sebou nevypovedá.

Tieto testy fixujú tri vlastnosti, ktoré si FE (`FeedPostComments.refresh`)
vynucuje: dosah kurzorovej stránky, prítomnosť `count` a strop `page_size`.
Keby sa ktorákoľvek zmenila, polling potichu prestane robiť to, čo má.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import FeedPost, FeedPostComment

User = get_user_model()

FE_PAGE_SIZE = 10  # COMMENTS_PAGE_SIZE vo FeedPostComments.tsx
FE_MAX_POLL_SIZE = 50  # COMMENTS_MAX_POLL_SIZE vo FeedPostComments.tsx


class FeedCommentPollingWindowTests(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="poll-author",
            email="poll-author@example.com",
            password="StrongPass123",
            is_public=True,
        )
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Vlakno",
        )
        # Rozostup v čase ako v realite – bez neho by zhodné created_at
        # posunuli kurzor do offsetového režimu a test by meral niečo iné.
        base = timezone.now() - timedelta(hours=2)
        self.comments = []
        for index in range(15):
            comment = FeedPostComment.objects.create(
                post=self.post, author=self.author, text=f"K{index + 1}"
            )
            FeedPostComment.objects.filter(pk=comment.pk).update(
                created_at=base + timedelta(minutes=index)
            )
            self.comments.append(comment)

        self.client.force_authenticate(user=self.author)
        self.url = reverse("accounts:feed_post_comments", args=[self.post.id])

    def _ids(self, response):
        return [item["id"] for item in response.data["results"]]

    def _follow(self, next_url):
        """Zavolá `next` odkaz tak, ako to robí FE (relatívna cesta)."""
        return self.client.get("/api" + next_url.split("/api", 1)[1])

    def test_count_only_on_requests_without_cursor(self):
        first = self.client.get(self.url, {"page_size": FE_PAGE_SIZE})
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["count"], 15)

        # Číslo pri ikone komentárov preto smie vychádzať LEN z dopytu bez
        # kurzora – polling cez kurzor by ho nikdy neaktualizoval.
        second = self._follow(first.data["next"])
        self.assertNotIn("count", second.data)

    def test_cursor_page_says_nothing_about_newer_comments(self):
        """Jadro G3 – kurzorová stránka nie je dôkazom o ničom pred sebou.

        Pri novom smere (najnovšie hore) je „pred sebou" = NOVŠIE komentáre,
        takže zmazanie na prvej stránke sa v pokračovacej neprejaví rovnako
        ako predtým, len na opačnom konci vlákna.
        """
        newest_first = list(reversed(self.comments))
        first = self.client.get(self.url, {"page_size": FE_PAGE_SIZE})
        cursor_url = first.data["next"]
        before = self._ids(self._follow(cursor_url))
        self.assertEqual(before, [c.id for c in newest_first[10:]])

        # Zmazanie na PRVEJ stránke (medzi najnovšími)...
        deleted = newest_first[6]
        deleted_id = deleted.id
        deleted.delete()

        # ...sa v odpovedi tej istej kurzorovej stránky nijako neprejaví.
        after = self._ids(self._follow(cursor_url))
        self.assertEqual(after, before)
        self.assertGreater(deleted_id, max(after))

    def test_window_request_covers_the_whole_thread_including_deletions(self):
        """Tvar dopytu, ktorý polling používa: bez kurzora, na celé okno."""
        # Poradie si zapamätaj PRED zmazaním – Django zmazanej inštancii pk
        # vynuluje.
        deleted_id = self.comments[6].id
        expected = [
            c.id for c in reversed(self.comments) if c.id != deleted_id
        ]
        self.comments[6].delete()

        response = self.client.get(self.url, {"page_size": 15 + FE_PAGE_SIZE})
        ids = self._ids(response)

        self.assertNotIn(deleted_id, ids)
        self.assertEqual(ids, expected)
        # Bez ďalšej stránky → odpoveď pokrýva celé vlákno, takže FE smie
        # čokoľvek chýbajúce považovať za zmazané.
        self.assertIsNone(response.data["next"])
        self.assertEqual(response.data["count"], 14)

    def test_page_size_is_capped_at_the_documented_maximum(self):
        """FE si strop zrkadlí; keby sa rozišli, odpoveď by nepokryla okno."""
        for index in range(15, 60):
            FeedPostComment.objects.create(
                post=self.post, author=self.author, text=f"K{index + 1}"
            )

        response = self.client.get(self.url, {"page_size": 500})

        self.assertEqual(len(response.data["results"]), FE_MAX_POLL_SIZE)
        # Orezanie sa navonok prejaví ako „je toho viac" – práve preto sa FE
        # pri rozhodovaní o zmazaných riadi `next`, nie dĺžkou odpovede.
        self.assertIsNotNone(response.data["next"])
