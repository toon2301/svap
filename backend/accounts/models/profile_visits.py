"""Profile visits.

Zber dát o návštevách profilu (Fáza 4.1 – len zápis + retencia, žiadne čítanie).
Vzor prevzatý z ``profile_likes.py``: UniqueConstraint + CheckConstraint(~self) +
Index. Jeden riadok na kombináciu (profil, návštevník, deň) – ``visit_date`` je
lokálny dátum (``timezone.localdate()``) v momente zápisu, nie UTC.
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class ProfileVisit(models.Model):
    """Jedna návšteva cudzieho profilu za deň (dedup cez unique per day)."""

    profile_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile_visits_received",
        verbose_name=_("Visited profile"),
    )
    viewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile_visits_made",
        verbose_name=_("Viewer"),
    )
    # Lokálny deň návštevy (Europe/Bratislava), naplnený cez timezone.localdate().
    # Súčasť unique kľúča – zabezpečuje "jeden záznam za deň na kombináciu".
    visit_date = models.DateField(_("Visit date"))
    created_at = models.DateTimeField(_("Created"), auto_now_add=True)

    class Meta:
        verbose_name = _("Profile visit")
        verbose_name_plural = _("Profile visits")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["profile_user", "viewer", "visit_date"],
                name="unique_profile_visit_per_day",
            ),
            models.CheckConstraint(
                check=~models.Q(profile_user=models.F("viewer")),
                name="profile_visit_cannot_point_to_self",
            ),
        ]
        indexes = [
            models.Index(
                fields=["profile_user", "visit_date"],
                name="acc_pvisit_profile_date_idx",
            ),
            # Retencia filtruje podľa created_at (purge_old_profile_visits) –
            # vlastný index bráni sekvenčnému skenu pri mazaní.
            models.Index(
                fields=["created_at"],
                name="acc_pvisit_created_idx",
            ),
        ]

    def __str__(self):
        return (
            f"ProfileVisit #{self.id}: viewer {self.viewer_id} "
            f"-> profile {self.profile_user_id} @ {self.visit_date}"
        )
