"""Testy: tabuľka typ upozornenia → kategória a poistka pokrytia (nález 321, etapy 1 a 2).

Každý typ z `NotificationType` patrí do práve jednej z piatich kategórií (pole `notify_*` profilu) alebo je medzi typmi,
ktoré chodia vždy. Nový typ bez rozhodnutia zlyhá v poistnom teste, aby po ňom nezostal upozornenie bez kategórie.
"""

from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model

from accounts.models import NotificationType, UserProfile
from accounts.services.notification_categories import (
    ALWAYS_ON_NOTIFICATION_TYPES,
    NOTIFICATION_TYPE_CATEGORY,
    is_notification_category_enabled,
    notification_category_field,
)
from accounts.services.settings import NOTIFICATION_CATEGORY_FIELDS

User = get_user_model()

# Dohodnuté zaradenie typov (R34 až R36 a R39 (b): aj počiatočná žiadosť o zručnosť). Zámerne je napísané ešte raz, nezávisle od modulu: zámena typu medzi
# kategóriami alebo vypustenie typu by sa inak prezradila až v správaní, nie v tabuľke.
EXPECTED_CATEGORY_TYPES = {
    "notify_likes": {
        "offer_liked",
        "portfolio_liked",
        "profile_liked",
        "feed_post_liked",
    },
    "notify_comment_likes": {"feed_post_comment_liked", "review_liked"},
    "notify_comments": {
        "feed_post_commented",
        "feed_post_comment_replied",
        "review_created",
        "review_reply_created",
    },
    "notify_tags_and_shares": {"feed_post_tagged", "feed_post_shared"},
    "notify_skill_requests": {
        "skill_request",
        "skill_request_accepted",
        "skill_request_rejected",
        "skill_request_completion_requested",
        "skill_request_completed",
        "skill_request_terminated",
        "skill_request_cancelled",
    },
}
EXPECTED_ALWAYS_ON = {"offer_watch_match", "group_invitation"}


def _fresh_user(username, **profile_updates):
    """Vytvorí používateľa s profilom, nastaví dané polia a vráti čerstvú inštanciu (bez starej vyrovnávacej pamäte)."""
    created = User.objects.create_user(
        username=username, email=f"{username}@example.com", password="StrongPass123"
    )
    UserProfile.objects.create(user=created)
    if profile_updates:
        UserProfile.objects.filter(user=created).update(**profile_updates)
    return User.objects.get(pk=created.pk)


def _inverted_table():
    """Tabuľku typ → kategória otočí na kategória → množina typov (ako textové hodnoty)."""
    inverted = {}
    for notif_type, field in NOTIFICATION_TYPE_CATEGORY.items():
        inverted.setdefault(field, set()).add(str(notif_type))
    return inverted


class TestTableCoverage:
    """Poistka: každý typ je zaradený práve raz a zaradenie zodpovedá dohode."""

    def test_every_notification_type_is_classified_exactly_once(self):
        """Každý typ je zaradený práve raz: v tabuľke alebo medzi typmi, ktoré chodia vždy."""
        in_table = {str(t) for t in NOTIFICATION_TYPE_CATEGORY}
        always_on = {str(t) for t in ALWAYS_ON_NOTIFICATION_TYPES}
        all_types = set(NotificationType.values)

        missing = sorted(all_types - in_table - always_on)
        unknown = sorted((in_table | always_on) - all_types)
        both = sorted(in_table & always_on)

        assert not missing, (
            f"Typ upozornenia bez rozhodnutia (pridaj ho do tabuľky kategórií v "
            f"accounts/services/notification_categories.py alebo medzi typy, ktoré chodia vždy): {missing}"
        )
        assert not unknown, f"V tabuľke je typ, ktorý neexistuje: {unknown}"
        assert (
            not both
        ), f"Typ je naraz v tabuľke aj medzi typmi, ktoré chodia vždy: {both}"

    def test_table_matches_the_agreed_mapping(self):
        """Tabuľka zodpovedá dohodnutému zaradeniu typov do kategórií."""
        assert _inverted_table() == EXPECTED_CATEGORY_TYPES
        assert {str(t) for t in ALWAYS_ON_NOTIFICATION_TYPES} == EXPECTED_ALWAYS_ON

    def test_every_category_field_is_a_real_profile_field_with_a_type(self):
        """Každé pole kategórie je skutočné pole profilu a má aspoň jeden typ."""
        used_fields = set(NOTIFICATION_TYPE_CATEGORY.values())

        assert used_fields == set(NOTIFICATION_CATEGORY_FIELDS)
        for name in NOTIFICATION_CATEGORY_FIELDS:
            assert (
                UserProfile._meta.get_field(name).get_internal_type() == "BooleanField"
            )


