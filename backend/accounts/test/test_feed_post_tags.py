"""Feed – označovanie používateľov v príspevkoch (FeedPostTag)."""

from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeoutError
from threading import Event
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, close_old_connections, connection, transaction

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


@pytest.mark.django_db
class TestLockingOrder:
    """Deterministické overenie zámkov – beží aj na SQLite (na rozdiel od
    vláknových testov nižšie), takže chráni pred regresiou všade."""

    def test_locks_users_before_post(self):
        from django.db.models.query import QuerySet

        author, tagged = _user(1), _user(2)
        post = _post(author)

        order = []
        original_select_for_update = QuerySet.select_for_update

        def spy_select_for_update(self, *args, **kwargs):
            order.append(f"lock:{self.model.__name__}")
            return original_select_for_update(self, *args, **kwargs)

        with patch.object(QuerySet, "select_for_update", spy_select_for_update):
            apply_feed_post_tags(post, [tagged.id])

        # Overuje sa RELATÍVNE poradie, nie presný zoznam: podstatná vlastnosť je
        # User → FeedPost (opačné poradie by voči anonymize_user, ktorý zamyká
        # User a až potom obsah, vytvorilo inverziu = deadlock). Prípadné ďalšie
        # zámky navyše sú v poriadku a nesmú test zhodiť.
        assert "lock:User" in order
        assert "lock:FeedPost" in order
        assert order.index("lock:User") < order.index("lock:FeedPost")

    def test_is_active_is_read_after_user_lock(self):
        """NÁLEZ 1 deterministicky: deaktivácia „commitnutá" v momente zámku
        musí byť viditeľná, inak by vznikol tag na anonymizovaný účet."""
        author, tagged = _user(1), _user(2)
        post = _post(author)

        def deactivate_during_lock(*, user_ids):
            User.objects.filter(pk=tagged.pk).update(is_active=False)

        with patch(
            "accounts.services.user_blocks.lock_users_for_update",
            side_effect=deactivate_during_lock,
        ):
            created = apply_feed_post_tags(post, [tagged.id])

        # Keby sa is_active čítalo PRED zámkom, tag by tu vznikol.
        assert created == []
        assert post.tags.count() == 0

    def test_missing_post_is_handled(self):
        author, tagged = _user(1), _user(2)
        post = _post(author)
        FeedPost.objects.filter(pk=post.pk).delete()

        assert apply_feed_post_tags(post, [tagged.id]) == []


