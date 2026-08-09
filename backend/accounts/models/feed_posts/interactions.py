"""Interakcie s príspevkom – lajky, komentáre a označenia používateľov.

FeedPostLike: dedikovaná tabuľka podľa ``PortfolioItemLike`` (unique + 2 indexy).
Self-like je povolený – rovnaké rozhodnutie ako pri portfóliu (obsah, nie
identita; self-like guard má len ProfileLike).

FeedPostTag: označenie používateľa v príspevku. Zobrazenie je okamžité (žiadne
schvaľovanie označeným); jediná tvrdá prekážka je blokovanie – pravidlá sú
v ``accounts.services.feed_tagging``.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from accounts.services.feed_tagging import (
    TAG_REASON_MESSAGES,
    feed_post_tag_block_reason,
)

from .post import FeedPost
from .text_limits import ensure_text_within_limit


class FeedPostLike(models.Model):
    """Like príspevku – presne podľa vzoru PortfolioItemLike."""

    post = models.ForeignKey(
        FeedPost,
        on_delete=models.CASCADE,
        related_name="likes",
        verbose_name=_("Príspevok"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feed_post_likes",
        verbose_name=_("Používateľ"),
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Páči sa mi príspevok")
        verbose_name_plural = _("Páči sa mi príspevky")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["post", "user"],
                name="unique_feed_post_like_per_user",
            )
        ]
        indexes = [
            models.Index(
                fields=["post", "created_at"],
                name="acc_fplike_post_cr_idx",
            ),
            models.Index(
                fields=["user", "created_at"],
                name="acc_fplike_user_cr_idx",
            ),
        ]

    def __str__(self):
        return f"Like príspevku #{self.post_id} od používateľa {self.user_id}"


class FeedPostComment(models.Model):
    """Komentár k príspevku (prvý komentárový model v appke).

    author = CASCADE rovnako ako FeedPost.author/Review.reviewer – autorov
    obsah sa pri GDPR zmazaní účtu hard-deletuje cez purge_user_content
    (User riadok sa nemaže, len anonymizuje, takže CASCADE sám nevystrelí).
    """

    post = models.ForeignKey(
        FeedPost,
        on_delete=models.CASCADE,
        related_name="comments",
        verbose_name=_("Príspevok"),
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feed_post_comments",
        verbose_name=_("Autor"),
    )
    # CharField z rovnakého dôvodu ako FeedPost.caption – TextField by limit nevynútil.
    text = models.CharField(_("Text"), max_length=500)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Komentár k príspevku")
        verbose_name_plural = _("Komentáre k príspevkom")
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(
                fields=["post", "created_at"],
                name="acc_fpcomm_post_cr_idx",
            ),
        ]

    def __str__(self):
        return f"Komentár #{self.id} k príspevku #{self.post_id}"

    def save(self, *args, **kwargs):
        ensure_text_within_limit(self.text, field_label="Komentár")
        super().save(*args, **kwargs)


class FeedPostCommentLike(models.Model):
    """Like komentára – šiesty Like model, rovnaká šablóna ako FeedPostLike.

    Self-like povolený: rovnaké rozhodnutie ako pri FeedPostLike/PortfolioItemLike
    (komentár je obsah, nie identita – self-like guard má len ProfileLike).

    Väzba ide na komentár, nie na príspevok: komentár už príspevok pozná a
    duplicitný FK by musel byť držaný v konzistencii navyše. Lajky zanikajú
    s komentárom cez CASCADE; lajky POUŽÍVATEĽA pod cudzími komentármi maže
    explicitne ``account_deletion._delete_owned_content`` (User riadok sa pri
    GDPR zmazaní len anonymizuje, takže CASCADE cez ``user`` nevystrelí).
    """

    comment = models.ForeignKey(
        FeedPostComment,
        on_delete=models.CASCADE,
        related_name="likes",
        verbose_name=_("Komentár"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feed_post_comment_likes",
        verbose_name=_("Používateľ"),
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Páči sa mi komentár")
        verbose_name_plural = _("Páči sa mi komentáre")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["comment", "user"],
                name="unique_feed_comment_like_per_user",
            )
        ]
        indexes = [
            models.Index(
                fields=["comment", "created_at"],
                name="acc_fpclike_comm_cr_idx",
            ),
            models.Index(
                fields=["user", "created_at"],
                name="acc_fpclike_user_cr_idx",
            ),
        ]

    def __str__(self):
        return f"Like komentára #{self.comment_id} od používateľa {self.user_id}"


class FeedPostTag(models.Model):
    """Označenie používateľa v príspevku.

    ``tagged_user`` je CASCADE, ale POZOR: pri GDPR zmazaní účtu sa User riadok
    NEmaže (len anonymizuje), takže CASCADE sám nevystrelí – tagy označeného sa
    mažú explicitne v ``account_deletion._delete_owned_content``, rovnako ako
    ``FeedPostLike``/``FeedPostComment``. Tagy NA príspevkoch zmazaného autora
    zaniknú s príspevkom (CASCADE cez ``post``).

    Tag je len referencia, nie obsah – preto tu nie je „survival" vzor so
    snapshotom ako pri zdieľaní ponuky. Keď označený zmizne, tag zmizne s ním.
    """

    post = models.ForeignKey(
        FeedPost,
        on_delete=models.CASCADE,
        related_name="tags",
        verbose_name=_("Príspevok"),
    )
    tagged_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feed_post_tags",
        verbose_name=_("Označený používateľ"),
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Označenie v príspevku")
        verbose_name_plural = _("Označenia v príspevkoch")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["post", "tagged_user"],
                name="unique_feed_post_tag_per_user",
            )
        ]
        indexes = [
            # "Príspevky, kde som označený" na profile.
            models.Index(
                fields=["tagged_user", "created_at"],
                name="acc_fptag_user_cr_idx",
            ),
        ]

    def __str__(self):
        return f"Označenie #{self.tagged_user_id} v príspevku #{self.post_id}"

    def save(self, *args, **kwargs):
        """Blokovanie bráni označeniu – vynútené na modeli, nie len v službe.

        Je to cross-table pravidlo, ktoré DB constraint nevyjadrí, a rovnaká
        poistka ako pri ``FeedPost`` zdieľaní: platí aj pre priamy ORM zápis,
        ktorý obíde ``feed_tagging.apply_feed_post_tags``.
        """
        if self._state.adding:
            reason = feed_post_tag_block_reason(
                author_id=self.post.author_id,
                tagged_user_id=self.tagged_user_id,
            )
            if reason is not None:
                raise ValidationError(TAG_REASON_MESSAGES[reason], code=reason)
        super().save(*args, **kwargs)
