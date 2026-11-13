"""Testy: odznak pri Žiadostiach pri vypnutej kategórii alebo hlavnom vypínači (nález 330, rozhodnutie R39 (b)).

Nová žiadosť o zručnosť príde príjemcovi vždy: je v jeho Žiadostiach. Ak má však vypnutý hlavný vypínač
`in_app_notifications` alebo kategóriu `notify_skill_requests`, upozornenie na ňu sa vytvorí už prečítané, takže sa
nepočíta do odznaku pri Žiadostiach (`unread-count?type=skill_request`, `unread_skill_request_count` v `/api/auth/me/`
ani počet v realtime udalosti `skill_request`). Pri oboch zapnutých ostáva správanie ako doteraz.
"""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from accounts.models import (
    Notification,
    NotificationType,
    OfferedSkill,
    SkillRequest,
    UserProfile,
)
from accounts.services.notifications import create_skill_request_notification

User = get_user_model()

API = "/api/auth"

# Nastavenia príjemcu, pri ktorých sa odznak nemá rozsvietiť.
MUTED_PROFILES = {
    "kategória vypnutá": {"notify_skill_requests": False},
    "hlavný vypínač vypnutý": {"in_app_notifications": False},
    "oboje vypnuté": {"in_app_notifications": False, "notify_skill_requests": False},
}


@pytest.fixture(autouse=True)
def _clean_cache():
    """Vyčistí vyrovnávaciu pamäť, aby počty neprečítaných z iného testu nepresiahli do tohto."""
    cache.clear()
    yield
    cache.clear()


def _user(username, *, profile=True, **profile_updates):
    """Vytvorí overeného používateľa (podľa potreby s profilom s danými hodnotami) a vráti čerstvú inštanciu."""
    created = User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="StrongPass123",
        is_verified=True,
    )
    if profile:
        UserProfile.objects.create(user=created, **profile_updates)
    return User.objects.get(pk=created.pk)


