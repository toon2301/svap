"""
Konverzácia v odpovedi `GET /conversations/<id>/messages/` pre príjemcu žiadosti o správu.

Hlavička detailu konverzácie berie druhú stranu (meno, avatar, slug) práve z poľa
`conversation` v tejto odpovedi. Prichádzajúca neprijatá žiadosť nie je medzi
„prístupnými" konverzáciami v zozname príjemcu (patrí do záložky žiadostí), preto sa
predtým vrátilo `conversation: null` a hlavička ukázala len „Používateľ" bez avatara
a bez odkazu na profil. Tieto testy držia opravu aj hranice, ktoré sa nesmú zmeniť:
zoznam konverzácií príjemcu ostáva prázdny a cudzí používateľ k ničomu nepríde.
"""

import shutil
import tempfile
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase

from messaging.api.view_helpers_conversations import _serialize_conversation_for_user
from messaging.models import Conversation, ConversationParticipant

User = get_user_model()


@pytest.mark.django_db
class TestPendingRequestConversationHeader(APITestCase):
    """Detail konverzácie pre odosielateľa, príjemcu a cudzieho používateľa."""

    def setUp(self):
        """Pripraví troch používateľov a zablokuje push a hodnotenie obrázkov."""
        cache.clear()
        self.temp_media_root = tempfile.mkdtemp()
        media_override = override_settings(
            MEDIA_ROOT=self.temp_media_root,
            SAFESEARCH_ENABLED=False,
        )
        media_override.enable()
        self.addCleanup(media_override.disable)
        self.addCleanup(lambda: shutil.rmtree(self.temp_media_root, ignore_errors=True))
        push_patcher = patch(
            "messaging.services.push_enqueue.deliver_message_push_task.delay",
            return_value=None,
        )
        push_patcher.start()
        self.addCleanup(push_patcher.stop)

        self.sender = self._create_user(
            "sender", first_name="Sára", last_name="Odosielateľ"
        )
        self.recipient = self._create_user(
            "recipient", first_name="Roman", last_name="Príjemca"
        )
        self.outsider = self._create_user("outsider")

    def tearDown(self):
        """Vyčistí cache, aby sa limity a prítomnosť neprenášali medzi testami."""
        cache.clear()

    @staticmethod
    def _create_user(username: str, **extra):
        """Vytvorí overeného aktívneho používateľa s daným menom."""
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
            **extra,
        )

    def _start_request(self) -> int:
        """Odosielateľ pošle prvú správu príjemcovi; vráti ID čakajúcej konverzácie."""
        self.client.force_authenticate(user=self.sender)
        response = self.client.post(
            reverse("accounts:messaging_send_direct_message"),
            {"target_user_id": self.recipient.id, "text": "Ahoj"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        return response.data["conversation_id"]

    def _messages(self, user, conversation_id: int):
        """Načíta odpoveď endpointu správ ako daný používateľ."""
        self.client.force_authenticate(user=user)
        return self.client.get(
            reverse(
                "accounts:messaging_list_messages",
                kwargs={"conversation_id": conversation_id},
            )
        )

    def test_recipient_gets_the_conversation_with_the_sender_as_other_user(self):
        """Príjemca žiadosti dostane konverzáciu a druhou stranou je odosielateľ."""
        conversation_id = self._start_request()

        response = self._messages(self.recipient, conversation_id)

        assert response.status_code == status.HTTP_200_OK
        conversation = response.data["conversation"]
        assert conversation is not None
        assert conversation["id"] == conversation_id
        assert conversation["message_request_role"] == "recipient"
        other_user = conversation["other_user"]
        assert other_user["id"] == self.sender.id
        assert other_user["display_name"]
        assert other_user["slug"] == self.sender.slug

    def test_other_user_exposes_only_the_public_brief(self):
        """Druhá strana nesie len verejné polia, nikdy e-mail ani prihlasovacie údaje."""
        conversation_id = self._start_request()

        response = self._messages(self.recipient, conversation_id)

        other_user = response.data["conversation"]["other_user"]
        assert "email" not in other_user
        assert "password" not in other_user
        assert "username" not in other_user

    def test_sender_still_gets_the_conversation(self):
        """Odosielateľ dostáva konverzáciu ako doteraz."""
        conversation_id = self._start_request()

        response = self._messages(self.sender, conversation_id)

        assert response.status_code == status.HTTP_200_OK
        conversation = response.data["conversation"]
        assert conversation["id"] == conversation_id
        assert conversation["message_request_role"] == "sender"
        assert conversation["other_user"]["id"] == self.recipient.id

    def test_recipient_conversation_list_stays_empty_until_the_request_is_accepted(
        self,
    ):
        """Zoznam konverzácií príjemcu ostáva prázdny, kým žiadosť neprijme."""
        self._start_request()

        self.client.force_authenticate(user=self.recipient)
        response = self.client.get(reverse("accounts:messaging_list_conversations"))

        assert response.status_code == status.HTTP_200_OK
        assert response.data.get("results", response.data) == []

    def test_recipient_still_finds_the_request_in_the_requests_list(self):
        """Príjemca nájde žiadosť v zozname žiadostí ako doteraz."""
        conversation_id = self._start_request()

        self.client.force_authenticate(user=self.recipient)
        response = self.client.get(reverse("accounts:messaging_list_message_requests"))

        results = response.data.get("results", response.data)
        assert [item["id"] for item in results] == [conversation_id]

    def test_outsider_cannot_read_the_conversation_or_learn_about_it(self):
        """Cudzí používateľ konverzáciu nenačíta a nič sa o nej nedozvie."""
        conversation_id = self._start_request()

        response = self._messages(self.outsider, conversation_id)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert (
            "conversation" not in response.data or response.data["conversation"] is None
        )

    def test_recipient_who_hid_the_conversation_gets_nothing(self):
        """Skrytá konverzácia sa príjemcovi nevráti."""
        conversation_id = self._start_request()
        ConversationParticipant.objects.filter(
            conversation_id=conversation_id, user=self.recipient
        ).update(hidden_at=timezone.now() + timedelta(hours=1))

        response = self._messages(self.recipient, conversation_id)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_conversation_is_still_returned_after_the_recipient_replies(self):
        """Po odpovedi príjemcu (prijatie žiadosti) konverzácia ostáva dostupná."""
        conversation_id = self._start_request()
        self.client.force_authenticate(user=self.recipient)
        reply = self.client.post(
            reverse(
                "accounts:messaging_send_message",
                kwargs={"conversation_id": conversation_id},
            ),
            {"text": "Ahoj, rád pomôžem"},
            format="json",
        )
        assert reply.status_code == status.HTTP_201_CREATED

        response = self._messages(self.recipient, conversation_id)

        conversation = response.data["conversation"]
        assert conversation["id"] == conversation_id
        assert conversation["other_user"]["id"] == self.sender.id
        accepted = Conversation.objects.get(id=conversation_id)
        assert accepted.request_status == Conversation.RequestStatus.ACCEPTED

    def _helper_request_for(self, user):
        """Zostaví požiadavku s daným používateľom pre priame volanie pomocníka."""
        request = APIRequestFactory().get("/")
        request.user = user
        return request

    def test_helper_serves_the_incoming_request_to_its_recipient_only(self):
        """Pomocník vydá prichádzajúcu žiadosť jej príjemcovi a nikomu inému."""
        conversation_id = self._start_request()

        for_recipient = _serialize_conversation_for_user(
            request=self._helper_request_for(self.recipient),
            conversation_id=conversation_id,
        )
        for_outsider = _serialize_conversation_for_user(
            request=self._helper_request_for(self.outsider),
            conversation_id=conversation_id,
        )

        assert for_recipient["id"] == conversation_id
        assert for_outsider is None

    def test_helper_does_not_serve_a_deleted_request_to_its_recipient(self):
        """Zmazaná žiadosť nie je „prichádzajúca neprijatá" – záloha sa jej netýka."""
        conversation_id = self._start_request()
        Conversation.objects.filter(id=conversation_id).update(
            request_status=Conversation.RequestStatus.DELETED
        )

        served = _serialize_conversation_for_user(
            request=self._helper_request_for(self.recipient),
            conversation_id=conversation_id,
        )

        assert served is None
