"""Povinný popis pri dôvode „iné" – naprieč všetkými nahlasovacími endpointmi.

FE síce odosielacie tlačidlo deaktivuje, ale to sa dá obísť priamym volaním
API – validácia preto musí držať aj na backende.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import PhotoReport, UserReport

User = get_user_model()


def _user(name, *, is_public=True):
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password="StrongPass123",
        is_public=is_public,
    )


class UserReportDescriptionRequiredTests(APITestCase):
    def setUp(self):
        self.reporter = _user("rep-user-reporter")
        self.target = _user("rep-user-target")
        self.url = reverse("accounts:user_report", args=[self.target.id])
        self.client.force_authenticate(user=self.reporter)

    def test_other_reason_with_whitespace_description_is_rejected(self):
        response = self.client.post(
            self.url, data={"reason": "other", "description": "   "}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "description_required")
        self.assertEqual(UserReport.objects.count(), 0)

    def test_other_reason_with_description_succeeds(self):
        response = self.client.post(
            self.url,
            data={"reason": "other", "description": "Podvodné správanie"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserReport.objects.get().description, "Podvodné správanie")

    def test_regular_reason_without_description_succeeds(self):
        response = self.client.post(self.url, data={"reason": "spam"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserReport.objects.get().reason, "spam")


class AvatarReportDescriptionRequiredTests(APITestCase):
    """Avatar report ide cez rovnaký `_validate_report_payload` ako fotky ponúk."""

    def setUp(self):
        self.reporter = _user("rep-avatar-reporter")
        self.target = _user("rep-avatar-target")
        # Endpoint vyžaduje reálny avatar, inak vráti 404 skôr než validáciu.
        self.target.avatar = "avatars/target.jpg"
        self.target.save(update_fields=["avatar"])
        self.url = reverse("accounts:user_avatar_report", args=[self.target.id])
        self.client.force_authenticate(user=self.reporter)

    def test_other_reason_with_whitespace_description_is_rejected(self):
        response = self.client.post(
            self.url, data={"reason": "other", "description": "  "}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "description_required")
        self.assertEqual(PhotoReport.objects.count(), 0)

    def test_other_reason_with_description_succeeds(self):
        response = self.client.post(
            self.url,
            data={"reason": "other", "description": "Nevhodná fotka"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PhotoReport.objects.get().description, "Nevhodná fotka")

    def test_regular_reason_without_description_succeeds(self):
        response = self.client.post(
            self.url, data={"reason": "inappropriate"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PhotoReport.objects.get().reason, "inappropriate")
