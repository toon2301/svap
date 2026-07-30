"""Technické hlásenia chýb od používateľov."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class BugReportCategory(models.TextChoices):
    NOT_WORKING = "not_working", _("Niečo nefunguje")
    VISUAL = "visual", _("Problém so vzhľadom")
    PERFORMANCE = "performance", _("Aplikácia je pomalá alebo spadla")
    OTHER = "other", _("Iný problém")


class BugReportStatus(models.TextChoices):
    NEW = "new", _("Nové")
    TRIAGED = "triaged", _("Skontrolované")
    IN_PROGRESS = "in_progress", _("Rieši sa")
    RESOLVED = "resolved", _("Vyriešené")
    CLOSED = "closed", _("Zatvorené")


class BugReportPriority(models.TextChoices):
    LOW = "low", _("Nízka")
    NORMAL = "normal", _("Normálna")
    HIGH = "high", _("Vysoká")
    CRITICAL = "critical", _("Kritická")


class BugReportDeviceType(models.TextChoices):
    UNKNOWN = "unknown", _("Neznáme")
    MOBILE = "mobile", _("Mobil")
    DESKTOP = "desktop", _("Desktop")
    TABLET = "tablet", _("Tablet")


class BugReport(models.Model):
    """Používateľom odoslané technické hlásenie aplikácie."""

    public_id = models.UUIDField(
        _("Verejné ID"),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bug_reports",
        verbose_name=_("Nahlásil"),
    )
    category = models.CharField(
        _("Kategória"),
        max_length=20,
        choices=BugReportCategory.choices,
        help_text=_("Druh problému zvolený používateľom."),
    )
    title = models.CharField(
        _("Názov"),
        max_length=120,
        help_text=_("Krátky názov problému zadaný používateľom."),
    )
    description = models.TextField(_("Popis"), max_length=2000)
    reproduction_steps = models.TextField(
        _("Postup zopakovania"),
        max_length=2000,
        blank=True,
        default="",
    )
    source_screen = models.CharField(
        _("Zdrojová obrazovka"),
        max_length=64,
        blank=True,
        default="",
        help_text=_("Obrazovka aplikácie, z ktorej bolo hlásenie odoslané."),
    )
    device_type = models.CharField(
        _("Typ zariadenia"),
        max_length=16,
        choices=BugReportDeviceType.choices,
        default=BugReportDeviceType.UNKNOWN,
        help_text=_("Typ zariadenia určený klientskou aplikáciou."),
    )
    locale = models.CharField(
        _("Jazyk aplikácie"),
        max_length=10,
        blank=True,
        default="",
        help_text=_("Jazyk aplikácie v čase odoslania hlásenia."),
    )
    app_version = models.CharField(
        _("Verzia aplikácie"),
        max_length=64,
        blank=True,
        default="",
        help_text=_("Verzia aplikácie v čase odoslania hlásenia."),
    )
    browser = models.CharField(
        _("Prehliadač"),
        max_length=64,
        blank=True,
        default="",
        help_text=_("Prehliadač určený klientskou aplikáciou."),
    )
    status = models.CharField(
        _("Stav"),
        max_length=20,
        choices=BugReportStatus.choices,
        default=BugReportStatus.NEW,
        help_text=_("Aktuálny stav spracovania hlásenia."),
    )
    priority = models.CharField(
        _("Priorita"),
        max_length=16,
        choices=BugReportPriority.choices,
        default=BugReportPriority.NORMAL,
        help_text=_("Interná priorita spracovania hlásenia."),
    )
    internal_note = models.TextField(
        _("Interná poznámka"),
        blank=True,
        default="",
    )
    support_notified_at = models.DateTimeField(
        _("Podpora upozornená"),
        null=True,
        blank=True,
    )
    resolved_at = models.DateTimeField(
        _("Vyriešené"),
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Upravené"), auto_now=True)

    class Meta:
        verbose_name = _("Hlásenie chyby")
        verbose_name_plural = _("Hlásenia chýb")
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=["status", "-created_at"],
                name="acc_bug_status_created_idx",
            ),
            models.Index(
                fields=["category", "-created_at"],
                name="acc_bug_category_created_idx",
            ),
            models.Index(
                fields=["reported_by", "-created_at"],
                name="acc_bug_reporter_created_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(category__in=BugReportCategory.values),
                name="bug_report_category_valid",
            ),
            models.CheckConstraint(
                check=Q(status__in=BugReportStatus.values),
                name="bug_report_status_valid",
            ),
            models.CheckConstraint(
                check=Q(priority__in=BugReportPriority.values),
                name="bug_report_priority_valid",
            ),
            models.CheckConstraint(
                check=Q(device_type__in=BugReportDeviceType.values),
                name="bug_report_device_type_valid",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.reference}: {self.title}"

    @property
    def reference(self) -> str:
        return f"BR-{str(self.public_id).upper()}"


class BugReportNotificationOutbox(models.Model):
    """Durable intent to notify support about a bug report."""

    bug_report = models.OneToOneField(
        BugReport,
        on_delete=models.CASCADE,
        related_name="notification_outbox",
    )
    attempt_count = models.PositiveIntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name = _("Čakajúca notifikácia hlásenia chyby")
        verbose_name_plural = _("Čakajúce notifikácie hlásení chýb")

    def __str__(self) -> str:
        return f"Bug report notification intent {self.bug_report_id}"
