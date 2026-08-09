"""Feed Fáza 1 – testy modelov (FeedPost, Like, Comment, Report)."""

import pytest
from django.core.exceptions import ValidationError
from django.db import DataError, IntegrityError, transaction
from django.contrib.auth import get_user_model

from accounts.models import (
    FeedPostImage,
    FeedPost,
    FeedPostComment,
    FeedPostLike,
    FeedPostReport,
    OfferedSkill,
    UserBlock,
)
from accounts.services.feed_share_visibility import (
    REASON_BLOCKED,
    REASON_HIDDEN,
    REASON_PRIVATE_OWNER,
)
from portfolio.models import PortfolioItem

User = get_user_model()


def _user(n):
    return User.objects.create_user(f"feed-u{n}", f"feed-u{n}@e.com", "StrongPass123")


def _offer(user, subcategory="Programovanie"):
    return OfferedSkill.objects.create(
        user=user,
        category="it-a-technologie",
        subcategory=subcategory,
    )


def _portfolio_item(owner, title="Moje dielo"):
    return PortfolioItem.objects.create(
        owner=owner,
        title=title,
        category="it-a-technologie",
    )


def _free_post(author, caption="Ahoj feed!"):
    return FeedPost.objects.create(
        author=author,
        post_type=FeedPost.PostType.FREE_POST,
        caption=caption,
    )