@pytest.mark.django_db(transaction=True)
class TestTaggingConcurrency:
    """Súbežnosť cez ThreadPoolExecutor + Event – rovnaký vzor ako
    ``test_skill_request_blocking.test_block_serializes_with_acceptance``.

    Vyžaduje riadkové zámky, takže na SQLite sa preskakuje (rovnako ako obidva
    existujúce race-condition testy v repozitári).
    """

    def _require_row_locks(self):
        if not connection.features.has_select_for_update:
            pytest.skip("The configured database does not support row-level locks.")

    def test_tagging_does_not_outlive_concurrent_anonymization(self):
        """NÁLEZ 1: tag sa nesmie vyrobiť na práve anonymizovaný účet."""
        self._require_row_locks()

        from accounts.account_deletion import anonymize_user

        author = _user(1)
        tagged = _user(2)
        post = _post(author)

        anonymize_lock_held = Event()
        release_anonymize = Event()

        from accounts import account_deletion as deletion_module

        original_scrub = deletion_module._scrub_actor_notifications

        def hold_anonymize_transaction(user):
            # Sme vnútri anonymizačnej transakcie, tesne po zamknutí User riadku.
            anonymize_lock_held.set()
            if not release_anonymize.wait(timeout=10):
                raise TimeoutError("Timed out waiting to release anonymize")
            return original_scrub(user)

        def anonymize():
            close_old_connections()
            try:
                return anonymize_user(User.objects.get(pk=tagged.pk))
            finally:
                close_old_connections()

        def tag():
            close_old_connections()
            try:
                return apply_feed_post_tags(
                    FeedPost.objects.get(pk=post.pk), [tagged.pk]
                )
            finally:
                close_old_connections()

        with (
            patch(
                "accounts.account_deletion._scrub_actor_notifications",
                side_effect=hold_anonymize_transaction,
            ),
            ThreadPoolExecutor(max_workers=2) as executor,
        ):
            anonymize_future = executor.submit(anonymize)
            assert anonymize_lock_held.wait(timeout=5)

            tag_future = executor.submit(tag)
            # Tagovanie musí čakať na zámok User riadku – nesmie prebehnúť teraz.
            with pytest.raises(FutureTimeoutError):
                tag_future.result(timeout=1)

            release_anonymize.set()
            anonymize_future.result(timeout=10)
            tag_future.result(timeout=10)

        # Jadro nálezu: po dobehnutí oboch nesmie ostať osirotený tag.
        assert not FeedPostTag.objects.filter(tagged_user_id=tagged.pk).exists()

    def test_concurrent_tagging_never_exceeds_limit(self):
        """NÁLEZ 2: dve súbežné volania tesne pri limite ho neprekročia."""
        self._require_row_locks()

        author = _user(1)
        post = _post(author)
        # Naplň príspevok na MAX-1, aby ostalo miesto presne pre JEDEN tag.
        filler = [_user(10 + i) for i in range(MAX_FEED_POST_TAGS - 1)]
        apply_feed_post_tags(post, [u.id for u in filler])
        assert post.tags.count() == MAX_FEED_POST_TAGS - 1

        first_candidate = _user(50)
        second_candidate = _user(51)

        first_locked = Event()
        release_first = Event()

        def hold_first(*args, **kwargs):
            first_locked.set()
            if not release_first.wait(timeout=10):
                raise TimeoutError("Timed out waiting to release first tagging")
            return None  # žiadne blokovanie

        # POZOR na patch nižšie: patch() prepisuje atribút modulu, takže platí
        # pre CELÝ proces – teda aj pre druhé vlákno, hoci ho spúšťame s
        # hold=False. Test to napriek tomu nezablokuje: druhé vlákno uviazne
        # už skôr, na zámku príspevku vnútri apply_feed_post_tags (prvé vlákno
        # ho drží, kým čaká v hold_first), a k feed_post_tag_block_reason sa
        # dostane až potom, čo release_first.set() prvé vlákno pustí ďalej.
        # V tej chvíli je release_first už nastavený, takže hold_first vráti
        # hodnotu okamžite a nečaká sa druhýkrát.
        def tag_with(user_id, hold):
            close_old_connections()
            try:
                target = FeedPost.objects.get(pk=post.pk)
                if hold:
                    with patch(
                        "accounts.services.feed_tagging.feed_post_tag_block_reason",
                        side_effect=hold_first,
                    ):
                        return apply_feed_post_tags(target, [user_id])
                return apply_feed_post_tags(target, [user_id])
            finally:
                close_old_connections()

        results = []
        with ThreadPoolExecutor(max_workers=2) as executor:
            first_future = executor.submit(tag_with, first_candidate.pk, True)
            assert first_locked.wait(timeout=5)

            # Druhé volanie musí čakať na zámok príspevku, nie čítať staré počty.
            second_future = executor.submit(tag_with, second_candidate.pk, False)
            with pytest.raises(FutureTimeoutError):
                second_future.result(timeout=1)

            release_first.set()
            for future in (first_future, second_future):
                try:
                    results.append(future.result(timeout=10))
                except ValidationError as exc:
                    results.append(exc)

        post.refresh_from_db()
        # Jedno volanie uspeje, druhé narazí na limit – nikdy nie 11 tagov.
        assert post.tags.count() == MAX_FEED_POST_TAGS
        assert sum(isinstance(r, ValidationError) for r in results) == 1
