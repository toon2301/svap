"""Odoslanie resetovacieho e-mailu na pozadí a neutralita HTTP odpovede.

Endpoint pre vyžiadanie resetu nesmie NIJAKO prezradiť, či účet existuje –
ani obsahom odpovede, ani stavovým kódom, ani tým, ako dlho request trvá.
Odosielanie preto beží v Celery tasku a tieto testy strážia, že sa doň naozaj
presunulo a že ho nič z pozadia nedokáže spätne premietnuť do odpovede.
"""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.services.password_reset_email import send_password_reset_email
from accounts.views.password_reset import PASSWORD_RESET_REQUEST_MESSAGE

MAIL_TASK = "accounts.password_reset_tasks.send_password_reset_email_task"
SERVICE_SEND_MAIL = "accounts.services.password_reset_email.send_mail"

User = get_user_model()


@pytest.mark.django_db
class TestPasswordResetRequestStaysNeutral(APITestCase):
    """Verejný endpoint odpovedá rovnako bez ohľadu na to, čo sa deje vzadu."""

    def setUp(self):
        """Vytvorí aktívny účet, na ktorom sa dá reset vyžiadať."""
        self.user = User.objects.create_user(
            username="resetuser",
            email="reset@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        self.url = reverse("accounts:password_reset_request")

    def _post(self, email):
        """Pošle požiadavku na reset pre danú adresu."""
        return self.client.post(self.url, {"email": email}, format="json")

    @patch(SERVICE_SEND_MAIL)
    @patch(MAIL_TASK)
    def test_request_does_not_send_mail_synchronously(self, _mock_task, mock_send_mail):
        """V samotnom requeste sa už neodosiela nič – to je práca tasku.

        Synchrónne odosielanie bolo časovým kanálom: existujúci účet čakal na
        SMTP, neexistujúci odpovedal hneď.
        """
        response = self._post(self.user.email)

        assert response.status_code == status.HTTP_200_OK
        mock_send_mail.assert_not_called()

    @patch(MAIL_TASK)
    def test_broker_failure_still_returns_the_neutral_answer(self, mock_task):
        """Výpadok fronty nesmie vyrobiť 500 tam, kde neznámy účet dostane 200."""
        mock_task.delay.side_effect = RuntimeError("broker down")

        response = self._post(self.user.email)

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"message": PASSWORD_RESET_REQUEST_MESSAGE}

    @patch(MAIL_TASK)
    def test_every_outcome_answers_exactly_the_same(self, mock_task):
        """Existujúci, neexistujúci, neaktívny aj zlyhaná fronta = tá istá odpoveď."""
        answers = []

        answers.append(self._post(self.user.email))
        answers.append(self._post("nobody@example.com"))

        mock_task.delay.side_effect = RuntimeError("broker down")
        answers.append(self._post(self.user.email))
        mock_task.delay.side_effect = None

        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        answers.append(self._post(self.user.email))

        assert {answer.status_code for answer in answers} == {status.HTTP_200_OK}
        assert {answer.content for answer in answers} == {
            answers[0].content,
        }


@pytest.mark.django_db
class TestPasswordResetEmailService(APITestCase):
    """Samotné odoslanie – už mimo requestu, takže naň nikto nečaká."""

    def setUp(self):
        """Vytvorí aktívny účet, ktorému má task poslať odkaz."""
        self.user = User.objects.create_user(
            username="resetuser",
            email="reset@example.com",
            password="StrongPass123",
            is_verified=True,
        )

    @patch(SERVICE_SEND_MAIL)
    def test_sends_the_reset_link_to_an_active_account(self, mock_send_mail):
        """Aktívny účet dostane odkaz na svoju adresu."""
        assert send_password_reset_email(user_id=self.user.pk) is True

        mock_send_mail.assert_called_once()
        kwargs = mock_send_mail.call_args.kwargs
        assert kwargs["recipient_list"] == [self.user.email]
        assert "/reset-password/" in kwargs["message"]

    @patch(SERVICE_SEND_MAIL)
    def test_sends_nothing_when_the_account_was_deactivated_meanwhile(
        self, mock_send_mail
    ):
        """Medzi požiadavkou a spracovaním tasku mohol účet stratiť nárok."""
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        assert send_password_reset_email(user_id=self.user.pk) is False
        mock_send_mail.assert_not_called()

    @patch(SERVICE_SEND_MAIL)
    def test_sends_nothing_when_the_account_is_gone(self, mock_send_mail):
        """Zmazaný účet task len ticho preskočí – používateľ už odpoveď dostal."""
        user_id = self.user.pk
        self.user.delete()

        assert send_password_reset_email(user_id=user_id) is False
        mock_send_mail.assert_not_called()

    @patch(SERVICE_SEND_MAIL)
    def test_sending_failure_surfaces_for_the_task_to_retry(self, mock_send_mail):
        """Zlyhanie SMTP prebubláva do Celery (autoretry), nie k používateľovi.

        HTTP odpoveď je v tom čase dávno odoslaná, takže sa nemá čo zmeniť.
        """
        mock_send_mail.side_effect = RuntimeError("smtp down")

        with pytest.raises(RuntimeError):
            send_password_reset_email(user_id=self.user.pk)