@pytest.mark.django_db
class TestFeedPostModel:
    def test_free_post_requires_caption(self):
        u = _user(1)
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                FeedPost.objects.create(
                    author=u,
                    post_type=FeedPost.PostType.FREE_POST,
                    caption="",
                )

    def test_shared_offer_snapshot_survives_offer_deletion(self):
        u = _user(1)
        offer = _offer(u)
        post = FeedPost.objects.create(
            author=u,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        # Snapshot naplnený pri vzniku (save() denormalizácia).
        assert post.shared_title == "Programovanie"
        assert post.shared_category == "it-a-technologie"

        offer.delete()
        post.refresh_from_db()

        # Príspevok prežil, FK je None, snapshot zostáva.
        assert post.shared_offer is None
        assert post.shared_title == "Programovanie"
        assert post.shared_category == "it-a-technologie"

    def test_shared_portfolio_item_snapshot_survives_deletion(self):
        u = _user(1)
        item = _portfolio_item(u, title="Weby na mieru")
        post = FeedPost.objects.create(
            author=u,
            post_type=FeedPost.PostType.SHARED_PORTFOLIO_ITEM,
            shared_portfolio_item=item,
        )
        assert post.shared_title == "Weby na mieru"

        item.delete()
        post.refresh_from_db()

        assert post.shared_portfolio_item is None
        assert post.shared_title == "Weby na mieru"

    def test_shared_post_cannot_carry_photo(self):
        """Fotka je len pre FREE_POST.

        Od Fázy 4.4 to nedrží DB constraint (počet riadkov v child tabuľke sa
        ním vyjadriť nedá), ale ``FeedPostImage.save()`` – vzor FeedPostTag.
        """
        u = _user(1)
        offer = _offer(u)
        shared = FeedPost.objects.create(
            author=u,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        with pytest.raises(ValidationError):
            FeedPostImage.objects.create(post=shared)

        assert shared.images.count() == 0

    def test_free_post_with_photos_is_valid(self):
        u = _user(1)
        post = FeedPost.objects.create(
            author=u,
            post_type=FeedPost.PostType.FREE_POST,
            caption="S fotkami",
        )
        for index in range(3):
            FeedPostImage.objects.create(
                post=post,
                order=index,
                status=FeedPostImage.Status.PENDING,
                pending_key=f"uploads/feed/{post.id}/{index}/abc.jpg",
            )

        # Poradie drží Meta.ordering, nie poradie vzniku.
        assert [image.order for image in post.images.all()] == [0, 1, 2]


@pytest.mark.django_db
class TestSharingForeignContent:
    """Zdieľať možno KTORÝKOĽVEK verejne viditeľný obsah, nie len vlastný.

    Overuje sa viditeľnosť cieľa (skrytosť / súkromný profil vlastníka /
    blokovanie), nie vlastníctvo.
    """

    def test_can_share_foreign_public_offer(self):
        owner, other = _user(1), _user(2)
        offer = _offer(owner)

        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )

        assert post.pk is not None
        assert post.author_id == other.id
        assert post.shared_owner_id == owner.id  # autor != vlastník
        assert post.shared_title == "Programovanie"

    def test_can_share_foreign_public_portfolio_item(self):
        owner, other = _user(1), _user(2)
        item = _portfolio_item(owner, title="Weby na mieru")

        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_PORTFOLIO_ITEM,
            shared_portfolio_item=item,
        )

        assert post.shared_owner_id == owner.id
        assert post.shared_title == "Weby na mieru"

    def test_cannot_share_hidden_offer(self):
        owner, other = _user(1), _user(2)
        offer = _offer(owner)
        offer.is_hidden = True
        offer.save(update_fields=["is_hidden"])

        with pytest.raises(ValidationError) as exc:
            FeedPost.objects.create(
                author=other,
                post_type=FeedPost.PostType.SHARED_OFFER,
                shared_offer=offer,
            )
        assert exc.value.code == REASON_HIDDEN

    def test_cannot_share_offer_of_private_profile(self):
        owner, other = _user(1), _user(2)
        owner.is_public = False
        owner.save(update_fields=["is_public"])
        offer = _offer(owner)

        with pytest.raises(ValidationError) as exc:
            FeedPost.objects.create(
                author=other,
                post_type=FeedPost.PostType.SHARED_OFFER,
                shared_offer=offer,
            )
        assert exc.value.code == REASON_PRIVATE_OWNER

    def test_cannot_share_portfolio_item_of_private_profile(self):
        owner, other = _user(1), _user(2)
        owner.is_public = False
        owner.save(update_fields=["is_public"])
        item = _portfolio_item(owner)

        with pytest.raises(ValidationError) as exc:
            FeedPost.objects.create(
                author=other,
                post_type=FeedPost.PostType.SHARED_PORTFOLIO_ITEM,
                shared_portfolio_item=item,
            )
        assert exc.value.code == REASON_PRIVATE_OWNER

    @pytest.mark.parametrize("author_blocks_owner", [True, False])
    def test_cannot_share_when_blocked_in_either_direction(self, author_blocks_owner):
        owner, other = _user(1), _user(2)
        offer = _offer(owner)
        if author_blocks_owner:
            UserBlock.objects.create(blocker=other, blocked_user=owner)
        else:
            UserBlock.objects.create(blocker=owner, blocked_user=other)

        with pytest.raises(ValidationError) as exc:
            FeedPost.objects.create(
                author=other,
                post_type=FeedPost.PostType.SHARED_OFFER,
                shared_offer=offer,
            )
        assert exc.value.code == REASON_BLOCKED

    def test_owner_can_share_own_hidden_offer(self):
        # Vlastník vidí svoje aj skryté položky – rovnaká výnimka ako
        # offer_hidden_from_user, takže zdieľanie vlastného obsahu nesmie padnúť.
        owner = _user(1)
        offer = _offer(owner)
        offer.is_hidden = True
        offer.save(update_fields=["is_hidden"])

        post = FeedPost.objects.create(
            author=owner,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        assert post.shared_owner_id == owner.id

    def test_owner_with_private_profile_can_share_own_offer(self):
        owner = _user(1)
        owner.is_public = False
        owner.save(update_fields=["is_public"])
        offer = _offer(owner)

        post = FeedPost.objects.create(
            author=owner,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        assert post.shared_owner_id == owner.id


@pytest.mark.django_db
class TestSharedSourceIntegrity:
    """Zdroj zdieľania musí pri vzniku reálne existovať a pri zmene sa prevaliduje."""

    def test_shared_offer_post_requires_source_fk(self):
        # Bez tejto kontroly by prešiel "falošný" zdieľací príspevok so
        # snapshotom, ale bez zdroja – nerozoznateľný od osireného zdieľania,
        # a s úplne obídenou kontrolou blokovania/viditeľnosti.
        with pytest.raises(ValidationError) as exc:
            FeedPost.objects.create(
                author=_user(1),
                post_type=FeedPost.PostType.SHARED_OFFER,
                shared_title="Vymyslená ponuka",
            )
        assert exc.value.code == "shared_source_required"

    def test_shared_portfolio_post_requires_source_fk(self):
        with pytest.raises(ValidationError) as exc:
            FeedPost.objects.create(
                author=_user(1),
                post_type=FeedPost.PostType.SHARED_PORTFOLIO_ITEM,
                shared_title="Vymyslené dielo",
            )
        assert exc.value.code == "shared_source_required"

    def test_validation_runs_with_force_insert_and_preset_pk(self):
        # _state.adding (nie pk is None) – s prideleným id by sa inak preskočila.
        with pytest.raises(ValidationError):
            FeedPost(
                id=987654,
                author=_user(1),
                post_type=FeedPost.PostType.SHARED_OFFER,
                shared_title="Vymyslená ponuka",
            ).save(force_insert=True)

    def test_swapping_source_to_blocked_offer_is_rejected(self):
        owner, other = _user(1), _user(2)
        allowed_offer = _offer(other, subcategory="Vlastná")
        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=allowed_offer,
        )

        blocked_offer = _offer(owner)
        UserBlock.objects.create(blocker=owner, blocked_user=other)

        post.shared_offer = blocked_offer
        with pytest.raises(ValidationError) as exc:
            post.save(update_fields=["shared_offer", "updated_at"])
        assert exc.value.code == REASON_BLOCKED

    def test_swapping_source_reassigns_shared_owner(self):
        first, second, author = _user(1), _user(2), _user(3)
        post = FeedPost.objects.create(
            author=author,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=_offer(first),
        )
        assert post.shared_owner_id == first.id

        post.shared_offer = _offer(second, subcategory="Grafika")
        post.save(update_fields=["shared_offer", "updated_at"])

        # refresh_from_db je tu podstatné: bez neho by test prešiel, aj keby sa
        # prepísaný snapshot nikdy nedostal do DB (update_fields ho vynechá).
        post.refresh_from_db()

        # Zastaraný vlastník by znamenal, že sa blok/súkromie vyhodnocuje voči
        # nesprávnemu používateľovi.
        assert post.shared_owner_id == second.id
        # Aj odvodený snapshot musí sledovať nový zdroj, nie ostať po starom.
        assert post.shared_title == "Grafika"
        assert post.shared_owner_display_name == second.display_name

    def test_orphaning_source_is_not_revalidated(self):
        # SET_NULL osirenie po zmazaní originálu musí ostať povolené.
        owner, other = _user(1), _user(2)
        offer = _offer(owner)
        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        UserBlock.objects.create(blocker=owner, blocked_user=other)

        offer.delete()
        post.refresh_from_db()
        assert post.shared_offer_id is None


@pytest.mark.django_db
class TestTextLengthLimits:
    """500-znakový limit musí vynútiť DB, nielen form/serializer vrstva."""

    def test_caption_over_limit_is_rejected(self):
        with pytest.raises((DataError, ValidationError, IntegrityError)):
            with transaction.atomic():
                FeedPost.objects.create(
                    author=_user(1),
                    post_type=FeedPost.PostType.FREE_POST,
                    caption="x" * 501,
                )

    def test_caption_at_limit_is_accepted(self):
        post = FeedPost.objects.create(
            author=_user(1),
            post_type=FeedPost.PostType.FREE_POST,
            caption="x" * 500,
        )
        assert len(post.caption) == 500

    def test_comment_text_over_limit_is_rejected(self):
        post = _free_post(_user(1))
        with pytest.raises((DataError, ValidationError, IntegrityError)):
            with transaction.atomic():
                FeedPostComment.objects.create(
                    post=post, author=_user(2), text="x" * 501
                )


@pytest.mark.django_db
class TestSharedOwnerDisplayName:
    """Snapshot mena pôvodného vlastníka – nezávislý od toho, či autor == vlastník."""

    def test_display_name_snapshot_for_foreign_content(self):
        owner, other = _user(1), _user(2)
        owner.first_name = "Jana"
        owner.last_name = "Nováková"
        owner.save(update_fields=["first_name", "last_name"])
        offer = _offer(owner)

        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )

        assert post.shared_owner_display_name == owner.display_name
        assert post.shared_owner_display_name == "Jana Nováková"

    def test_display_name_snapshot_for_own_content(self):
        owner = _user(1)
        owner.first_name = "Peter"
        owner.last_name = "Malý"
        owner.save(update_fields=["first_name", "last_name"])
        item = _portfolio_item(owner)

        post = FeedPost.objects.create(
            author=owner,
            post_type=FeedPost.PostType.SHARED_PORTFOLIO_ITEM,
            shared_portfolio_item=item,
        )

        assert post.shared_owner_display_name == "Peter Malý"
        assert post.shared_owner_id == owner.id

    def test_owner_fk_and_name_survive_offer_deletion(self):
        owner, other = _user(1), _user(2)
        owner.first_name = "Jana"
        owner.last_name = "Nováková"
        owner.save(update_fields=["first_name", "last_name"])
        offer = _offer(owner)
        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )

        offer.delete()
        post.refresh_from_db()

        # Osirelý príspevok si drží identitu vlastníka – Fáza 2 na nej vie ďalej
        # vynútiť blokovanie/súkromný profil (vzor review_hidden_from_user).
        assert post.shared_offer is None
        assert post.shared_owner_id == owner.id
        assert post.shared_owner_display_name == "Jana Nováková"

    def test_gdpr_anonymization_scrubs_name_in_foreign_post(self):
        """Meno anonymizovaného vlastníka nesmie prežiť v CUDZOM príspevku."""
        from accounts.account_deletion import anonymize_user

        owner, other = _user(1), _user(2)
        owner.first_name = "Jana"
        owner.last_name = "Nováková"
        owner.save(update_fields=["first_name", "last_name"])
        offer = _offer(owner)
        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )

        anonymize_user(owner)
        post.refresh_from_db()

        # Príspevok patrí inému autorovi, takže sa nemaže – ale meno musí zmiznúť.
        assert FeedPost.objects.filter(id=post.id).exists()
        assert post.shared_owner_display_name == "Zmazaný používateľ"
        assert "Nováková" not in post.shared_owner_display_name
        # Vlastníkova ponuka zanikla s jeho účtom → snapshot ostáva, FK je NULL.
        assert post.shared_offer is None


