"""
Management príkaz na vytvorenie testovacích recenzií pre ponuku (dev/test).
"""

from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import OfferedSkill, Review
from accounts.views.dashboard_views.public_profiles import (
    invalidate_dashboard_user_skills_cache,
)
from accounts.views.skills import _skills_list_cache_invalidate

User = get_user_model()

DEFAULT_REVIEWS = [
    {
        "rating": "5.0",
        "text": "Skvelá služba, bielizeň bola perfektne vyžehlená a zložená.",
        "pros": ["Rýchle dodanie", "Precízna práca"],
        "cons": [],
        "display_name": "Mária K.",
    },
    {
        "rating": "4.5",
        "text": "Veľmi spokojná, len drobné oneskorenie pri odovzdaní.",
        "pros": ["Kvalitné žehlenie"],
        "cons": ["Mierne oneskorenie"],
        "display_name": "Jana S.",
    },
    {
        "rating": "5.0",
        "text": "Odporúčam, komunikácia bola jasná a výsledok presne podľa dohody.",
        "pros": ["Dobrá komunikácia", "Spoľahlivosť"],
        "cons": [],
        "display_name": "Peter N.",
    },
    {
        "rating": "4.0",
        "text": "Celkovo dobrá skúsenosť, bielizeň vo výbornom stave.",
        "pros": ["Starostlivosť o detaily"],
        "cons": [],
        "display_name": "Eva H.",
    },
    {
        "rating": "5.0",
        "text": "Najlepšia služba prania v okolí, určite využijem znova.",
        "pros": ["Profesionalita", "Rýchlosť"],
        "cons": [],
        "display_name": "Tomáš V.",
        "owner_response": "Ďakujem za krásnu recenziu, teším sa na ďalšiu spoluprácu!",
    },
    {
        "rating": "3.5",
        "text": "V poriadku, ale očakával som trochu rýchlejší termín.",
        "pros": ["Kvalita práce"],
        "cons": ["Dlhší termín"],
        "display_name": "Lucia B.",
    },
    {
        "rating": "5.0",
        "text": "Perfektné skladanie, všetko bolo pripravené na použitie.",
        "pros": ["Úhľadné balenie"],
        "cons": [],
        "display_name": "Martin D.",
    },
    {
        "rating": "4.5",
        "text": "Veľmi príjemná spolupráca, výsledok stál za to.",
        "pros": ["Flexibilita"],
        "cons": [],
        "display_name": "Zuzana P.",
    },
    {
        "rating": "5.0",
        "text": "Opakovane využívam a vždy spokojnosť.",
        "pros": ["Konzistentná kvalita"],
        "cons": [],
        "display_name": "Filip R.",
    },
    {
        "rating": "4.0",
        "text": "Dobrá práca, len by som uvítal viac informácií počas procesu.",
        "pros": ["Kvalita"],
        "cons": ["Menej aktualizácií"],
        "display_name": "Katarína M.",
    },
    {
        "rating": "5.0",
        "text": "Úžasné, presne ako som potrebovala pred dôležitou udalosťou.",
        "pros": ["Rýchla reakcia", "Precíznosť"],
        "cons": [],
        "display_name": "Andrea L.",
    },
    {
        "rating": "4.5",
        "text": "Spoľahlivá služba, určite odporúčam ďalej.",
        "pros": ["Spoľahlivosť", "Príjemný prístup"],
        "cons": [],
        "display_name": "Jozef T.",
    },
    {
        "rating": "4.0",
        "text": "Férová cena a slušný výsledok, bez výrazných výhrad.",
        "pros": ["Dobrý pomer cena/kvalita"],
        "cons": [],
        "display_name": "Monika F.",
    },
]


