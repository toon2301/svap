"""Interakcie s príspevkom – lajky a komentáre.

FeedPostLike: dedikovaná tabuľka podľa ``PortfolioItemLike`` (unique + 2 indexy).
Self-like je povolený – rovnaké rozhodnutie ako pri portfóliu (obsah, nie
identita; self-like guard má len ProfileLike).
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

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
