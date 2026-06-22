"""
Management príkaz na vytvorenie testovacích položiek portfólia (dev/test).
"""

from io import BytesIO

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from PIL import Image

from accounts.models import OfferedSkill
from portfolio.models import PortfolioImage, PortfolioItem

User = get_user_model()

DEFAULT_PORTFOLIO_ITEMS = [
    {
        "title": "Drevená polica na mieru",
        "category": "remesla-a-vyroba",
        "description": "Výroba a montáž police podľa rozmerov zákazníka, morené drevo, čisté spoje.",
    },
    {
        "title": "Oprava kuchynských skriniek",
        "category": "remesla-a-vyroba",
        "description": "Výmena pántov, dorovnanie dvierok a doladenie zatvárania.",
    },
    {
        "title": "Kovový zábradlí na terasu",
        "category": "remesla-a-vyroba",
        "description": "Zameranie, výroba a montáž zábradlia s povrchovou úpravou proti korózii.",
    },
    {
        "title": "Stolárska práca – zabudovaná skriňa",
        "category": "kutilstvo-a-diy-projekty",
        "description": "Celá zabudovaná skriňa vrátane políc, LED osvetlenia a úchytiek.",
    },
    {
        "title": "Renovácia vchodových dverí",
        "category": "remesla-a-vyroba",
        "description": "Oprava poškodenia, brúsenie, nový náter a výmena kovania.",
    },
    {
        "title": "Drobné opravy v byte",
        "category": "domacnost-a-sluzby",
        "description": "Montáž poličiek, oprava kľučiek, vŕtanie a drobné úpravy podľa dohody.",
    },
]

PLACEHOLDER_COLORS = [
    (124, 58, 237),
    (79, 70, 229),
    (16, 185, 129),
    (245, 158, 11),
    (239, 68, 68),
    (59, 130, 246),
]


class Command(BaseCommand):
    help = "Vytvorí testovacie položky portfólia pre používateľa (dev/test)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            required=True,
            help="Username vlastníka portfólia (napr. tonochudjak)",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=6,
            help="Počet položiek na vytvorenie (default: 6)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Najprv vymaže existujúce položky portfólia používateľa",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                "seed_test_portfolio je dostupný len v DEBUG režime (dev/test)."
            )

        try:
            owner = User.objects.get(username=options["username"])
        except User.DoesNotExist as exc:
            raise CommandError(f"Používateľ '{options['username']}' neexistuje.") from exc

        count = min(max(options["count"], 1), len(DEFAULT_PORTFOLIO_ITEMS))
        templates = DEFAULT_PORTFOLIO_ITEMS[:count]
        related_offer = (
            OfferedSkill.objects.filter(user=owner).order_by("id").first()
        )

        if options["clear"]:
            deleted, _ = PortfolioItem.objects.filter(owner=owner).delete()
            self.stdout.write(self.style.WARNING(f"Vymazaných {deleted} položiek portfólia."))

        existing = PortfolioItem.objects.filter(owner=owner).count()
        if existing > 0 and not options["clear"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Používateľ '{owner.username}' už má {existing} položiek portfólia. "
                    "Použi --clear na prepísanie."
                )
            )
            return

        created = 0
        with transaction.atomic():
            for index, template in enumerate(templates):
                item = PortfolioItem.objects.create(
                    owner=owner,
                    title=template["title"],
                    category=template["category"],
                    description=template["description"],
                    related_offer=related_offer,
                    sort_order=index,
                )
                cover = self._create_cover_image(item, index)
                item.cover_image = cover
                item.save(update_fields=["cover_image", "updated_at"])
                created += 1
                self.stdout.write(f"  + portfolio #{item.id}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Hotovo: {created} poloziek portfolia pre {owner.username}"
            )
        )

    def _create_cover_image(self, item: PortfolioItem, index: int) -> PortfolioImage:
        color = PLACEHOLDER_COLORS[index % len(PLACEHOLDER_COLORS)]
        image = PortfolioImage.objects.create(
            item=item,
            order=0,
            status=PortfolioImage.Status.APPROVED,
            width=800,
            height=600,
        )
        content = self._build_placeholder_jpeg(color)
        image.image.save(
            f"portfolio-item-{item.id}-cover.jpg",
            content,
            save=True,
        )
        return image

    @staticmethod
    def _build_placeholder_jpeg(color: tuple[int, int, int]) -> ContentFile:
        buffer = BytesIO()
        Image.new("RGB", (800, 600), color).save(buffer, format="JPEG", quality=85)
        return ContentFile(buffer.getvalue())