class Command(BaseCommand):
    help = "Vytvorí testovacie recenzie pre ponuku používateľa (dev/test)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            help="Username vlastníka ponuky (napr. update)",
        )
        parser.add_argument(
            "--offer-id",
            type=int,
            help="ID ponuky (OfferedSkill)",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=12,
            help="Počet recenzií na vytvorenie (default: 12)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Najprv vymaže existujúce recenzie na tejto ponuke",
        )

    def handle(self, *args, **options):
        # Bezpečnostný guard: tento príkaz vytvára testovacie účty s predvídateľným
        # heslom a falošné recenzie – nikdy nesmie bežať v produkcii (DEBUG=False).
        if not settings.DEBUG:
            raise CommandError(
                "seed_test_reviews je dostupný len v DEBUG režime (dev/test). "
                "V produkcii (DEBUG=False) je zakázaný – vytvára testovacie účty "
                "s predvídateľným heslom a falošné recenzie."
            )

        offer = self._resolve_offer(options)
        count = min(max(options["count"], 1), len(DEFAULT_REVIEWS))
        templates = DEFAULT_REVIEWS[:count]

        if options["clear"]:
            deleted, _ = Review.objects.filter(offer=offer).delete()
            self.stdout.write(self.style.WARNING(f"Vymazaných {deleted} recenzií."))

        existing = Review.objects.filter(offer=offer).count()
        if existing > 0 and not options["clear"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Ponuka #{offer.id} už má {existing} recenzií. "
                    "Použi --clear na prepísanie."
                )
            )
            return

        created = 0
        with transaction.atomic():
            for i, template in enumerate(templates):
                reviewer = self._get_or_create_reviewer(i, template["display_name"])
                if Review.objects.filter(reviewer=reviewer, offer=offer).exists():
                    continue

                owner_response = template.get("owner_response")
                review = Review.objects.create(
                    reviewer=reviewer,
                    offer=offer,
                    rating=Decimal(template["rating"]),
                    text=template["text"],
                    pros=template["pros"],
                    cons=template["cons"],
                    owner_response=owner_response,
                    owner_responded_at=timezone.now() if owner_response else None,
                )
                created += 1
                self.stdout.write(
                    f"  + recenzia #{review.id}: {template['rating']} od {template['display_name']}"
                )

        offer.save(update_fields=["updated_at"])
        _skills_list_cache_invalidate(offer.user_id)
        invalidate_dashboard_user_skills_cache(offer.user_id)

        self.stdout.write(
            self.style.SUCCESS(
                f"Hotovo: {created} recenzií na ponuke #{offer.id} "
                f"(vlastník: {offer.user.username})"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "Ak beží dev server, reštartuj ho (cache) a v prehliadači urob hard refresh (Ctrl+F5)."
            )
        )

    def _resolve_offer(self, options):
        if options.get("offer_id"):
            try:
                return OfferedSkill.objects.select_related("user").get(
                    id=options["offer_id"]
                )
            except OfferedSkill.DoesNotExist as exc:
                raise CommandError(f"Ponuka #{options['offer_id']} neexistuje.") from exc

        username = options.get("username")
        if not username:
            raise CommandError("Zadaj --username alebo --offer-id.")

        try:
            owner = User.objects.get(username=username)
        except User.DoesNotExist as exc:
            raise CommandError(f"Používateľ '{username}' neexistuje.") from exc

        offers = OfferedSkill.objects.filter(user=owner).order_by("id")
        if not offers.exists():
            raise CommandError(f"Používateľ '{username}' nemá žiadnu ponuku.")
        if offers.count() > 1:
            self.stdout.write(
                self.style.WARNING(
                    f"Používateľ má {offers.count()} ponúk, používam prvú (#{offers.first().id})."
                )
            )
        return offers.first()

    def _get_or_create_reviewer(self, index: int, display_name: str):
        username = f"test-reviewer-{index + 1}"
        email = f"test-reviewer-{index + 1}@svaply.test"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": display_name.split()[0] if display_name else "Test",
                "last_name": display_name.split()[-1] if display_name else "Reviewer",
            },
        )
        if created:
            user.set_password("TestReviewer123!")
            user.save(update_fields=["password"])
        return user
