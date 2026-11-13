"""Testy: kontrola kategórie pri vytváraní upozornení (nález 321, etapy 1 a 2, commit 4).

`create_notification` po hlavnom vypínači `in_app_notifications` skontroluje aj kategóriu typu: pri vypnutej
kategórii sa upozornenie vôbec neuloží (rovnako ako pri vypnutom hlavnom vypínači), ostatné kategórie ani typy bez
prepínača to neovplyvní a profil sa číta jediným dopytom.
"""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext

from accounts.models import (
    Notification,
    NotificationType,
    OfferedSkill,
    Review,
    SkillRequest,
    UserProfile,
)
from accounts.services.notifications import (
    create_notification,
    create_offer_liked_notification,
    create_offer_watch_match_notification,
    create_review_created_notification,
    create_skill_request_accepted_notification,
    create_skill_request_notification,
)

User = get_user_model()

# Dohodnuté zaradenie typov (R34 až R36 a R39 (b)), napísané ešte raz nezávisle od modulu s tabuľkou. Počiatočná žiadosť
# o zručnosť (`skill_request`) patrí do kategórie `notify_skill_requests`: `create_notification` ju pri vypnutej
# kategórii potlačí ako každý iný typ a `create_skill_request_notification` ju vytvorí ako prečítanú.
CATEGORY_OF_TYPE = {
    "offer_liked": "notify_likes",
    "portfolio_liked": "notify_likes",
    "profile_liked": "notify_likes",
    "feed_post_liked": "notify_likes",
    "feed_post_comment_liked": "notify_comment_likes",
    "review_liked": "notify_comment_likes",
    "feed_post_commented": "notify_comments",
    "feed_post_comment_replied": "notify_comments",
    "review_created": "notify_comments",
    "review_reply_created": "notify_comments",
    "feed_post_tagged": "notify_tags_and_shares",
    "feed_post_shared": "notify_tags_and_shares",
    "skill_request": "notify_skill_requests",
    "skill_request_accepted": "notify_skill_requests",
    "skill_request_rejected": "notify_skill_requests",
    "skill_request_completion_requested": "notify_skill_requests",
    "skill_request_completed": "notify_skill_requests",
    "skill_request_terminated": "notify_skill_requests",
    "skill_request_cancelled": "notify_skill_requests",
}
ALWAYS_ON_TYPES = ("offer_watch_match", "group_invitation")
CATEGORY_FIELDS = tuple(sorted(set(CATEGORY_OF_TYPE.values())))
ALL_TYPES = (*CATEGORY_OF_TYPE, *ALWAYS_ON_TYPES)

ALL_OFF = dict.fromkeys(CATEGORY_FIELDS, False)


def _user(username, *, profile=True, **profile_updates):
    """Vytvorí používateľa (podľa potreby s profilom), nastaví polia profilu a vráti čerstvú inštanciu.

    Čerstvá inštancia nemá v pamäti uložený profil, takže ho `create_notification` načíta z databázy.
    """
    created = User.objects.create_user(
        username=username, email=f"{username}@example.com", password="StrongPass123"
    )
    if profile:
        UserProfile.objects.create(user=created, **profile_updates)
    return User.objects.get(pk=created.pk)


def _send(recipient, notif_type, actor):
    """Zavolá `create_notification` s daným typom."""
    return create_notification(
        user=recipient, notif_type=notif_type, title="Test", body="", actor=actor
    )


def _count(recipient, notif_type=None):
    """Počet uložených upozornení príjemcu (voliteľne len daného typu)."""
    queryset = Notification.objects.filter(user=recipient)
    if notif_type is not None:
        queryset = queryset.filter(type=notif_type)
    return queryset.count()


@pytest.fixture
def actor(db):
    """Používateľ, od ktorého upozornenia pochádzajú."""
    return User.objects.create_user(
        username="gate-actor", email="gate-actor@example.com", password="StrongPass123"
    )