def _client(user):
    """Prihlásený klient API pre daného používateľa."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _offer(owner):
    """Vytvorí ponuku daného vlastníka."""
    return OfferedSkill.objects.create(user=owner, category="IT", subcategory="Web")


def _send_request(requester, offer):
    """Žiadateľ pošle cez API žiadosť o kartu a vráti odpoveď (očakáva sa 201).

    Funkcie naplánované na potvrdenie transakcie (prepočet odznaku a realtime udalosť) sa vykonajú ako v produkcii.
    """
    with TestCase.captureOnCommitCallbacks(execute=True):
        response = _client(requester).post(
            f"{API}/skill-requests/", {"offer_id": offer.id}, format="json"
        )
    assert response.status_code == 201
    return response


def _badge_counts(owner):
    """Vráti počet pre odznak pri Žiadostiach z oboch zdrojov: `unread-count` a `/api/auth/me/` (musia sa zhodovať)."""
    client = _client(owner)
    unread = client.get(f"{API}/notifications/unread-count/", {"type": "skill_request"})
    me = client.get(f"{API}/me/")
    assert unread.status_code == 200
    assert me.status_code == 200
    return unread.data["count"], me.data["unread_skill_request_count"]


@pytest.mark.django_db
class TestMutedSkillRequestBadge:
    """Nová žiadosť pri vypnutej kategórii alebo hlavnom vypínači sa doručí, no odznak sa nerozsvieti."""

    @pytest.mark.parametrize("case", sorted(MUTED_PROFILES))
    def test_request_is_delivered_without_lighting_the_badge(self, case):
        """Žiadosť je v zozname príjemcu, upozornenie je prečítané a odznak ostáva 0 (unread-count aj /me/)."""
        owner = _user("owner", **MUTED_PROFILES[case])
        requester = _user("requester")

        response = _send_request(requester, _offer(owner))

        received = _client(owner).get(f"{API}/skill-requests/").data["received"]
        assert [item["id"] for item in received] == [response.data["id"]]
        notification = Notification.objects.get(
            user=owner, type=NotificationType.SKILL_REQUEST
        )
        assert notification.is_read is True
        assert notification.read_at is not None
        assert _badge_counts(owner) == (0, 0), case

    def test_request_with_both_switches_on_lights_the_badge(self):
        """Pri zapnutom hlavnom vypínači aj kategórii ostáva správanie ako doteraz: odznak ukáže 1."""
        owner = _user("owner")

        _send_request(_user("requester"), _offer(owner))

        notification = Notification.objects.get(
            user=owner, type=NotificationType.SKILL_REQUEST
        )
        assert notification.is_read is False
        assert notification.read_at is None
        assert _badge_counts(owner) == (1, 1)

    def test_owner_without_a_profile_gets_the_badge(self):
        """Príjemca bez profilu (chýbajúci profil nič nevypína) dostane odznak ako doteraz."""
        owner = _user("owner", profile=False)

        _send_request(_user("requester"), _offer(owner))

        assert _badge_counts(owner) == (1, 1)

    def test_request_received_while_muted_is_not_counted_after_turning_it_back_on(self):
        """Žiadosť, ktorá prišla počas vypnutia, odznak nerozsvieti ani po zapnutí; nová žiadosť áno."""
        owner = _user("owner", notify_skill_requests=False)
        offer = _offer(owner)

        _send_request(_user("requester-one"), offer)
        assert _badge_counts(owner) == (0, 0)

        UserProfile.objects.filter(user=owner).update(notify_skill_requests=True)
        assert _badge_counts(owner) == (0, 0)

        _send_request(_user("requester-two"), offer)
        assert _badge_counts(owner) == (1, 1)

    def test_turning_the_category_off_again_does_not_add_to_the_badge(self):
        """Po opätovnom vypnutí kategórie ďalšia žiadosť počet neprečítaných nezvýši."""
        owner = _user("owner")
        offer = _offer(owner)

        _send_request(_user("requester-one"), offer)
        UserProfile.objects.filter(user=owner).update(notify_skill_requests=False)
        _send_request(_user("requester-two"), offer)

        assert _badge_counts(owner) == (1, 1)
        assert (
            Notification.objects.filter(
                user=owner, type=NotificationType.SKILL_REQUEST
            ).count()
            == 2
        )

    def test_realtime_event_is_still_sent_with_the_unchanged_count(self):
        """Udalosť `skill_request` sa pošle ako doteraz: pri tichej žiadosti s počtom 0, pri bežnej s počtom 1."""
        muted_owner = _user("muted-owner", notify_skill_requests=False)
        loud_owner = _user("loud-owner")

        with patch("accounts.services.notification_core.notify_user") as notify:
            _send_request(_user("requester-one"), _offer(muted_owner))
            _send_request(_user("requester-two"), _offer(loud_owner))

        events = {call.args[0]: call.args[1] for call in notify.call_args_list}
        assert events[muted_owner.id]["type"] == "skill_request"
        assert events[muted_owner.id]["unread_count"] == 0
        assert events[loud_owner.id]["type"] == "skill_request"
        assert events[loud_owner.id]["unread_count"] == 1


@pytest.mark.django_db
class TestProfileIsReadOnce:
    """Hlavný vypínač a kategória spolu načítajú profil príjemcu jediným dopytom."""

    @pytest.mark.parametrize(
        ("case", "profile", "updates"),
        [
            ("both-on", True, {}),
            ("category-off", True, {"notify_skill_requests": False}),
            ("main-switch-off", True, {"in_app_notifications": False}),
            ("no-profile", False, {}),
        ],
    )
    def test_profile_is_selected_once(self, case, profile, updates):
        """Pri vytváraní počiatočného upozornenia sa profil príjemcu načíta jediným dopytom."""
        owner = _user("owner", profile=profile, **updates)
        requester = _user("requester")
        skill_request = SkillRequest.objects.create(
            requester=requester, recipient=owner, offer=_offer(owner)
        )

        with CaptureQueriesContext(connection) as queries:
            create_skill_request_notification(
                skill_request=skill_request, actor=requester
            )

        selects = [
            q["sql"]
            for q in queries.captured_queries
            if q["sql"].lstrip().upper().startswith("SELECT")
            and "accounts_userprofile" in q["sql"]
        ]
        assert len(selects) == 1, (case, selects)
