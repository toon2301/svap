"""Agregácie pre dashboard štatistiky prihláseného používateľa.

Všetko cez ``aggregate``/``count`` (žiadne loopy → žiadny N+1). Volané raz na
request pri načítaní dashboardu; pri súčasnej škále bez cache (viď audit).
"""

from django.db.models import Avg, Count, Q

from ...models import (
    OfferedSkill,
    ProfileLike,
    Review,
    SkillRequest,
    SkillRequestStatus,
    exclude_block_terminated_requests,
)

# Neterminálne (aktívne) stavy výmeny.
ACTIVE_SKILL_REQUEST_STATUSES = (
    SkillRequestStatus.PENDING,
    SkillRequestStatus.ACCEPTED,
    SkillRequestStatus.COMPLETION_REQUESTED,
)


def _as_participant(user):
    """Používateľ vystupuje vo výmene ako ktorákoľvek strana."""
    return Q(requester=user) | Q(recipient=user)


def skills_count(user) -> int:
    """Počet ponúk používateľa – konzistentne s vlastným zoznamom ponúk
    (skills_list_view ráta všetky OfferedSkill user=..., bez is_hidden filtra;
    is_hidden ovplyvňuje len viditeľnosť v search / na cudzích profiloch)."""
    return OfferedSkill.objects.filter(user=user).count()


def active_exchanges_count(user) -> int:
    """Aktívne výmeny (PENDING/ACCEPTED/COMPLETION_REQUESTED), user ako ktorákoľvek strana."""
    return SkillRequest.objects.filter(
        _as_participant(user),
        status__in=ACTIVE_SKILL_REQUEST_STATUSES,
    ).count()


def completed_exchanges_count(user) -> int:
    """Dokončené výmeny (COMPLETED), user ako ktorákoľvek strana."""
    return SkillRequest.objects.filter(
        _as_participant(user),
        status=SkillRequestStatus.COMPLETED,
    ).count()


def profile_completion_rate(user):
    """Podiel dokončených výmen z ukončených: completed / (completed + terminated).

    Blokom spôsobené TERMINATED (INTERACTION_UNAVAILABLE) sa nezapočítavajú –
    neboli reálnym neúspechom používateľa. Vracia float 0..1, alebo None keď zatiaľ
    žiadne ukončené výmeny neexistujú (FE vie zobraziť "—" namiesto 0 %).
    """
    qs = SkillRequest.objects.filter(
        _as_participant(user),
        status__in=(SkillRequestStatus.COMPLETED, SkillRequestStatus.TERMINATED),
    )
    qs = exclude_block_terminated_requests(qs)
    agg = qs.aggregate(
        completed=Count("id", filter=Q(status=SkillRequestStatus.COMPLETED)),
        total=Count("id"),
    )
    total = agg["total"]
    return (agg["completed"] / total) if total else None


def average_rating(user):
    """User-level priemer hodnotení cez ``reviewed_user`` (nie cez offer, ktorý
    môže byť None po zmazaní ponuky). None keď žiadne recenzie neexistujú."""
    avg = Review.objects.filter(reviewed_user=user).aggregate(avg=Avg("rating"))["avg"]
    return round(float(avg), 2) if avg is not None else None


def profile_likes_count(user) -> int:
    """Počet lajkov profilu používateľa (rovnaká hodnota ako v dashboard_profile_view)."""
    return ProfileLike.objects.filter(profile_user=user).count()