@pytest.mark.django_db
class TestCategoryGate:
    """Vypnutá kategória potlačí len upozornenia svojich typov."""

    @pytest.mark.parametrize(("notif_type", "field"), sorted(CATEGORY_OF_TYPE.items()))
    def test_disabled_category_suppresses_its_types(self, actor, notif_type, field):
        """Pri vypnutej kategórii sa upozornenie jej typu vôbec neuloží."""
        recipient = _user(f"gate-off-{notif_type}", **{field: False})

        result = _send(recipient, notif_type, actor)

        assert result is None
        assert _count(recipient) == 0

    @pytest.mark.parametrize(("notif_type", "field"), sorted(CATEGORY_OF_TYPE.items()))
    def test_enabled_category_creates_even_when_every_other_category_is_off(
        self, actor, notif_type, field
    ):
        """Pri zapnutej kategórii sa upozornenie uloží, aj keď sú všetky ostatné vypnuté."""
        updates = {**ALL_OFF, field: True}
        recipient = _user(f"gate-on-{notif_type}", **updates)

        result = _send(recipient, notif_type, actor)

        assert result is not None
        assert _count(recipient, notif_type) == 1

    @pytest.mark.parametrize("field", CATEGORY_FIELDS)
    def test_other_categories_and_types_without_a_switch_are_not_affected(
        self, actor, field
    ):
        """Vypnutie jednej kategórie nezastaví typy ostatných kategórií ani typy bez prepínača."""
        recipient = _user(f"gate-only-{field}", **{field: False})
        unaffected = [
            notif_type
            for notif_type in ALL_TYPES
            if CATEGORY_OF_TYPE.get(notif_type) != field
        ]

        for notif_type in unaffected:
            assert _send(recipient, notif_type, actor) is not None, notif_type

        assert _count(recipient) == len(unaffected)

    @pytest.mark.parametrize("notif_type", ALWAYS_ON_TYPES)
    def test_types_without_a_switch_arrive_with_every_category_off(
        self, actor, notif_type
    ):
        """Typy bez prepínača chodia pri všetkých kategóriách vypnutých."""
        recipient = _user(f"gate-always-{notif_type}", **ALL_OFF)

        result = _send(recipient, notif_type, actor)

        assert result is not None
        assert _count(recipient, notif_type) == 1

    def test_default_profile_receives_every_type(self, actor):
        """Predvolený profil dostane všetky typy upozornení."""
        recipient = _user("gate-default")

        for notif_type in ALL_TYPES:
            assert _send(recipient, notif_type, actor) is not None, notif_type

        assert _count(recipient) == len(ALL_TYPES)

    def test_user_without_a_profile_receives_every_type(self, actor):
        """Používateľ bez profilu dostane všetky typy (chýbajúci profil nič neblokuje)."""
        recipient = _user("gate-noprofile", profile=False)

        for notif_type in ALL_TYPES:
            assert _send(recipient, notif_type, actor) is not None, notif_type

        assert _count(recipient) == len(ALL_TYPES)


@pytest.mark.django_db
class TestMainSwitch:
    """Hlavný vypínač `in_app_notifications` ostáva a potlačí všetko, čo ide cez `create_notification`."""

    @pytest.mark.parametrize("notif_type", ALL_TYPES)
    def test_main_switch_off_suppresses_even_with_every_category_on(
        self, actor, notif_type
    ):
        """Vypnutý hlavný vypínač potlačí každý typ, aj keď sú kategórie zapnuté."""
        recipient = _user(f"gate-main-{notif_type}", in_app_notifications=False)

        result = _send(recipient, notif_type, actor)

        assert result is None
        assert _count(recipient) == 0

    def test_initial_skill_request_is_created_read_with_everything_off(self, actor):
        """Počiatočná žiadosť o zručnosť sa pri vypnutom hlavnom vypínači aj kategóriách vytvorí, ale ako prečítaná.

        R39 (b), nález 330: žiadosť sa doručí (upozornenie existuje), no nesvieti odznak pri Žiadostiach.
        """
        recipient = _user("gate-initial-owner", in_app_notifications=False, **ALL_OFF)
        offer = OfferedSkill.objects.create(
            user=recipient, category="IT", subcategory="Web"
        )
        skill_request = SkillRequest.objects.create(
            requester=actor, recipient=recipient, offer=offer
        )

        result = create_skill_request_notification(
            skill_request=skill_request, actor=actor
        )

        assert result is not None
        assert _count(recipient, NotificationType.SKILL_REQUEST) == 1
        assert result.is_read is True
        assert result.read_at is not None


