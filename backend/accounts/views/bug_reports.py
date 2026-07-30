"""Authenticated POST-only API for reporting technical application bugs."""

from __future__ import annotations

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import bug_report_rate_limit

from ..bug_report_serializers import BugReportCreateSerializer
from ..models import BugReport, BugReportPriority, BugReportStatus
from ..services.bug_reports import schedule_bug_report_notification


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@bug_report_rate_limit
def bug_report_create_view(request):
    """Create one independent report without exposing moderation fields."""

    serializer = BugReportCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    with transaction.atomic():
        report = BugReport.objects.create(
            reported_by=request.user,
            category=payload["category"],
            title=payload["title"],
            description=payload["description"],
            reproduction_steps=payload["reproduction_steps"],
            source_screen=payload["source_screen"],
            device_type=payload["device_type"],
            locale=payload["locale"],
            app_version=payload["app_version"],
            browser=payload["browser"],
            status=BugReportStatus.NEW,
            priority=BugReportPriority.NORMAL,
        )
        schedule_bug_report_notification(report_id=report.id)

    return Response(
        {
            "reference": report.reference,
            "status": report.status,
            "created_at": report.created_at,
        },
        status=status.HTTP_201_CREATED,
    )
