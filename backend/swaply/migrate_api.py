import os
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
    provided = request.GET.get("secret") or request.headers.get("X-Migrate-Secret")
    expected = os.getenv("MIGRATE_SECRET") or getattr(settings, "MIGRATE_SECRET", None)

    if not expected or not provided or provided != expected:
        return JsonResponse({"error": "forbidden"}, status=403)

    try:
        call_command("migrate", interactive=False, verbosity=1)
        return JsonResponse({"status": "ok"})
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=500)

