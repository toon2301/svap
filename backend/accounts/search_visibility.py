"""
Jednotný zdroj pravdy pre viditeľnosť používateľov vo vyhľadávaní.

Vyhľadávanie (verejné aj dashboard) smie zobraziť len používateľov, ktorí sú:
  - aktívni (``is_active``) – neaktívne/anonymizované účty sa nezobrazujú,
  - verejní (``is_public``),
  - nie staff ani superuser – administrátorské účty nie sú „swap partneri".

Pre dashboard search projekciu (``DashboardSkillSearchProjection``) sú tie isté
príznaky denormalizované (``user_is_*``), aby sa zachoval bezjoinový dizajn
hot-path dotazov. Helpery nižšie držia obe varianty na jednom mieste, aby sa
filtrovanie nerozišlo medzi verejným, global a dashboard vyhľadávaním.
"""

from __future__ import annotations

from django.db.models import Q


def searchable_user_q(prefix: str = "", *, include_public: bool = True) -> Q:
    """
    Q filter pre querysety nad ``User`` modelom (priamo alebo cez vzťah).

    ``prefix`` umožňuje filtrovať cez vzťah, napr. ``"user__"`` pre
    ``OfferedSkill.objects.filter(searchable_user_q("user__"))``.

    ``include_public=False`` vynechá podmienku ``is_public`` – využije volajúci,
    ktorý chce ``is_public`` skombinovať s vlastnou OR vetvou (napr. dashboard
    users, kde používateľ vždy vidí svoj vlastný profil aj keď je neverejný).
    """
    filters = {
        f"{prefix}is_active": True,
        f"{prefix}is_staff": False,
        f"{prefix}is_superuser": False,
    }
    if include_public:
        filters[f"{prefix}is_public"] = True
    return Q(**filters)


def searchable_projection_filters() -> dict:
    """Ekvivalent ``searchable_user_q`` pre denormalizovanú projekciu."""
    return {
        "user_is_active": True,
        "user_is_public": True,
        "user_is_staff": False,
        "user_is_superuser": False,
    }
