"""Fáza 4.2 – čítanie trendu návštev VLASTNÉHO profilu (len backend endpoint)."""

from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ...models import ProfileVisit

# Trend okno: presne PROFILE_VISITS_TREND_DAYS kalendárnych dní vrátane dneška
# (dnes + predchádzajúcich 89 → PROFILE_VISITS_TREND_DAYS položiek v `daily`).
# Zarovnané s retenciou (PROFILE_VISIT_RETENTION_DAYS = 90 podľa created_at): 90-dňové
# okno leží celé vnútri retenčného okna, takže najstarší deň (dnes − 89) nie je
# čiastočne premazaný nočným purge behom. visit_date je lokálny deň
# (Europe/Bratislava), naplnený pri zápise cez timezone.localdate().
PROFILE_VISITS_TREND_DAYS = 90


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_profile_visits_trend_view(request):
    """
    Trend návštev VLASTNÉHO profilu za posledných ``PROFILE_VISITS_TREND_DAYS`` dní.

    Vždy len ``request.user`` (žiadny ``user_id`` parameter) → sú to výhradne
    vlastné štatistiky, takže tu NEtreba ``_enforce_public_or_owner``/blokovanie
    (to rieši len čítanie CUDZIEHO profilu). Nedá sa vyžiadať dáta iného
    používateľa.

    Denný ``count`` = počet UNIKÁTNYCH návštevníkov za daný deň. Keďže
    ``ProfileVisit`` má unique(profile_user, viewer, visit_date), platí
    ``Count("viewer", distinct=True) == Count("id")`` (1 riadok = 1 unikátna
    návšteva za deň) – ``distinct=True`` používame zámerne, aby bol význam
    "unikátni návštevníci" čitateľný priamo z kódu.

    Dni bez návštevy ORM group-by preskočí → doplníme ich s ``count=0`` v Pythone,
    aby FE dostal súvislý rad (jednoduchý na vykreslenie grafu).
    """
    today = timezone.localdate()
    # 90 kompletných dní vrátane dneška → najstarší deň je today − 89.
    start_date = today - timedelta(days=PROFILE_VISITS_TREND_DAYS - 1)

    rows = (
        ProfileVisit.objects.filter(
            profile_user=request.user,
            visit_date__gte=start_date,
        )
        .values("visit_date")
        .annotate(count=Count("viewer", distinct=True))
        .order_by("visit_date")
    )
    counts_by_date = {row["visit_date"]: row["count"] for row in rows}

    # Súvislý rad start_date..today (vrátane oboch hraníc) – chýbajúce dni na 0.
    daily = []
    total = 0
    for offset in range(PROFILE_VISITS_TREND_DAYS):
        day = start_date + timedelta(days=offset)
        count = int(counts_by_date.get(day, 0))
        total += count
        daily.append({"date": day.isoformat(), "count": count})

    return Response(
        {
            "total_visits_90d": total,
            "daily": daily,
        },
        status=status.HTTP_200_OK,
    )
