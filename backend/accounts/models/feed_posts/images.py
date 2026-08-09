"""Fotky príspevku – dedikovaná tabuľka podľa vzoru ``PortfolioImage``.

Do Fázy 4.4 žila jediná fotka priamo v poliach na ``FeedPost`` (``image_*``) –
vedomé zjednodušenie, kým platil limit 1. Pri limite 5 už rovnaký trik nefunguje
(päť sád polí, žiadne poradie, žiadne per-fotka statusy), takže sa preberá presne
ten model, ktorý appka na viac fotiek už má.

Každá fotka prechádza moderáciou a spracovaním NEZÁVISLE: jedna zamietnutá
neblokuje ostatné, takže status/rejected_reason/processed_at patria sem, nie
na príspevok.
"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from .post import FeedPost

#: Horný limit fotiek na príspevok. Vynucuje sa pri upload-init (vzor
#: ``MAX_PORTFOLIO_IMAGES``); DB constraint to nevyjadrí – ide o počet riadkov
#: v child tabuľke, nie o hodnotu v stĺpci.
MAX_FEED_POST_IMAGES = 5


class FeedPostImage(models.Model):
    """Jedna fotka voľného príspevku.

    Mazanie: ``post`` je CASCADE, takže fotky zanikajú s príspevkom. Súbory
    v storage upratuje ``post_delete`` signál na TOMTO modeli – Django posiela
    post_delete aj pre kaskádovo mazané objekty, takže pokrýva obe cesty
    (zmazanie fotky aj zmazanie celého príspevku vrátane GDPR purge).
    """

    class Status(models.TextChoices):
        PENDING = "pending", _("Čaká na spracovanie")
        APPROVED = "approved", _("Schválené")
        REJECTED = "rejected", _("Zamietnuté")

    post = models.ForeignKey(
        FeedPost,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name=_("Príspevok"),
    )
    order = models.PositiveIntegerField(_("Poradie"), default=0)
    status = models.CharField(
        _("Stav"),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    pending_key = models.CharField(
        _("S3 kľúč (pending)"), max_length=1024, blank=True, default=""
    )
    approved_key = models.CharField(
        _("S3 kľúč (approved)"), max_length=1024, blank=True, default=""
    )
    thumbnail_key = models.CharField(
        _("S3 kľúč (thumbnail)"), max_length=1024, blank=True, default=""
    )
    original_filename = models.CharField(
        _("Pôvodný názov súboru"), max_length=255, blank=True, default=""
    )
    content_type = models.CharField(
        _("Content-Type"), max_length=100, blank=True, default=""
    )
    size_bytes = models.BigIntegerField(_("Veľkosť (bytes)"), null=True, blank=True)
    width = models.IntegerField(_("Šírka"), null=True, blank=True)
    height = models.IntegerField(_("Výška"), null=True, blank=True)
    rejected_reason = models.CharField(
        _("Dôvod zamietnutia"), max_length=255, blank=True, default=""
    )
    processed_at = models.DateTimeField(_("Spracované o"), null=True, blank=True)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Fotka príspevku")
        verbose_name_plural = _("Fotky príspevkov")
        # Poradie zobrazenia; sekundárne id drží determinizmus pri zhodnom order.
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["post", "order"], name="acc_fpimg_post_order_idx"),
        ]

    def __str__(self):
        return f"Fotka #{self.id} príspevku #{self.post_id}"

    def save(self, *args, **kwargs):
        """Fotku smie mať len voľný príspevok – zdieľanie má snapshot náhľad.

        Do Fázy 4.4 to vynucoval DB CheckConstraint (``image_status=""`` na
        zdieľaniach). Nad child tabuľkou sa to constraintom vyjadriť nedá, tak
        pravidlo drží model – rovnaký vzor ako ``FeedPostTag.save()``. Platí
        teda aj pre priamy ORM zápis, ktorý obíde upload endpoint.
        """
        if self._state.adding and self.post.post_type != FeedPost.PostType.FREE_POST:
            raise ValidationError(
                _("Zdieľaný príspevok nemôže mať vlastnú fotku."),
                code="feed_image_on_shared_post",
            )
        super().save(*args, **kwargs)

    def storage_keys(self) -> list[str]:
        """Všetky storage kľúče tejto fotky – pre cleanup po zmazaní."""
        return [self.pending_key, self.approved_key, self.thumbnail_key]
