"""Feed – označovanie používateľov v príspevkoch (FeedPostTag)."""

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from accounts.models import FeedPost, FeedPostTag, UserBlock
from accounts.services.feed_tagging import (
    MAX_FEED_POST_TAGS,
    REASON_TAG_BLOCKED,
    REASON_TAG_LIMIT,
    apply_feed_post_tags,
)

User = get_user_model()


def _user(n):
    return User.objects.create_user(f"tag-u{n}", f"tag-u{n}@e.com", "StrongPass123")


def _post(author, caption="Ahoj feed!"):
    return FeedPost.objects.create(
        author=author,
        post_type=FeedPost.PostType.FREE_POST,
        caption=caption,
    )


@pytest.mark.django_db
class TestTaggingRules:
    def test_tagging_unblocked_user_succeeds(self):
        author, tagged = _user(1), _user(2)
        post = _post(author)

        created = apply_feed_post_tags(post, [tagged.id])

        assert len(created) == 1
        assert post.tags.count() == 1
        assert post.tags.first().tagged_user_id == tagged.id

    @pytest.mark.parametrize("author_blocks", [True, False])
    def test_tagging_blocked_user_is_rejected_in_both_directions(self, author_blocks):
        author, tagged = _user(1), _user(2)
        post = _post(author)
        if author_blocks:
            UserBlock.objects.create(blocker=author, blocked_user=tagged)
        else:
            UserBlock.objects.create(blocker=tagged, blocked_user=author)

        with pytest.raises(ValidationError) as exc:
            apply_feed_post_tags(post, [tagged.id])

        assert exc.value.code == REASON_TAG_BLOCKED
        assert post.tags.count() == 0

    def test_block_is_enforced_on_direct_orm_write(self):
        # Poistka na modeli – priamy zápis obchádzajúci službu musí tiež padnúť.
        author, tagged = _user(1), _user(2)
        post = _post(author)
        UserBlock.objects.create(blocker=author, blocked_user=tagged)

        with pytest.raises(ValidationError):
            FeedPostTag.objects.create(post=post, tagged_user=tagged)

    def test_blocked_user_does_not_leave_partial_tags(self):
        # Blokovaný je v zozname druhý – prvý tag sa nesmie uložiť.
        author, ok_user, blocked = _user(1), _user(2), _user(3)
        post = _post(author)
        UserBlock.objects.create(blocker=blocked, blocked_user=author)

        with pytest.raises(ValidationError):
            apply_feed_post_tags(post, [ok_user.id, blocked.id])

        assert post.tags.count() == 0

    def test_duplicate_tag_creates_no_second_row(self):
        author, tagged = _user(1), _user(2)
        post = _post(author)

        apply_feed_post_tags(post, [tagged.id])
        created_again = apply_feed_post_tags(post, [tagged.id])

        assert created_again == []
        assert post.tags.count() == 1

    def test_duplicate_tag_is_blocked_by_db_constraint(self):
        author, tagged = _user(1), _user(2)
        post = _post(author)
        FeedPostTag.objects.create(post=post, tagged_user=tagged)

        with pytest.raises(IntegrityError):
            with transaction.atomic():
                FeedPostTag.objects.create(post=post, tagged_user=tagged)

    def test_duplicate_ids_in_one_request_create_single_tag(self):
        author, tagged = _user(1), _user(2)
        post = _post(author)

        created = apply_feed_post_tags(post, [tagged.id, tagged.id, tagged.id])

        assert len(created) == 1
        assert post.tags.count() == 1

    def test_author_can_tag_themselves(self):
        author = _user(1)
        post = _post(author)

        created = apply_feed_post_tags(post, [author.id])

        assert len(created) == 1


@pytest.mark.django_db
class TestInvalidTargetsAreSkipped:
    def test_nonexistent_id_is_skipped_without_error(self):
        author, tagged = _user(1), _user(2)
        post = _post(author)

        created = apply_feed_post_tags(post, [tagged.id, 99_999_999])

        # Jedno zastarané ID nesmie zhodiť celé vytvorenie príspevku.
        assert len(created) == 1
        assert post.tags.first().tagged_user_id == tagged.id

    def test_inactive_user_is_skipped_without_error(self):
        author, tagged, inactive = _user(1), _user(2), _user(3)
        inactive.is_active = False
        inactive.save(update_fields=["is_active"])
        post = _post(author)

        created = apply_feed_post_tags(post, [tagged.id, inactive.id])

        assert len(created) == 1
        assert post.tags.first().tagged_user_id == tagged.id

    def test_garbage_input_is_ignored(self):
        author = _user(1)
        post = _post(author)

        assert apply_feed_post_tags(post, [None, "abc", 0, -5]) == []
        assert apply_feed_post_tags(post, []) == []


