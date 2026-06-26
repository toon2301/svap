"""
BOD 4: ConversationListItemSerializer.get_avatar_url.

Pre skupiny vracia None (avatar sa skladá z členov na klientovi). Pre priame (1:1)
konverzácie vracia avatar protistrany – z rovnakého zdroja ako other_user, takže
sa korektne ošetria aj anonymizované účty (None) a 1:1 bez avatara (None).
"""

from __future__ import annotations

from types import SimpleNamespace

from messaging.api.conversation_serializers import ConversationListItemSerializer


def _serializer():
    return ConversationListItemSerializer(context={"request": None})


def _direct_obj(**overrides):
    base = dict(
        is_group=False,
        other_user_id=42,
        other_user_is_active=True,
        other_user_avatar_name="avatars/u2.jpg",
        other_user_type="individual",
        other_user_first_name="Jane",
        other_user_last_name="Doe",
        other_user_company_name="",
        other_user_username="jane",
        other_user_slug="jane",
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def test_group_conversation_avatar_url_is_none():
    obj = SimpleNamespace(is_group=True)
    assert _serializer().get_avatar_url(obj) is None


def test_direct_conversation_returns_other_user_avatar():
    serializer = _serializer()
    obj = _direct_obj()

    url = serializer.get_avatar_url(obj)

    assert url is not None
    assert "avatars/u2.jpg" in url
    # Konzistentné s other_user.avatar_url (rovnaký zdroj, žiadna divergencia).
    assert url == serializer.get_other_user(obj)["avatar_url"]


def test_direct_conversation_without_avatar_returns_none():
    obj = _direct_obj(other_user_avatar_name=None)
    assert _serializer().get_avatar_url(obj) is None


def test_direct_conversation_with_anonymized_other_user_returns_none():
    obj = _direct_obj(other_user_is_active=False)
    assert _serializer().get_avatar_url(obj) is None
