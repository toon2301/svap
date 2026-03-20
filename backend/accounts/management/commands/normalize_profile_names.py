from __future__ import annotations

from typing import Dict, List, Tuple

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import UserType
from accounts.name_normalization import (
    build_individual_display_name,
    clean_name_value,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Normalize profile name fields based on user_type without logging raw PII."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Analyze and report safe fixes without persisting changes.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Query iteration batch size.",
        )

    def handle(self, *args, **options):
        dry_run = bool(options["dry_run"])
        batch_size = max(int(options["batch_size"] or 500), 1)

        scanned = 0
        safe_updates = 0
        individual_company_name_cleared = 0
        company_name_filled = 0
        company_compat_synced = 0
        individual_conflicts = 0
        company_conflicts = 0
        conflict_ids: List[int] = []

        queryset = User.objects.order_by("id").iterator(chunk_size=batch_size)
        for user in queryset:
            scanned += 1
            updates, counters, is_conflict = self._compute_updates(user)
            if is_conflict:
                if user.user_type == UserType.COMPANY:
                    company_conflicts += 1
                else:
                    individual_conflicts += 1
                conflict_ids.append(user.id)
                continue

            if not updates:
                continue

            safe_updates += 1
            individual_company_name_cleared += counters.get(
                "individual_company_name_cleared", 0
            )
            company_name_filled += counters.get("company_name_filled", 0)
            company_compat_synced += counters.get("company_compat_synced", 0)

            if dry_run:
                continue

            for field, value in updates.items():
                setattr(user, field, value)
            user.save(update_fields=list(updates.keys()))

        self.stdout.write(f"dry_run: {'true' if dry_run else 'false'}")
        self.stdout.write(f"scanned: {scanned}")
        self.stdout.write(f"safe_updates: {safe_updates}")
        self.stdout.write(
            f"individual_company_name_cleared: {individual_company_name_cleared}"
        )
        self.stdout.write(f"company_name_filled: {company_name_filled}")
        self.stdout.write(f"company_compat_synced: {company_compat_synced}")
        self.stdout.write(f"individual_conflicts: {individual_conflicts}")
        self.stdout.write(f"company_conflicts: {company_conflicts}")
        if conflict_ids:
            joined_ids = ", ".join(str(user_id) for user_id in conflict_ids)
            self.stdout.write(f"conflict_user_ids: {joined_ids}")

    def _compute_updates(self, user) -> Tuple[Dict[str, str], Dict[str, int], bool]:
        if user.user_type == UserType.COMPANY:
            return self._compute_company_updates(user)
        return self._compute_individual_updates(user)

    def _compute_individual_updates(
        self, user
    ) -> Tuple[Dict[str, str], Dict[str, int], bool]:
        current_company = clean_name_value(user.company_name)
        personal_name = build_individual_display_name(user.first_name, user.last_name)

        if not current_company:
            return {}, {}, False

        if personal_name and current_company == personal_name:
            return (
                {"company_name": ""},
                {"individual_company_name_cleared": 1},
                False,
            )

        return {}, {}, True

    def _compute_company_updates(
        self, user
    ) -> Tuple[Dict[str, str], Dict[str, int], bool]:
        current_company = clean_name_value(user.company_name)
        current_first = clean_name_value(user.first_name)
        current_last = clean_name_value(user.last_name)

        updates: Dict[str, str] = {}
        counters: Dict[str, int] = {}

        if not current_company:
            derived_company = build_individual_display_name(current_first, current_last)
            if not current_first or not derived_company:
                return {}, {}, True

            updates["company_name"] = derived_company
            counters["company_name_filled"] = 1
            current_company = derived_company

        if not current_first:
            updates["first_name"] = current_company
            counters["company_compat_synced"] = 1
        elif current_first != current_company:
            return {}, {}, True

        if current_last:
            updates["last_name"] = ""

        return updates, counters, False