@pytest.mark.django_db
class TestProfileIsReadOnce:
    """Hlavný vypínač a kategória spolu načítajú profil jediným dopytom."""

    @staticmethod
    def _profile_selects(recipient, actor, notif_type):
        """Zavolá `create_notification` a vráti dopyty SELECT na tabuľku profilov."""
        with CaptureQueriesContext(connection) as queries:
            _send(recipient, notif_type, actor)
        return [
            q["sql"]
            for q in queries.captured_queries
            if q["sql"].lstrip().upper().startswith("SELECT")
            and "accounts_userprofile" in q["sql"]
        ]

    @pytest.mark.parametrize(
        ("case", "profile", "updates"),
        [
            ("category-on", True, {}),
            ("category-off", True, {"notify_likes": False}),
            ("main-switch-off", True, {"in_app_notifications": False}),
            ("no-profile", False, {}),
        ],
    )
    def test_profile_is_selected_once(self, actor, case, profile, updates):
        """Profil sa pri vytváraní upozornenia načíta jediným dopytom."""
        recipient = _user(f"gate-once-{case}", profile=profile, **updates)

        selects = self._profile_selects(recipient, actor, NotificationType.OFFER_LIKED)

        assert len(selects) == 1, (case, selects)


@pytest.mark.django_db
class TestRealEventsRespectCategories:
    """Skutočné udalosti upozornení prejdú tou istou kontrolou kategórie."""

    @staticmethod
    def _offer(owner):
        """Vytvorí ponuku daného vlastníka."""
        return OfferedSkill.objects.create(user=owner, category="IT", subcategory="Web")

    def test_offer_liked_follows_notify_likes(self, actor):
        """Lajk ponuky sa riadi kategóriou `notify_likes`."""
        off = _user("gate-ev-likes-off", notify_likes=False)
        on = _user("gate-ev-likes-on", **{**ALL_OFF, "notify_likes": True})

        assert (
            create_offer_liked_notification(offer=self._offer(off), actor=actor) is None
        )
        assert (
            create_offer_liked_notification(offer=self._offer(on), actor=actor)
            is not None
        )
        assert _count(off) == 0
        assert _count(on, NotificationType.OFFER_LIKED) == 1

    def test_review_created_follows_notify_comments(self, actor):
        """Nová recenzia sa riadi kategóriou `notify_comments`."""
        off = _user("gate-ev-comments-off", notify_comments=False)
        on = _user("gate-ev-comments-on", **{**ALL_OFF, "notify_comments": True})

        def review_of(owner):
            """Vytvorí recenziu od `actor` na ponuku daného vlastníka."""
            offer = self._offer(owner)
            return Review.objects.create(
                reviewer=actor, offer=offer, rating=Decimal("4.0"), text="ok"
            )

        assert (
            create_review_created_notification(review=review_of(off), actor=actor)
            is None
        )
        assert (
            create_review_created_notification(review=review_of(on), actor=actor)
            is not None
        )
        assert _count(off) == 0
        assert _count(on, NotificationType.REVIEW_CREATED) == 1

    def test_skill_request_accepted_follows_notify_skill_requests(self, actor):
        """Prijatie žiadosti sa riadi kategóriou `notify_skill_requests`."""
        owner = _user("gate-ev-owner")
        off = _user("gate-ev-requests-off", notify_skill_requests=False)
        on = _user("gate-ev-requests-on", **{**ALL_OFF, "notify_skill_requests": True})
        offer = self._offer(owner)

        def accepted_for(requester):
            """Vytvorí žiadosť od daného žiadateľa a vráti výsledok upozornenia o jej prijatí."""
            skill_request = SkillRequest.objects.create(
                requester=requester, recipient=owner, offer=offer
            )
            return create_skill_request_accepted_notification(
                skill_request=skill_request, actor=owner
            )

        assert accepted_for(off) is None
        assert accepted_for(on) is not None
        assert _count(off) == 0
        assert _count(on, NotificationType.SKILL_REQUEST_ACCEPTED) == 1

    def test_offer_watch_match_arrives_with_every_category_off(self, actor):
        """Zhoda sledovania chodí pri všetkých kategóriách vypnutých."""
        recipient = _user("gate-ev-watch", **ALL_OFF)
        offer = self._offer(actor)

        result = create_offer_watch_match_notification(user=recipient, offer=offer)

        assert result is not None
        assert _count(recipient, NotificationType.OFFER_WATCH_MATCH) == 1
