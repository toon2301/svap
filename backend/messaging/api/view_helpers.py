"""
Spätne kompatibilný re-export messaging view helperov.

Pôvodný veľký súbor bol rozdelený na:
  - ``view_helpers_unread`` – výpočty počtu neprečítaných správ,
  - ``view_helpers_conversations`` – prístup ku konverzáciám, stav účastníka,
    pinned message a anotované querysety.

Všetky verejné helpery ostávajú dostupné cez ``messaging.api.view_helpers`` –
existujúce importy sa nemenia.
"""

from __future__ import annotations

from .view_helpers_conversations import (  # noqa: F401
    _can_open_direct_target,
    _conversation_accessible_queryset_for_user,
    _conversation_annotated_queryset_for_user,
    _conversation_for_user_or_404,
    _conversation_list_queryset_for_user,
    _has_requestable_offers_for_user_id,
    _message_request_list_queryset_for_user,
    _participant_hidden_at_for_conversation,
    _participant_status_for_conversation,
    _peer_last_read_at_for_conversation,
    _pinned_message_for_conversation,
    _serialize_conversation_for_user,
    _serialize_pinned_message,
)
from .view_helpers_unread import (  # noqa: F401
    _conversation_unread_count_expression_for_user,
    _conversation_unread_counts_for_users,
    _conversation_unread_messages_count_for_user,
    _total_unread_counts_for_users,
    _total_unread_messages_count_for_user,
    _total_unread_messages_count_for_user_id,
    unread_payload_for_recipients,
)
