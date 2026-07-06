"""Nahlásenia a obľúbení (PhotoReport, ReviewReport, UserReport, FavoriteUser) – z models.py."""

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class PhotoReport(models.Model):
    """
    Nahlasenie fotky pouzivatelom.

    Report cieli bud na konkretnu fotku ponuky, alebo na aktualny avatar
    pouzivatela. Pri avatari ukladame nazov suboru v case nahlasenia, aby bolo
    jasne, ktoru fotku pouzivatel nahlasil aj po neskorsej zmene avatara.
    """

    offer_image = models.ForeignKey(
        "accounts.OfferedSkillImage",
        on_delete=models.CASCADE,
        related_name="reports",
        verbose_name=_("Nahlasena fotka ponuky"),
        blank=True,
        null=True,
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="avatar_reports_received",
        verbose_name=_("Nahlaseny pouzivatel avatara"),
        blank=True,
        null=True,
    )
    reported_avatar_name = models.CharField(
        _("Nazov nahlaseneho avataru"),
        max_length=255,
        blank=True,
        default="",
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="photo_reports_sent",
        verbose_name=_("Nahlasil"),
    )
    reason = models.CharField(
        _("Dovod"),
        max_length=100,
    )
    description = models.TextField(
        _("Popis"),
        blank=True,
    )
    created_at = models.DateTimeField(_("Vytvorene"), auto_now_add=True)
    is_resolved = models.BooleanField(_("Vyriesene"), default=False)

    class Meta:
        verbose_name = _("Nahlasenie fotky")
        verbose_name_plural = _("Nahlasenia fotiek")
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(offer_image__isnull=False, reported_user__isnull=True)
                    | Q(
                        offer_image__isnull=True,
                        reported_user__isnull=False,
                        reported_avatar_name__gt="",
                    )
                ),
                name="photo_report_has_exactly_one_target",
            ),
            models.CheckConstraint(
                check=Q(reported_user__isnull=True)
                | ~Q(reported_user=models.F("reported_by")),
                name="photo_report_cannot_report_own_avatar",
            ),
            models.UniqueConstraint(
                fields=["offer_image", "reported_by"],
                condition=Q(offer_image__isnull=False),
                name="unique_photo_report_per_offer_image",
            ),
            models.UniqueConstraint(
                fields=["reported_user", "reported_avatar_name", "reported_by"],
                condition=Q(reported_user__isnull=False),
                name="unique_photo_report_per_avatar",
            ),
        ]
        indexes = [
            models.Index(
                fields=["offer_image", "created_at"],
                name="acc_photo_rep_offer_cr_idx",
            ),
            models.Index(
                fields=["reported_user", "created_at"],
                name="acc_photo_rep_user_cr_idx",
            ),
            models.Index(
                fields=["reported_by", "created_at"],
                name="acc_photo_rep_by_cr_idx",
            ),
            models.Index(
                fields=["is_resolved", "created_at"],
                name="acc_photo_rep_res_cr_idx",
            ),
        ]

    def __str__(self):
        if self.offer_image_id:
            target = f"fotka ponuky {self.offer_image_id}"
        else:
            target = f"avatar pouzivatela {self.reported_user_id}"
        return f"Nahlasenie #{self.id}: {target} od {self.reported_by_id}"


class ReviewReport(models.Model):
    """
    Nahlásenie recenzie používateľom.
    Jeden používateľ môže nahlásiť konkrétnu recenziu iba raz.
    """

    review = models.ForeignKey(
        "accounts.Review",
        on_delete=models.CASCADE,
        related_name="reports",
        verbose_name=_("Recenzia"),
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name=_("Nahlásil"),
    )
    reason = models.CharField(
        _("Dôvod"),
        max_length=100,
    )
    description = models.TextField(
        _("Popis"),
        blank=True,
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    is_resolved = models.BooleanField(_("Vyriešené"), default=False)

    class Meta:
        verbose_name = _("Nahlásenie recenzie")
        verbose_name_plural = _("Nahlásenia recenzií")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["review", "reported_by"],
                name="unique_review_report_per_user",
            )
        ]

    def __str__(self):
        return f"Nahlásenie #{self.id}: recenzia {self.review_id} od {self.reported_by}"


class FavoriteUser(models.Model):
    """
    SÃºkromnÃ½ vzÅ¥ah obÄ¾ÃºbenÃ©ho pouÅ¾Ã­vateÄ¾a.

    KaÅ¾dÃ½ pouÅ¾Ã­vateÄ¾ si spravuje svoj vlastnÃ½ zoznam obÄ¾ÃºbenÃ½ch
    profilov. RovnakÃ½ vzÅ¥ah nemÃ´Å¾e vzniknÃºÅ¥ viackrÃ¡t a pouÅ¾Ã­vateÄ¾ si
    nemÃ´Å¾e pridaÅ¥ sÃ¡m seba.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorite_users",
        verbose_name=_("PouÅ¾Ã­vateÄ¾"),
    )
    favorite_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorited_by_users",
        verbose_name=_("ObÄ¾ÃºbenÃ½ pouÅ¾Ã­vateÄ¾"),
    )
    created_at = models.DateTimeField(_("VytvorenÃ©"), auto_now_add=True)

    class Meta:
        verbose_name = _("ObÄ¾ÃºbenÃ½ pouÅ¾Ã­vateÄ¾")
        verbose_name_plural = _("ObÄ¾ÃºbenÃ­ pouÅ¾Ã­vatelia")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "favorite_user"],
                name="unique_favorite_user_per_owner",
            ),
            models.CheckConstraint(
                check=~models.Q(user=models.F("favorite_user")),
                name="favorite_user_cannot_point_to_self",
            ),
        ]
        indexes = [
            models.Index(
                fields=["user", "created_at"],
                name="acc_fav_user_owner_created_idx",
            ),
        ]

    def __str__(self):
        return f"ObÄ¾ÃºbenÃ½ #{self.id}: user {self.user_id} -> {self.favorite_user_id}"


class UserReport(models.Model):
    """
    Nahlásenie používateľa iným používateľom.
    Používateľ nemôže nahlásiť sám seba.
    Jeden používateľ môže nahlásiť konkrétneho používateľa iba raz.
    """

    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports_received",
        verbose_name=_("Nahlásený používateľ"),
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports_sent",
        verbose_name=_("Nahlásil"),
    )
    reason = models.CharField(
        _("Dôvod"),
        max_length=100,
    )
    description = models.TextField(
        _("Popis"),
        blank=True,
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    is_resolved = models.BooleanField(_("Vyriešené"), default=False)

    class Meta:
        verbose_name = _("Nahlásenie používateľa")
        verbose_name_plural = _("Nahlásenia používateľov")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["reported_user", "reported_by"],
                name="unique_user_report_per_reporter",
            ),
            models.CheckConstraint(
                check=~models.Q(reported_user=models.F("reported_by")),
                name="user_report_cannot_report_self",
            ),
        ]

    def __str__(self):
        return f"Nahlásenie #{self.id}: používateľ {self.reported_user_id} od {self.reported_by_id}"

