"""Výmenné požiadavky (SkillRequest) a ich ukončenie – z models.py."""

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class SkillRequestStatus(models.TextChoices):
    PENDING = "pending", _("Čaká na odpoveď")
    ACCEPTED = "accepted", _("Prijaté")
    REJECTED = "rejected", _("Zamietnuté")
    CANCELLED = "cancelled", _("Zrušené")
    COMPLETION_REQUESTED = "completion_requested", _("Completion requested")
    COMPLETED = "completed", _("Completed")
    TERMINATED = "terminated", _("Predčasne ukončené")


REVIEWABLE_SKILL_REQUEST_STATUSES = (
    SkillRequestStatus.COMPLETED,
    SkillRequestStatus.TERMINATED,
)


class SkillRequestTerminationReason(models.TextChoices):
    NO_RESPONSE = "no_response", _("Druhá strana nereaguje")
    NO_TIME = "no_time", _("Nemám čas pokračovať")
    CHANGED_CIRCUMSTANCES = "changed_circumstances", _("Zmena okolností")
    COULD_NOT_AGREE = "could_not_agree", _("Nepodarilo sa dohodnúť")
    COMMUNICATION_ISSUE = (
        "communication_issue",
        _("Nie som spokojný s komunikáciou"),
    )
    MEETING_NOT_HAPPENED = (
        "meeting_not_happened",
        _("Stretnutie / realizácia neprebehla"),
    )
    TRUST_CONCERNS = "trust_concerns", _("Mám obavy z dôveryhodnosti")
    OTHER = "other", _("Iné")


class SkillRequest(models.Model):
    """
    Žiadosť o kartu (ponúkam / hľadám).

    - requester: kto žiadosť posiela
    - recipient: komu žiadosť príde (vlastník karty)
    - offer: karta, ktorej sa žiadosť týka
    """

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_skill_requests",
        verbose_name=_("Odosielateľ"),
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_skill_requests",
        verbose_name=_("Príjemca"),
    )
    offer = models.ForeignKey(
        "accounts.OfferedSkill",
        on_delete=models.CASCADE,
        related_name="skill_requests",
        verbose_name=_("Karta"),
    )
    proposed_offer = models.ForeignKey(
        "accounts.OfferedSkill",
        on_delete=models.SET_NULL,
        related_name="proposed_skill_requests",
        null=True,
        blank=True,
        verbose_name=_("Navrhovaná karta"),
    )
    proposal_description = models.TextField(
        _("Opis pomoci"), max_length=200, blank=True, default=""
    )
    proposal_price_from = models.DecimalField(
        _("Navrhovaná cena od"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    proposal_price_currency = models.CharField(
        _("Navrhovaná mena"), max_length=8, blank=True, default=""
    )
    proposal_price_negotiable = models.BooleanField(
        _("Navrhovaná cena dohodou"), default=False
    )
    proposal_experience_value = models.FloatField(
        _("Navrhovaná dĺžka praxe"), null=True, blank=True
    )
    proposal_experience_unit = models.CharField(
        _("Jednotka navrhovanej praxe"),
        max_length=10,
        choices=[
            ("years", _("Roky")),
            ("months", _("Mesiace")),
        ],
        blank=True,
        default="",
    )
    status = models.CharField(
        _("Stav"),
        max_length=25,
        choices=SkillRequestStatus.choices,
        default=SkillRequestStatus.PENDING,
    )
    hidden_by_requester = models.BooleanField(
        _("Skryté pre odosielateľa"), default=False
    )
    hidden_by_recipient = models.BooleanField(_("Skryté pre príjemcu"), default=False)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Aktualizované"), auto_now=True)

    class Meta:
        verbose_name = _("Žiadosť o kartu")
        verbose_name_plural = _("Žiadosti o kartu")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["requester", "offer"],
                condition=Q(
                    status__in=(
                        SkillRequestStatus.PENDING,
                        SkillRequestStatus.ACCEPTED,
                        SkillRequestStatus.COMPLETION_REQUESTED,
                    )
                ),
                name="unique_skill_request_per_requester_offer",
            )
        ]
        indexes = [
            models.Index(fields=["recipient", "status", "created_at"]),
            models.Index(fields=["requester", "status", "created_at"]),
            models.Index(fields=["offer", "created_at"]),
        ]

    def __str__(self):
        return f"Request #{self.id}: {self.requester_id} -> {self.recipient_id} (offer {self.offer_id}) [{self.status}]"


class SkillRequestTermination(models.Model):
    """Auditný záznam predčasného skončenia aktívnej výmeny."""

    skill_request = models.OneToOneField(
        "accounts.SkillRequest",
        on_delete=models.CASCADE,
        related_name="termination",
        verbose_name=_("Výmena"),
    )
    terminated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="skill_request_terminations",
        verbose_name=_("Ukončil"),
    )
    reason = models.CharField(
        _("Dôvod"),
        max_length=40,
        choices=SkillRequestTerminationReason.choices,
    )
    description = models.TextField(_("Popis"), blank=True, max_length=1000)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Ukončenie výmeny")
        verbose_name_plural = _("Ukončenia výmen")
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["reason", "created_at"], name="acc_req_term_reason_cr_idx"),
            models.Index(fields=["terminated_by", "created_at"], name="acc_req_term_by_cr_idx"),
        ]

    def __str__(self):
        return f"Termination #{self.id}: request {self.skill_request_id} by {self.terminated_by_id}"


