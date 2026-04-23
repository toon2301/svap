from django.urls import path

from .api.presence_views import MessagePresenceView
from .api.views import (
    ConversationListView,
    DeleteMessageView,
    HideConversationView,
    MarkConversationReadView,
    MessageImageView,
    MessageListView,
    OpenConversationView,
    PinMessageView,
    SendMessageView,
    StartDirectMessageView,
    UnreadMessagesSummaryView,
)

urlpatterns = [
    path("conversations/open/", OpenConversationView.as_view(), name="messaging_open"),
    path(
        "conversations/unread-summary/",
        UnreadMessagesSummaryView.as_view(),
        name="messaging_unread_summary",
    ),
    path(
        "conversations/direct/send/",
        StartDirectMessageView.as_view(),
        name="messaging_send_direct_message",
    ),
    path("conversations/", ConversationListView.as_view(), name="messaging_list_conversations"),
    path("presence/", MessagePresenceView.as_view(), name="messaging_presence"),
    path(
        "conversations/<int:conversation_id>/messages/",
        MessageListView.as_view(),
        name="messaging_list_messages",
    ),
    path(
        "conversations/<int:conversation_id>/messages/send/",
        SendMessageView.as_view(),
        name="messaging_send_message",
    ),
    path(
        "conversations/<int:conversation_id>/messages/<int:message_id>/image/",
        MessageImageView.as_view(),
        name="messaging_message_image",
    ),
    path(
        "conversations/<int:conversation_id>/messages/<int:message_id>/delete/",
        DeleteMessageView.as_view(),
        name="messaging_delete_message",
    ),
    path(
        "conversations/<int:conversation_id>/pin/",
        PinMessageView.as_view(),
        name="messaging_pin_message",
    ),
    path(
        "conversations/<int:conversation_id>/read/",
        MarkConversationReadView.as_view(),
        name="messaging_mark_read",
    ),
    path(
        "conversations/<int:conversation_id>/hide/",
        HideConversationView.as_view(),
        name="messaging_hide_conversation",
    ),
]

