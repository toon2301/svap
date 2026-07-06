"""Zdieľané enumy (TextChoices) pre accounts modely – vyčlenené z models.py."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class UserType(models.TextChoices):
    INDIVIDUAL = "individual", _("Osoba")
    COMPANY = "company", _("Firma")


class SubscriptionTier(models.TextChoices):
    FREE = "free", _("Free")
    PREMIUM = "premium", _("Premium")


class MobileOnboardingStatus(models.TextChoices):
    IN_PROGRESS = "in_progress", _("In progress")
    COMPLETED = "completed", _("Completed")
    SKIPPED = "skipped", _("Skipped")


class MobileOnboardingStep(models.TextChoices):
    HOME = "home", _("Home")
    PROFILE_ICON = "profile_icon", _("Profile icon")
    PROFILE_EDIT = "profile_edit", _("Profile edit")
    EDIT_FORM = "edit_form", _("Edit form")
    SEARCH = "search", _("Search")
    HELP_REQUEST = "help_request", _("Help request")
    REQUESTS = "requests", _("Requests")
    MESSAGES = "messages", _("Messages")
    DASHBOARD_FINISH = "dashboard_finish", _("Dashboard finish")


class DesktopOnboardingStep(models.TextChoices):
    NAVIGATION = "navigation", _("Navigation")
    PROFILE_ICON = "profile_icon", _("Profile icon")
    PROFILE_EDIT = "profile_edit", _("Profile edit")
    EDIT_FORM = "edit_form", _("Edit form")
    SEARCH = "search", _("Search")
    HELP_REQUEST = "help_request", _("Help request")
    REQUESTS = "requests", _("Requests")
    MESSAGES = "messages", _("Messages")
    DASHBOARD_FINISH = "dashboard_finish", _("Dashboard finish")