@pytest.mark.django_db
class TestTagLimit:
    def _users(self, count, start=10):
        return [_user(start + i) for i in range(count)]

    def test_limit_boundary_is_accepted(self):
        author = _user(1)
        post = _post(author)
        targets = self._users(MAX_FEED_POST_TAGS)

        created = apply_feed_post_tags(post, [u.id for u in targets])

        assert len(created) == MAX_FEED_POST_TAGS
        assert post.tags.count() == MAX_FEED_POST_TAGS

    def test_exceeding_limit_is_rejected(self):
        author = _user(1)
        post = _post(author)
        targets = self._users(MAX_FEED_POST_TAGS + 1)

        with pytest.raises(ValidationError) as exc:
            apply_feed_post_tags(post, [u.id for u in targets])

        assert exc.value.code == REASON_TAG_LIMIT
        assert post.tags.count() == 0

    def test_limit_counts_existing_tags_not_just_batch(self):
        # Dve dávky pod limitom, spolu nad ním – limit platí na príspevok.
        author = _user(1)
        post = _post(author)
        targets = self._users(MAX_FEED_POST_TAGS + 1)

        apply_feed_post_tags(post, [u.id for u in targets[:MAX_FEED_POST_TAGS]])
        with pytest.raises(ValidationError) as exc:
            apply_feed_post_tags(post, [targets[-1].id])

        assert exc.value.code == REASON_TAG_LIMIT
        assert post.tags.count() == MAX_FEED_POST_TAGS


@pytest.mark.django_db
class TestTaggedPostsQuery:
    def test_posts_where_i_am_tagged_are_ordered_by_created_at(self):
        author, tagged, other = _user(1), _user(2), _user(3)
        first = _post(author, caption="Prvý")
        second = _post(author, caption="Druhý")
        unrelated = _post(author, caption="Bez označenia")
        apply_feed_post_tags(first, [tagged.id])
        apply_feed_post_tags(second, [tagged.id, other.id])

        tagged_posts = list(
            FeedPost.objects.filter(tags__tagged_user=tagged).order_by(
                "-tags__created_at"
            )
        )

        assert tagged_posts == [second, first]
        assert unrelated not in tagged_posts

    def test_related_names_resolve_both_directions(self):
        author, tagged = _user(1), _user(2)
        post = _post(author)
        apply_feed_post_tags(post, [tagged.id])

        assert post.tags.count() == 1
        assert tagged.feed_post_tags.count() == 1
        assert tagged.feed_post_tags.first().post_id == post.id


@pytest.mark.django_db
class TestTagsAndAccountDeletion:
    def test_tag_disappears_when_tagged_user_is_anonymized(self):
        from accounts.account_deletion import anonymize_user

        author, tagged = _user(1), _user(2)
        post = _post(author)
        apply_feed_post_tags(post, [tagged.id])

        anonymize_user(tagged)

        # Príspevok patrí niekomu inému – ostáva, len označenie zmizne.
        assert FeedPost.objects.filter(id=post.id).exists()
        assert FeedPostTag.objects.filter(post=post).count() == 0

    def test_tags_on_authors_posts_die_with_the_post(self):
        from accounts.account_deletion import anonymize_user

        author, tagged = _user(1), _user(2)
        post = _post(author)
        apply_feed_post_tags(post, [tagged.id])

        anonymize_user(author)

        assert not FeedPost.objects.filter(id=post.id).exists()
        assert FeedPostTag.objects.filter(post_id=post.id).count() == 0

    def test_tag_cascades_when_post_is_deleted(self):
        author, tagged = _user(1), _user(2)
        post = _post(author)
        apply_feed_post_tags(post, [tagged.id])

        post.delete()

        assert FeedPostTag.objects.count() == 0