class TestCategoryField:
    """`notification_category_field` vráti pole kategórie typu alebo None."""

    @pytest.mark.parametrize(
        ("field", "types"), sorted(EXPECTED_CATEGORY_TYPES.items())
    )
    def test_returns_the_category_field_of_its_types(self, field, types):
        """Typy kategórie vrátia jej pole."""
        for notif_type in types:
            assert notification_category_field(notif_type) == field

    @pytest.mark.parametrize("notif_type", sorted(EXPECTED_ALWAYS_ON))
    def test_returns_none_for_types_that_always_arrive(self, notif_type):
        """Typy bez prepínača nemajú pole kategórie."""
        assert notification_category_field(notif_type) is None

    def test_accepts_enum_member_and_plain_value(self):
        """Funkcia prijme člen `NotificationType` aj jeho textovú hodnotu."""
        assert (
            notification_category_field(NotificationType.OFFER_LIKED) == "notify_likes"
        )
        assert notification_category_field("offer_liked") == "notify_likes"

    def test_unknown_type_has_no_category(self):
        """Neznámy typ nemá kategóriu."""
        assert notification_category_field("not_a_real_type") is None


@pytest.mark.django_db
class TestIsNotificationCategoryEnabled:
    """`is_notification_category_enabled(user, typ)` podľa profilu používateľa."""

    def test_everything_is_enabled_for_a_new_profile(self):
        """Nový profil má zapnutý každý typ upozornenia."""
        user = _fresh_user("cat-all-on")

        for notif_type in NotificationType.values:
            assert is_notification_category_enabled(user, notif_type) is True

    @pytest.mark.parametrize(
        ("field", "types"), sorted(EXPECTED_CATEGORY_TYPES.items())
    )
    def test_disabled_category_affects_only_its_own_types(self, field, types):
        """Vypnutá kategória vypne len svoje typy, všetky ostatné ostanú zapnuté."""
        user = _fresh_user(f"cat-off-{field}", **{field: False})

        for notif_type in NotificationType.values:
            expected = notif_type not in types
            assert (
                is_notification_category_enabled(user, notif_type) is expected
            ), f"{notif_type} pri vypnutej kategórii {field}"

    @pytest.mark.parametrize("notif_type", sorted(EXPECTED_ALWAYS_ON))
    def test_types_without_a_switch_arrive_even_with_every_category_off(
        self, notif_type
    ):
        """Typy bez prepínača chodia aj pri všetkých kategóriách vypnutých."""
        user = _fresh_user(
            "cat-all-off", **dict.fromkeys(NOTIFICATION_CATEGORY_FIELDS, False)
        )

        assert is_notification_category_enabled(user, notif_type) is True

    def test_accepts_enum_member_and_plain_value(self):
        """Typ sa dá zadať ako člen `NotificationType` aj ako text."""
        user = _fresh_user("cat-enum", notify_likes=False)

        assert (
            is_notification_category_enabled(user, NotificationType.OFFER_LIKED)
            is False
        )
        assert is_notification_category_enabled(user, "offer_liked") is False

    def test_unknown_type_is_enabled(self):
        """Neznámy typ sa berie ako zapnutý."""
        user = _fresh_user(
            "cat-unknown", **dict.fromkeys(NOTIFICATION_CATEGORY_FIELDS, False)
        )

        assert is_notification_category_enabled(user, "not_a_real_type") is True

    def test_missing_profile_means_enabled(self):
        """Chýbajúci profil znamená zapnuté."""
        user = User.objects.create_user(
            username="cat-noprofile",
            email="cat-noprofile@example.com",
            password="StrongPass123",
        )
        assert not UserProfile.objects.filter(user=user).exists()

        assert (
            is_notification_category_enabled(user, NotificationType.OFFER_LIKED) is True
        )

    def test_profile_read_error_means_enabled(self):
        """Chyba pri čítaní profilu znamená zapnuté."""

        class BrokenUser:
            """Používateľ, ktorého profil sa nedá prečítať."""

            @property
            def profile(self):
                """Čítanie vždy zlyhá, akoby databáza nebola dostupná."""
                raise RuntimeError("databáza nedostupná")

        assert (
            is_notification_category_enabled(BrokenUser(), NotificationType.OFFER_LIKED)
            is True
        )

    def test_profile_without_the_field_means_enabled(self):
        """Profil bez poľa kategórie znamená zapnuté."""
        user_without_field = SimpleNamespace(profile=SimpleNamespace())

        assert (
            is_notification_category_enabled(
                user_without_field, NotificationType.OFFER_LIKED
            )
            is True
        )