@pytest.mark.django_db
class TestSharedContentCurrentVisibility:
    """ZMENA 3 – rozlíšenie zmazané / skryté / viditeľné pre Fázu 2."""

    def test_visible_while_source_is_public(self):
        owner, other = _user(1), _user(2)
        offer = _offer(owner)
        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        assert post.is_shared_content_currently_visible is True

    def test_not_visible_when_source_hidden_after_sharing(self):
        owner, other = _user(1), _user(2)
        offer = _offer(owner)
        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )

        offer.is_hidden = True
        offer.save(update_fields=["is_hidden"])
        post.refresh_from_db()

        # FK STÁLE existuje (nezmazané), ale obsah je momentálne nedostupný.
        assert post.shared_offer_id is not None
        assert post.is_shared_content_currently_visible is False

    def test_not_visible_when_owner_goes_private_after_sharing(self):
        owner, other = _user(1), _user(2)
        offer = _offer(owner)
        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )

        owner.is_public = False
        owner.save(update_fields=["is_public"])
        post.refresh_from_db()

        assert post.shared_offer_id is not None
        assert post.is_shared_content_currently_visible is False

    def test_not_visible_when_source_deleted(self):
        owner, other = _user(1), _user(2)
        offer = _offer(owner)
        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )

        offer.delete()
        post.refresh_from_db()

        # Zmazané (FK None) sa od skrytého (FK != None) odlíši cez shared_offer_id.
        assert post.shared_offer_id is None
        assert post.is_shared_content_currently_visible is False

    def test_portfolio_item_visibility_follows_owner(self):
        owner, other = _user(1), _user(2)
        item = _portfolio_item(owner)
        post = FeedPost.objects.create(
            author=other,
            post_type=FeedPost.PostType.SHARED_PORTFOLIO_ITEM,
            shared_portfolio_item=item,
        )
        assert post.is_shared_content_currently_visible is True

        owner.is_public = False
        owner.save(update_fields=["is_public"])
        post.refresh_from_db()
        assert post.is_shared_content_currently_visible is False

    def test_free_post_has_nothing_shared_to_hide(self):
        post = _free_post(_user(1))
        assert post.is_shared_content_currently_visible is True


