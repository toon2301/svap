"""
Stránkovanie zoznamu konverzácií a žiadostí (`page`, `page_size`, `search`).

Frontend zoznam dotiahne po dávkach po 20 a pri obnove načíta celé už načítané okno jednou
požiadavkou s väčším `page_size` (najviac 100). Tieto testy držia vlastnosti, na ktorých to stojí:
dávky na seba nadväzujú bez prekryvu, okno sa zhoduje s dávkami, strop je 100, hľadanie sa
uplatňuje pred stránkovaním a počet SQL dotazov nerastie s počtom členov skupín.
"""

import shutil
import tempfile
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from messaging.models import Conversation, ConversationParticipant

User = get_user_model()


@pytest.mark.django_db
class TestConversationListPagination(APITestCase):
    """Zoznam konverzácií a žiadostí vrátený po stránkach."""

    def setUp(self):
        """Pripraví prihláseného používateľa a vypne hodnotenie obrázkov."""
        cache.clear()
        self.temp_media_root = tempfile.mkdtemp()
        media_override = override_settings(
            MEDIA_ROOT=self.temp_media_root,
            SAFESEARCH_ENABLED=False,
        )
        media_override.enable()
        self.addCleanup(media_override.disable)
        self.addCleanup(lambda: shutil.rmtree(self.temp_media_root, ignore_errors=True))

        self.me = self._create_user("me")
        self.other = self._create_user("other", first_name="Peter", last_name="Druhý")
        self.base_time = timezone.now()
        self.client.force_authenticate(user=self.me)

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

    def _direct_conversation(self, age_minutes: int, peer=None) -> Conversation:
        """Prijatá priama konverzácia s poslednou správou spred `age_minutes` minút."""
        peer = peer or self.other
        conversation = Conversation.objects.create(
            created_by=self.me,
            request_status=Conversation.RequestStatus.ACCEPTED,
            last_message_at=self.base_time - timedelta(minutes=age_minutes),
        )
        ConversationParticipant.objects.create(conversation=conversation, user=self.me)
        ConversationParticipant.objects.create(conversation=conversation, user=peer)
        return conversation

    def _incoming_request(self, age_minutes: int, sender) -> Conversation:
        """Čakajúca žiadosť o správu od `sender` pre prihláseného používateľa."""
        conversation = Conversation.objects.create(
            created_by=sender,
            request_status=Conversation.RequestStatus.PENDING,
            requested_by=sender,
            requested_to=self.me,
            last_message_at=self.base_time - timedelta(minutes=age_minutes),
        )
        ConversationParticipant.objects.create(conversation=conversation, user=sender)
        ConversationParticipant.objects.create(conversation=conversation, user=self.me)
        return conversation

    def _group_conversation(self, age_minutes: int, members) -> Conversation:
        """Skupinová konverzácia, ktorej členmi sú prihlásený používateľ a `members`."""
        conversation = Conversation.objects.create(
            created_by=self.me,
            is_group=True,
            name=f"Skupina {age_minutes}",
            request_status=Conversation.RequestStatus.ACCEPTED,
            last_message_at=self.base_time - timedelta(minutes=age_minutes),
        )
        ConversationParticipant.objects.create(
            conversation=conversation,
            user=self.me,
            role=ConversationParticipant.Role.OWNER,
        )
        for member in members:
            ConversationParticipant.objects.create(
                conversation=conversation, user=member
            )
        return conversation

    def _get(self, name: str = "accounts:messaging_list_conversations", **params):
        """Zavolá zoznam ako prihlásený používateľ a overí, že odpoveď je 200."""
        response = self.client.get(reverse(name), params)
        assert response.status_code == status.HTTP_200_OK
        return response

    @staticmethod
    def _ids(response) -> list[int]:
        """ID konverzácií v poradí, v akom ich zoznam vrátil."""
        return [item["id"] for item in response.data["results"]]

    def test_first_page_has_twenty_conversations_and_a_next_link(self):
        """Bez parametrov príde prvých 20 konverzácií a odkaz na ďalšiu stránku."""
        created = [self._direct_conversation(index) for index in range(25)]

        response = self._get()

        assert self._ids(response) == [item.id for item in created[:20]]
        assert response.data["next"]

    def test_pages_follow_each_other_without_overlap_and_the_last_has_no_next(self):
        """Druhá stránka nadväzuje na prvú a posledná nemá odkaz na ďalšiu."""
        created = [self._direct_conversation(index) for index in range(25)]

        first = self._get()
        second = self._get(page=2)

        assert self._ids(second) == [item.id for item in created[20:]]
        assert second.data["next"] is None
        assert self._ids(first) + self._ids(second) == [item.id for item in created]

    def test_page_beyond_the_end_is_empty_instead_of_an_error(self):
        """Stránka za koncom (zoznam sa medzitým skrátil) vráti prázdny zoznam, nie chybu."""
        self._direct_conversation(0)

        response = self._get(page=9)

        assert response.data["results"] == []
        assert response.data["next"] is None

    def test_page_size_loads_a_bigger_window_in_one_request(self):
        """`page_size=40` vráti prvých 40 naraz a ďalšiu stránku ponúkne."""
        created = [self._direct_conversation(index) for index in range(45)]

        response = self._get(page=1, page_size=40)

        assert self._ids(response) == [item.id for item in created[:40]]
        assert response.data["next"]

    def test_a_bigger_window_equals_the_batches_it_replaces(self):
        """Okno `page_size=40` je presne prvá a druhá dávka po 20 – obnova nič nepreskočí."""
        for index in range(45):
            self._direct_conversation(index)

        window = self._get(page=1, page_size=40)
        batches = self._ids(self._get(page=1, page_size=20)) + self._ids(
            self._get(page=2, page_size=20)
        )

        assert self._ids(window) == batches

    def test_batch_after_a_window_continues_where_the_window_ended(self):
        """Dávka po 20 za oknom 40 začína na 41. konverzácii."""
        created = [self._direct_conversation(index) for index in range(65)]

        response = self._get(page=3, page_size=20)

        assert self._ids(response)[0] == created[40].id

    def test_page_size_is_capped_at_one_hundred(self):
        """Väčšiu stránku než 100 server skráti, preto frontend okno nad 100 delí na stránky."""
        for index in range(105):
            self._direct_conversation(index)

        response = self._get(page=1, page_size=500)

        assert len(response.data["results"]) == 100
        assert response.data["next"]

    def test_search_is_applied_before_paging(self):
        """Hľadanie filtruje celý zoznam a až potom sa stránkuje."""
        annas = [
            self._create_user(f"anna{index}", first_name="Anna", last_name=f"Č{index}")
            for index in range(25)
        ]
        for index in range(25):
            self._direct_conversation(index)
        matching = [
            self._direct_conversation(100 + index, peer=anna)
            for index, anna in enumerate(annas)
        ]

        first = self._get(search="Anna")
        second = self._get(search="Anna", page=2)

        assert self._ids(first) == [item.id for item in matching[:20]]
        assert self._ids(second) == [item.id for item in matching[20:]]
        assert second.data["next"] is None

    def test_message_requests_are_paged_too(self):
        """Žiadosti o správu sa stránkujú rovnako ako konverzácie."""
        senders = [self._create_user(f"sender{index}") for index in range(25)]
        created = [
            self._incoming_request(index, sender)
            for index, sender in enumerate(senders)
        ]

        first = self._get("accounts:messaging_list_message_requests")
        second = self._get("accounts:messaging_list_message_requests", page=2)

        assert self._ids(first) == [item.id for item in created[:20]]
        assert first.data["next"]
        assert self._ids(second) == [item.id for item in created[20:]]
        assert second.data["next"] is None

    def test_message_requests_stay_out_of_the_conversation_list_while_paging(self):
        """Prichádzajúca žiadosť sa nedostane do zoznamu konverzácií na žiadnej stránke."""
        request = self._incoming_request(0, self._create_user("sender"))
        created = [self._direct_conversation(index + 1) for index in range(21)]

        ids = self._ids(self._get()) + self._ids(self._get(page=2))

        assert request.id not in ids
        assert ids == [item.id for item in created]

    def test_pinned_conversations_come_first_on_the_first_page(self):
        """Pripnutá konverzácia je na začiatku prvej stránky, aj keď je najstaršia."""
        created = [self._direct_conversation(index) for index in range(25)]
        oldest = created[-1]
        ConversationParticipant.objects.filter(
            conversation=oldest, user=self.me
        ).update(pinned_at=timezone.now())

        first = self._get()
        second = self._get(page=2)

        assert self._ids(first)[0] == oldest.id
        assert oldest.id not in self._ids(second)

    def test_query_count_does_not_grow_with_group_members(self):
        """Počet SQL dotazov zoznamu nezávisí od počtu skupín ani ich členov (bez N+1)."""
        members = [self._create_user(f"member{index}") for index in range(6)]
        self._group_conversation(0, members[:2])
        with CaptureQueriesContext(connection) as small:
            small_response = self._get()
        assert len(small_response.data["results"]) == 1

        for age in range(1, 8):
            self._group_conversation(age, members)
        with CaptureQueriesContext(connection) as large:
            large_response = self._get()

        assert len(large_response.data["results"]) == 8
        assert len(large) == len(small)

    def test_group_participants_keep_their_verified_and_deleted_flags(self):
        """Predčítané polia dávajú rovnaký výstup: overený člen a zmazaný (anonymizovaný) člen."""
        verified = self._create_user(
            "verified", first_name="Viera", last_name="Overená"
        )
        gone = self._create_user("gone", first_name="Gabriel", last_name="Zmazaný")
        User.objects.filter(pk=gone.pk).update(is_active=False)
        self._group_conversation(0, [verified, gone])

        response = self._get()

        participants = {
            item["id"]: item for item in response.data["results"][0]["participants"]
        }
        assert participants[verified.id]["is_verified"] is True
        assert participants[verified.id]["is_deleted"] is False
        assert participants[verified.id]["display_name"]
        assert participants[gone.id]["is_deleted"] is True
        assert participants[gone.id]["is_verified"] is False
        assert participants[gone.id]["display_name"] == ""
