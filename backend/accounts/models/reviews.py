"""Recenzie a lajky (Review, ReviewLike, OfferedSkillLike) – z models.py."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Review(models.Model):
    """
    Recenzia ponuky (OfferedSkill).

    Bezpečnostné pravidlá:
    - Jeden používateľ môže recenzovať jednu ponuku len raz (unique constraint)
    - Používateľ nemôže recenzovať vlastnú ponuku (validácia v view)
    - Rating: 0.0 až 5.0 v krokoch 0.5
    """

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_written",
        verbose_name=_("Recenzent"),
    )
    offer = models.ForeignKey(
        "accounts.OfferedSkill",
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name=_("Ponuka"),
    )
    rating = models.DecimalField(
        _("Hodnotenie"),
        max_digits=3,
        decimal_places=1,
        help_text=_("Hodnotenie od 0.0 do 5.0 v krokoch 0.5"),
    )
    text = models.TextField(
        _("Text recenzie"),
        max_length=300,
        blank=True,
        default="",
    )
    pros = models.JSONField(
        _("Plusy"),
        default=list,
        blank=True,
        help_text=_("Zoznam plusov (max 10 položiek)"),
    )
    cons = models.JSONField(
        _("Minusy"),
        default=list,
        blank=True,
        help_text=_("Zoznam minusov (max 10 položiek)"),
    )
    owner_response = models.TextField(
        _("Odpoveď vlastníka ponuky"),
        max_length=700,
        null=True,
        blank=True,
    )
    owner_responded_at = models.DateTimeField(
        _("Odpoveď vlastníka dňa"),
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Aktualizované"), auto_now=True)

    class Meta:
        verbose_name = _("Recenzia")
        verbose_name_plural = _("Recenzie")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["reviewer", "offer"],
                name="unique_review_per_reviewer_offer",
            )
        ]
        indexes = [
            models.Index(fields=["offer", "created_at"]),
            models.Index(fields=["reviewer", "created_at"]),
            models.Index(fields=["rating", "created_at"]),
        ]

    def __str__(self):
        return f"Recenzia #{self.id}: {self.reviewer.display_name} -> {self.offer} ({self.rating}/5)"

    def clean(self):
        """Validácia dát pred uložením"""
        from django.core.exceptions import ValidationError

        # Rating musí byť medzi 0.0 a 5.0
        if self.rating < 0 or self.rating > 5:
            raise ValidationError({"rating": "Hodnotenie musí byť medzi 0.0 a 5.0."})

        # Rating musí byť v krokoch 0.5
        if float(self.rating) % 0.5 != 0:
            raise ValidationError(
                {"rating": "Hodnotenie musí byť v krokoch 0.5 (napr. 3.5, 4.0)."}
            )

        # Pros a cons musia byť zoznamy
        if not isinstance(self.pros, list):
            raise ValidationError({"pros": "Plusy musia byť zoznam."})
        if not isinstance(self.cons, list):
            raise ValidationError({"cons": "Minusy musia byť zoznam."})

        # Max 10 položiek v pros a cons
        if len(self.pros) > 10:
            raise ValidationError({"pros": "Môžeš pridať maximálne 10 plusov."})
        if len(self.cons) > 10:
            raise ValidationError({"cons": "Môžeš pridať maximálne 10 minusov."})

        # Každá položka v pros/cons musí byť string s max 120 znakmi
        for i, pro in enumerate(self.pros):
            if not isinstance(pro, str):
                raise ValidationError({"pros": f"Plus #{i+1} musí byť text."})
            if len(pro) > 120:
                raise ValidationError(
                    {"pros": f"Plus #{i+1} môže mať maximálne 120 znakov."}
                )

        for i, con in enumerate(self.cons):
            if not isinstance(con, str):
                raise ValidationError({"cons": f"Mínus #{i+1} musí byť text."})
            if len(con) > 120:
                raise ValidationError(
                    {"cons": f"Mínus #{i+1} môže mať maximálne 120 znakov."}
                )

        # Text má max 300 znakov
        if len(self.text) > 300:
            raise ValidationError(
                {"text": "Text recenzie môže mať maximálne 300 znakov."}
            )


class ReviewLike(models.Model):
    """Vzťah používateľa k recenzii, ktorá sa mu páči."""

    review = models.ForeignKey(
        "accounts.Review",
        on_delete=models.CASCADE,
        related_name="likes",
        verbose_name=_("Recenzia"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="review_likes",
        verbose_name=_("Používateľ"),
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Páči sa mi recenzia")
        verbose_name_plural = _("Páči sa mi recenzie")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["review", "user"],
                name="unique_review_like_per_user",
            )
        ]
        indexes = [
            models.Index(
                fields=["review", "created_at"],
                name="acc_revlike_review_created_idx",
            ),
            models.Index(
                fields=["user", "created_at"],
                name="acc_revlike_user_created_idx",
            ),
        ]

    def __str__(self):
        return f"Like recenzie #{self.review_id} od používateľa {self.user_id}"


class OfferedSkillLike(models.Model):
    """Vzťah používateľa k ponuke, ktorá sa mu páči."""

    offer = models.ForeignKey(
        "accounts.OfferedSkill",
        on_delete=models.CASCADE,
        related_name="offer_likes",
        verbose_name=_("Ponuka"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="offered_skill_likes",
        verbose_name=_("Používateľ"),
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Páči sa mi ponuka")
        verbose_name_plural = _("Páči sa mi ponuky")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["offer", "user"],
                name="unique_offer_like_per_user",
            )
        ]
        indexes = [
            models.Index(
                fields=["offer", "created_at"],
                name="acc_offlike_offer_cr_idx",
            ),
            models.Index(
                fields=["user", "created_at"],
                name="acc_offlike_user_cr_idx",
            ),
        ]

    def __str__(self):
        return f"Like ponuky #{self.offer_id} od používateľa {self.user_id}"