@pytest.mark.django_db
class TestFeedPostLike:
    def test_unique_like_per_user(self):
        u1, u2 = _user(1), _user(2)
        post = _free_post(u1)
        FeedPostLike.objects.create(post=post, user=u2)
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                FeedPostLike.objects.create(post=post, user=u2)

    def test_self_like_is_allowed(self):
        # Rovnaké rozhodnutie ako PortfolioItemLike (obsah, nie identita):
        # self-like guard má len ProfileLike.
        u = _user(1)
        post = _free_post(u)
        like = FeedPostLike.objects.create(post=post, user=u)
        assert like.pk is not None

    def test_likes_cascade_with_post(self):
        u1, u2 = _user(1), _user(2)
        post = _free_post(u1)
        FeedPostLike.objects.create(post=post, user=u2)
        post.delete()
        assert FeedPostLike.objects.count() == 0


@pytest.mark.django_db
class TestFeedPostComment:
    def test_comment_creation_and_cascade(self):
        u1, u2 = _user(1), _user(2)
        post = _free_post(u1)
        FeedPostComment.objects.create(post=post, author=u2, text="Super!")
        assert post.comments.count() == 1
        post.delete()
        assert FeedPostComment.objects.count() == 0


@pytest.mark.django_db
class TestFeedPostReport:
    def test_unique_report_per_user(self):
        u1, u2 = _user(1), _user(2)
        post = _free_post(u1)
        FeedPostReport.objects.create(post=post, reported_by=u2, reason="spam")
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                FeedPostReport.objects.create(
                    post=post, reported_by=u2, reason="spam znova"
                )

    def test_default_unresolved(self):
        u1, u2 = _user(1), _user(2)
        post = _free_post(u1)
        report = FeedPostReport.objects.create(
            post=post, reported_by=u2, reason="spam"
        )
        assert report.is_resolved is False


