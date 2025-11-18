import os
import hmac
from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.core.management import call_command


@api_view(["POST", "GET"])
@permission_classes([AllowAny])
def run_migrations_view(request):
    """
    Spustí Django migrácie, ak je zaslaný správny tajný kľúč.
    Použi len dočasne na Railway, kde nie je konzola.
    Nastav MIGRATE_SECRET v env a zavolaj /api/admin/init-db/?secret=... iba raz.
    """
    # Bezpečnostné sprísnenie: endpoint je štandardne vypnutý (zapni MIGRATIONS_API_ENABLED=1)
    enabled = os.getenv("MIGRATIONS_API_ENABLED", "0").lower() in {"1", "true", "yes", "on"}
    if not enabled and not getattr(settings, "DEBUG", False):
        return JsonResponse({"error": "forbidden"}, status=403)

    # Preferuj tajomstvo v hlavičke; query param povol len v DEBUG (kvôli logom/proxy)
    header_secret = request.headers.get("X-Migrate-Secret")
    query_secret = request.GET.get("secret")
    provided = header_secret or (query_secret if getattr(settings, "DEBUG", False) else None)
    expected = os.getenv("MIGRATE_SECRET") or getattr(settings, "MIGRATE_SECRET", None)

    if not expected or not provided or not hmac.compare_digest(provided, expected):
        return JsonResponse({"error": "forbidden"}, status=403)

    try:
        # Bezpečnostné sprísnenie: preferuj POST; GET povoľ len v DEBUG režime
        if request.method == "GET" and not getattr(settings, "DEBUG", False):
            return JsonResponse({"error": "method_not_allowed"}, status=405)

        # Spusti robustný init príkaz (obsahuje kontrolu a re-aplikáciu accounts migrácií)
        call_command("init_db")
        return JsonResponse({"status": "ok"})
    except Exception as exc:
        # Neodhaľuj interné detaily mimo DEBUG
        if getattr(settings, "DEBUG", False):
            return JsonResponse({"error": str(exc)}, status=500)
        return JsonResponse({"error": "migration_failed"}, status=500)

