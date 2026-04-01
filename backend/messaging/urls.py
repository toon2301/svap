from django.urls import path

from .api.presence_views import MessagePresenceView
from .api.views import (
    ConversationListView,
    MarkConversationReadView,
    MessageListView,
    OpenConversationView,
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
        "conversations/<int:conversation_id>/read/",
        MarkConversationReadView.as_view(),
        name="messaging_mark_read",
    ),
]