@pytest.mark.django_db
class TestFeedAccountDeletion:
    """GDPR zmazanie účtu – feed obsah podľa konvencie autorského obsahu.

    Konvencia (viď account_deletion._delete_owned_content): User riadok sa
    NEmaže (anonymizuje), takže CASCADE nevystrelí – autorský obsah sa
    hard-deletuje explicitne (ako Review.reviewer/ponuky/portfólio). Nahlásenia
    podané používateľom sa ponechávajú (moderačný audit, ako ReviewReport).
    """

    def test_feed_content_purged_on_account_deletion(self):
        from accounts.account_deletion import anonymize_user

        author, other = _user(1), _user(2)
        own_post = _free_post(author)
        other_post = _free_post(other, caption="Cudzí post")

        # Autorov obsah + interakcie pod cudzím obsahom.
        FeedPostComment.objects.create(post=other_post, author=author, text="Môj koment")
        FeedPostLike.objects.create(post=other_post, user=author)
        # Interakcie iných NA autorovom poste (zaniknú s postom cez CASCADE).
        FeedPostComment.objects.create(post=own_post, author=other, text="Reakcia")
        FeedPostLike.objects.create(post=own_post, user=other)
        FeedPostReport.objects.create(post=own_post, reported_by=other, reason="spam")
        # Nahlásenie, ktoré autor podal na cudzí post → PONECHAŤ (audit).
        kept_report = FeedPostReport.objects.create(
            post=other_post, reported_by=author, reason="spam"
        )

        anonymize_user(author)

        # Autorove posty + jeho komenty/lajky preč; cudzí post žije.
        assert not FeedPost.objects.filter(id=own_post.id).exists()
        assert FeedPost.objects.filter(id=other_post.id).exists()
        assert not FeedPostComment.objects.filter(author=author).exists()
        assert not FeedPostLike.objects.filter(user=author).exists()
        # Interakcie na zmazanom poste zanikli cez CASCADE.
        assert not FeedPostComment.objects.filter(post_id=own_post.id).exists()
        assert not FeedPostLike.objects.filter(post_id=own_post.id).exists()
        assert not FeedPostReport.objects.filter(post_id=own_post.id).exists()
        # Moderačný audit zostáva.
        assert FeedPostReport.objects.filter(id=kept_report.id).exists()
