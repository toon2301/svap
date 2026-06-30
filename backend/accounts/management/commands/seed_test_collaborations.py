"""
Management príkaz na vytvorenie testovacích aktívnych spoluprác okolo ponuky (dev/test).
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import OfferedSkill, SkillRequest, SkillRequestStatus
from accounts.views.skill_requests import _skill_requests_cache_invalidate_for_user

User = get_user_model()

SVAPLY_USERNAME = "tonochudjak"
DEFAULT_OFFER_ID = 390

CONTACT_USERNAMES = (
    "martin.novak",
    "jana.horvathova",
    "peter.krajci",
    "lucia.svobodova",
    "tomas.urban",
    "filip.benes",
    "katarina.polakova",
)

COLLABORATIONS: list[dict] = [
    {
        "contact_username": "martin.novak",
        "status": SkillRequestStatus.ACCEPTED,
        "days_ago": 4,
        "proposal_description": "Lepenie a spájanie 6 dubových polic do zabudovanej skrine, materiál pripravený.",
        "proposal_price_from": Decimal("180.00"),
        "proposal_price_currency": "€",
        "proposal_price_negotiable": False,
    },
    {
        "contact_username": "peter.krajci",
        "status": SkillRequestStatus.COMPLETION_REQUESTED,
        "days_ago": 3,
        "proposal_description": "Oprava a opätovné spojenie troch kuchynských skriniek po rekonštrukcii.",
        "proposal_price_from": Decimal("70.00"),
        "proposal_price_currency": "€",
        "proposal_price_negotiable": False,
    },
    {
        "contact_username": "jana.horvathova",
        "status": SkillRequestStatus.ACCEPTED,
        "days_ago": 2,
        "proposal_description": "Skladací drevený stojan na panel 80×120 cm na remeselný jarmok.",
        "proposal_price_from": Decimal("105.00"),
        "proposal_price_currency": "€",
        "proposal_price_negotiable": True,
    },
    {
        "contact_username": "lucia.svobodova",
        "status": SkillRequestStatus.ACCEPTED,
        "days_ago": 1,
        "proposal_description": "6 modulárnych boxov na dokumenty do kancelárie v Nitre.",
        "proposal_price_from": Decimal("165.00"),
        "proposal_price_currency": "€",
        "proposal_price_negotiable": False,
    },
    {
        "contact_username": "tomas.urban",
        "status": SkillRequestStatus.ACCEPTED,
        "days_ago": 5,
        "proposal_description": "Presné osadenie dubovej dosky 180×80 cm na kovový rám stola, čisté rohové spoje.",
        "proposal_price_from": Decimal("120.00"),
        "proposal_price_currency": "€",
        "proposal_price_negotiable": True,
    },
    {
        "contact_username": "filip.benes",
        "status": SkillRequestStatus.ACCEPTED,
        "days_ago": 1,
        "proposal_description": "Spojenie a finálne zhladenie 12 drevených menu dosiek do bistra.",
        "proposal_price_from": Decimal("220.00"),
        "proposal_price_currency": "€",
        "proposal_price_negotiable": False,
    },
    {
        "contact_username": "katarina.polakova",
        "status": SkillRequestStatus.ACCEPTED,
        "days_ago": 0,
        "proposal_description": "Nízka knižnica do čakárne ambulancie, 4 police, svetlé drevo, šetrné lepidlo.",
        "proposal_price_from": Decimal("140.00"),
        "proposal_price_currency": "€",
        "proposal_price_negotiable": True,
    },
]


class Command(BaseCommand):
    help = "Vytvorí aktívne testovacie spolupráce medzi Svaply a testovacími používateľmi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--offer-id",
            type=int,
            default=DEFAULT_OFFER_ID,
            help=f"ID ponuky (predvolene {DEFAULT_OFFER_ID}).",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Zmaže existujúce spolupráce testovacích kontaktov na tejto ponuke pred vytvorením.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Tento príkaz je dostupný len v DEBUG režime.")

        offer_id = options["offer_id"]
        force = options["force"]

        try:
            owner = User.objects.get(username=SVAPLY_USERNAME)
        except User.DoesNotExist as exc:
            raise CommandError(f"Používateľ '{SVAPLY_USERNAME}' neexistuje.") from exc

        try:
            offer = OfferedSkill.objects.get(id=offer_id, user=owner)
        except OfferedSkill.DoesNotExist as exc:
            raise CommandError(
                f"Ponuka #{offer_id} pre používateľa '{SVAPLY_USERNAME}' neexistuje."
            ) from exc

        contacts_by_username = {
            user.username: user
            for user in User.objects.filter(username__in=CONTACT_USERNAMES)
        }

        created_count = 0
        skipped_count = 0
        touched_user_ids: set[int] = {owner.id}

        with transaction.atomic():
            if force:
                deleted, _ = SkillRequest.objects.filter(
                    offer=offer,
                    requester__username__in=CONTACT_USERNAMES,
                ).delete()
                if deleted:
                    self.stdout.write(
                        self.style.WARNING(f"Vymazaných {deleted} existujúcich spoluprác.")
                    )

            for item in COLLABORATIONS:
                username = item["contact_username"]
                contact = contacts_by_username.get(username)
                if contact is None:
                    self.stdout.write(
                        self.style.WARNING(f"Preskakujem – používateľ '{username}' neexistuje.")
                    )
                    skipped_count += 1
                    continue

                existing = SkillRequest.objects.filter(
                    offer=offer,
                    requester=contact,
                ).first()

                if existing and not force:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Spolupráca s {username} už existuje (#{existing.id}, {existing.status}). "
                            "Použi --force na prepísanie."
                        )
                    )
                    skipped_count += 1
                    continue

                if existing and force:
                    existing.delete()

                created_at = timezone.now() - timedelta(days=int(item["days_ago"]))
                request = SkillRequest.objects.create(
                    requester=contact,
                    recipient=owner,
                    offer=offer,
                    status=item["status"],
                    proposal_description=item["proposal_description"],
                    proposal_price_from=item.get("proposal_price_from"),
                    proposal_price_currency=item.get("proposal_price_currency", ""),
                    proposal_price_negotiable=item.get("proposal_price_negotiable", False),
                )
                SkillRequest.objects.filter(pk=request.pk).update(
                    created_at=created_at,
                    updated_at=created_at,
                )

                touched_user_ids.add(contact.id)
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Vytvorená spolupráca #{request.id} s {contact.first_name} {contact.last_name} "
                        f"[{item['status']}]"
                    )
                )

        for user_id in touched_user_ids:
            _skill_requests_cache_invalidate_for_user(User(id=user_id))

        self.stdout.write(
            self.style.SUCCESS(
                f"Hotovo: {created_count} spoluprác vytvorených, {skipped_count} preskočených."
            )
        )
