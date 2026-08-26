"""Úprava vlastného obsahu na nástenke – text príspevku a text komentára.

Ťažisko testov je na dvoch veciach, ktoré sa nedajú overiť len pohľadom na UI:

* ``is_edited`` sa NIKDY nedostane von pravdivo nikomu inému než autorovi –
  ani autorovi príspevku pri cudzom komentári, ani anonymovi, a to ani priamym
  čítaním API odpovede (filtruje sa pri serializácii, nie v appke),
* ``edited_at`` sa nastaví LEN pri skutočnej zmene textu.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import FeedPost, FeedPostComment, FeedPostImage

User = get_user_model()


def _user(name):
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password="StrongPass123",
        is_public=True,
    )


class FeedPostEditTests(APITestCase):
    def setUp(self):
        self.author = _user("edit-post-author")
        self.viewer = _user("edit-post-viewer")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Povodny text",
        )
        self.url = reverse("accounts:feed_post_detail", args=[self.post.id])

    def _patch(self, payload, user=None):
        if user is not None:
            self.client.force_authenticate(user=user)
        return self.client.patch(self.url, payload, format="json")

    def test_author_edits_own_post(self):
        response = self._patch({"caption": "Novy text"}, user=self.author)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["caption"], "Novy text")
        self.post.refresh_from_db()
        self.assertEqual(self.post.caption, "Novy text")
        self.assertIsNotNone(self.post.edited_at)

    def test_author_sees_is_edited_after_edit(self):
        self._patch({"caption": "Novy text"}, user=self.author)

        response = self.client.get(self.url)

        self.assertIs(response.data["is_edited"], True)

    def test_unedited_post_reports_false_to_its_author(self):
        self.client.force_authenticate(user=self.author)

        response = self.client.get(self.url)

        # Autor pole dostane vždy – len hovorí, že úprava zatiaľ nebola.
        self.assertIs(response.data["is_edited"], False)

    def test_is_edited_is_never_sent_to_another_viewer(self):
        self._patch({"caption": "Novy text"}, user=self.author)
        self.post.refresh_from_db()
        self.assertIsNotNone(self.post.edited_at)

        self.client.force_authenticate(user=self.viewer)
        response = self.client.get(self.url)

        # Kľúč v odpovedi VÔBEC nie je – cudzí divák sa o úprave nedozvie ani
        # priamou inšpekciou API, hoci `edited_at` v DB existuje.
        self.assertNotIn("is_edited", response.data)
        self.assertEqual(response.data["caption"], "Novy text")

    def test_is_edited_is_never_sent_to_anonymous(self):
        self._patch({"caption": "Novy text"}, user=self.author)
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertNotIn("is_edited", response.data)

    def test_is_edited_is_hidden_in_the_feed_list_too(self):
        self._patch({"caption": "Novy text"}, user=self.author)

        self.client.force_authenticate(user=self.viewer)
        response = self.client.get(reverse("accounts:feed_posts"))

        payload = next(
            item for item in response.data["results"] if item["id"] == self.post.id
        )
        # Zoznam je druhá cesta k tomu istému objektu – filter musí platiť aj tam.
        self.assertNotIn("is_edited", payload)

    def test_same_text_does_not_mark_the_post_as_edited(self):
        response = self._patch({"caption": "Povodny text"}, user=self.author)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.post.refresh_from_db()
        self.assertIsNone(self.post.edited_at)
        self.assertIs(response.data["is_edited"], False)

    def test_repeated_edit_keeps_the_first_timestamp_when_text_matches(self):
        self._patch({"caption": "Novy text"}, user=self.author)
        self.post.refresh_from_db()
        first = self.post.edited_at

        self._patch({"caption": "Novy text"}, user=self.author)

        self.post.refresh_from_db()
        self.assertEqual(self.post.edited_at, first)

    def test_stranger_cannot_edit_someone_elses_post(self):
        response = self._patch({"caption": "Cudzi zasah"}, user=self.viewer)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.post.refresh_from_db()
        self.assertEqual(self.post.caption, "Povodny text")

    def test_anonymous_cannot_edit(self):
        response = self.client.patch(
            self.url, {"caption": "Cudzi zasah"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invisible_post_is_not_found(self):
        hidden_author = _user("edit-post-hidden")
        hidden_author.is_public = False
        hidden_author.save(update_fields=["is_public"])
        hidden = FeedPost.objects.create(
            author=hidden_author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Skryty",
        )

        self.client.force_authenticate(user=self.viewer)
        response = self.client.patch(
            reverse("accounts:feed_post_detail", args=[hidden.id]),
            {"caption": "Zasah"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_empty_caption_without_photo_is_rejected(self):
        response = self._patch({"caption": "   "}, user=self.author)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "caption_required")
        self.post.refresh_from_db()
        self.assertEqual(self.post.caption, "Povodny text")
        self.assertIsNone(self.post.edited_at)

    def test_empty_caption_is_allowed_when_the_post_has_a_photo(self):
        FeedPostImage.objects.create(
            post=self.post,
            status=FeedPostImage.Status.APPROVED,
            approved_key="media/feed/1/large.webp",
        )

        response = self._patch({"caption": ""}, user=self.author)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.post.refresh_from_db()
        self.assertEqual(self.post.caption, "")
        self.assertIsNotNone(self.post.edited_at)

    def test_empty_caption_counts_a_photo_that_is_still_pending(self):
        # Fotka sa spracúva – príspevok ju MÁ, len ešte nie je schválená.
        # Klientovmu `will_attach_photo` sa tu neverí vôbec, pozerá sa stav DB.
        FeedPostImage.objects.create(
            post=self.post,
            status=FeedPostImage.Status.PENDING,
            pending_key="uploads/feed/1/1/x.jpg",
        )

        response = self._patch(
            {"caption": "", "will_attach_photo": False}, user=self.author
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_a_rejected_photo_does_not_allow_an_empty_caption(self):
        # Zamietnutá fotka sa nezobrazí nikomu, takže z príspevku bez textu
        # robí prázdny príspevok – rovnaké pravidlo ako pri odobratí fotky.
        FeedPostImage.objects.create(
            post=self.post,
            status=FeedPostImage.Status.REJECTED,
            rejected_reason="Nevhodny obsah",
        )

        response = self._patch({"caption": ""}, user=self.author)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "caption_required")

    def test_client_cannot_fake_a_photo_to_empty_the_caption(self):
        response = self._patch(
            {"caption": "", "will_attach_photo": True}, user=self.author
        )

        # Pri vytvorení sa zámeru verí (fotka ešte nemôže existovať), pri úprave
        # nie – tu sa dá skutočný stav overiť.
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "caption_required")

    def test_shared_post_may_have_an_empty_caption(self):
        source_author = _user("edit-post-source")
        source = FeedPost.objects.create(
            author=source_author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Original",
        )
        share = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.SHARED_FEED_POST,
            caption="Moj komentar k zdielaniu",
            shared_feed_post=source,
        )

        self.client.force_authenticate(user=self.author)
        response = self.client.patch(
            reverse("accounts:feed_post_detail", args=[share.id]),
            {"caption": ""},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        share.refresh_from_db()
        self.assertEqual(share.caption, "")

    def test_too_long_caption_is_rejected(self):
        response = self._patch({"caption": "a" * 501}, user=self.author)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.post.refresh_from_db()
        self.assertEqual(self.post.caption, "Povodny text")

    def test_photo_fields_in_the_payload_are_ignored(self):
        image = FeedPostImage.objects.create(
            post=self.post,
            status=FeedPostImage.Status.APPROVED,
            approved_key="media/feed/1/large.webp",
        )

        response = self._patch(
            {"caption": "Novy text", "images": [], "remove_image_ids": [image.id]},
            user=self.author,
        )

        # Tento endpoint fotky nerieši – pole sa nečíta, takže fotka ostáva.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(FeedPostImage.objects.filter(pk=image.id).exists())


class FeedCommentEditTests(APITestCase):
    def setUp(self):
        self.post_author = _user("edit-comment-post-author")
        self.commenter = _user("edit-comment-commenter")
        self.outsider = _user("edit-comment-outsider")
        self.post = FeedPost.objects.create(
            author=self.post_author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Prispevok",
        )
        self.comment = FeedPostComment.objects.create(
            post=self.post, author=self.commenter, text="Povodny komentar"
        )
        self.reply = FeedPostComment.objects.create(
            post=self.post,
            author=self.commenter,
            text="Povodna odpoved",
            parent_comment=self.comment,
        )
        self.list_url = reverse("accounts:feed_post_comments", args=[self.post.id])

    def _url(self, comment):
        return reverse(
            "accounts:feed_post_comment_detail", args=[self.post.id, comment.id]
        )

    def _patch(self, comment, payload, user=None):
        if user is not None:
            self.client.force_authenticate(user=user)
        return self.client.patch(self._url(comment), payload, format="json")

    def _from_list(self, comment_id, *, viewer):
        self.client.force_authenticate(user=viewer)
        response = self.client.get(self.list_url)
        for root in response.data["results"]:
            if root["id"] == comment_id:
                return root
            for reply in root.get("replies", []):
                if reply["id"] == comment_id:
                    return reply
        raise AssertionError(f"Komentar {comment_id} nie je v zozname.")

    def test_author_edits_own_comment(self):
        response = self._patch(
            self.comment, {"text": "Novy komentar"}, user=self.commenter
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["text"], "Novy komentar")
        self.assertIs(response.data["is_edited"], True)
        self.comment.refresh_from_db()
        self.assertEqual(self.comment.text, "Novy komentar")
        self.assertIsNotNone(self.comment.edited_at)

    def test_author_edits_own_reply(self):
        response = self._patch(
            self.reply, {"text": "Nova odpoved"}, user=self.commenter
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["text"], "Nova odpoved")
        self.reply.refresh_from_db()
        self.assertEqual(self.reply.text, "Nova odpoved")
        self.assertIsNotNone(self.reply.edited_at)
        # Úprava sa nedotýka väzby na rodiča.
        self.assertEqual(self.reply.parent_comment_id, self.comment.id)

    def test_post_author_cannot_edit_a_foreign_comment(self):
        response = self._patch(
            self.comment, {"text": "Prepisujem ta"}, user=self.post_author
        )

        # Zmazať by cudzí komentár na vlastnej nástenke smel, prepísať nie.
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.comment.refresh_from_db()
        self.assertEqual(self.comment.text, "Povodny komentar")

    def test_stranger_cannot_edit_a_foreign_comment(self):
        response = self._patch(
            self.comment, {"text": "Prepisujem ta"}, user=self.outsider
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_edit(self):
        response = self.client.patch(
            self._url(self.comment), {"text": "Zasah"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_is_edited_is_never_sent_to_the_post_author(self):
        self._patch(self.comment, {"text": "Novy komentar"}, user=self.commenter)
        self.comment.refresh_from_db()
        self.assertIsNotNone(self.comment.edited_at)

        payload = self._from_list(self.comment.id, viewer=self.post_author)

        # Ani vlastník nástenky sa o úprave cudzieho komentára nedozvie.
        self.assertNotIn("is_edited", payload)
        self.assertEqual(payload["text"], "Novy komentar")

    def test_is_edited_is_never_sent_to_another_viewer(self):
        self._patch(self.reply, {"text": "Nova odpoved"}, user=self.commenter)

        payload = self._from_list(self.reply.id, viewer=self.outsider)

        self.assertNotIn("is_edited", payload)

    def test_is_edited_is_never_sent_to_anonymous(self):
        self._patch(self.comment, {"text": "Novy komentar"}, user=self.commenter)

        payload = self._from_list(self.comment.id, viewer=None)

        self.assertNotIn("is_edited", payload)

    def test_author_sees_is_edited_in_the_list(self):
        self._patch(self.reply, {"text": "Nova odpoved"}, user=self.commenter)

        payload = self._from_list(self.reply.id, viewer=self.commenter)

        self.assertIs(payload["is_edited"], True)

    def test_can_edit_is_true_only_for_the_comment_author(self):
        mine = self._from_list(self.comment.id, viewer=self.commenter)
        theirs = self._from_list(self.comment.id, viewer=self.post_author)

        self.assertIs(mine["can_edit"], True)
        # Autor príspevku smie mazať, nie upravovať – FE to nesmie ponúknuť.
        self.assertIs(theirs["can_edit"], False)
        self.assertIs(theirs["can_delete"], True)

    def test_same_text_does_not_mark_the_comment_as_edited(self):
        response = self._patch(
            self.comment, {"text": "Povodny komentar"}, user=self.commenter
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.comment.refresh_from_db()
        self.assertIsNone(self.comment.edited_at)
        self.assertIs(response.data["is_edited"], False)

    def test_empty_text_is_rejected(self):
        response = self._patch(self.comment, {"text": "   "}, user=self.commenter)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "text_required")
        self.comment.refresh_from_db()
        self.assertEqual(self.comment.text, "Povodny komentar")

    def test_too_long_text_is_rejected(self):
        response = self._patch(
            self.comment, {"text": "a" * 501}, user=self.commenter
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.comment.refresh_from_db()
        self.assertEqual(self.comment.text, "Povodny komentar")

    def test_comment_of_another_post_is_not_found(self):
        other_post = FeedPost.objects.create(
            author=self.post_author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Iny prispevok",
        )

        self.client.force_authenticate(user=self.commenter)
        response = self.client.patch(
            reverse(
                "accounts:feed_post_comment_detail",
                args=[other_post.id, self.comment.id],
            ),
            {"text": "Zasah"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_edited_text_arrives_with_the_next_poll(self):
        # Polling ťahá ten istý zoznam a komentár si drží id, takže upravený
        # text dorazí bez akéhokoľvek zvláštneho mechanizmu.
        before = self._from_list(self.comment.id, viewer=self.outsider)
        self.assertEqual(before["text"], "Povodny komentar")

        self._patch(self.comment, {"text": "Upraveny komentar"}, user=self.commenter)

        after = self._from_list(self.comment.id, viewer=self.outsider)
        self.assertEqual(after["id"], before["id"])
        self.assertEqual(after["text"], "Upraveny komentar")

    def test_edit_response_keeps_the_reply_preview_bounded(self):
        # Úprava komentára nesmie stiahnuť celé vlákno odpovedí do odpovede –
        # platí ten istý strop ako v zozname (FEED_REPLIES_PREVIEW_LIMIT = 10).
        for index in range(12):
            FeedPostComment.objects.create(
                post=self.post,
                author=self.outsider,
                text=f"Odpoved {index}",
                parent_comment=self.comment,
            )

        response = self._patch(
            self.comment, {"text": "Upraveny komentar"}, user=self.commenter
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["replies"]), 10)
        # 12 nových + 1 z setUp
        self.assertEqual(response.data["replies_count"], 13)

    def test_edited_reply_arrives_with_the_next_poll(self):
        self._patch(self.reply, {"text": "Upravena odpoved"}, user=self.commenter)

        payload = self._from_list(self.reply.id, viewer=self.outsider)

        self.assertEqual(payload["text"], "Upravena odpoved")
