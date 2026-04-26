from __future__ import annotations

from django.db.models import Q


def normalize_conversation_search_query(value: str | None) -> str:
    return " ".join((value or "").split())


def apply_conversation_list_search(queryset, search_query: str):
    normalized_query = normalize_conversation_search_query(search_query)
    if not normalized_query:
        return queryset

    for token in normalized_query.split(" "):
        queryset = queryset.filter(
            Q(other_user_first_name__icontains=token)
            | Q(other_user_last_name__icontains=token)
            | Q(other_user_company_name__icontains=token)
            | Q(other_user_username__icontains=token)
        )

    return queryset
