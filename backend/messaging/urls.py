from django.urls import path

from .api.views import (
    ConversationListView,
    MarkConversationReadView,
    MessageListView,
    OpenConversationView,
    SendMessageView,
)

urlpatterns = [
    path("conversations/open/", OpenConversationView.as_view(), name="messaging_open"),
    path("conversations/", ConversationListView.as_view(), name="messaging_list_conversations"),
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

