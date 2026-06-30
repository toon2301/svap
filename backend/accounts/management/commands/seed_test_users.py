"""
Management príkaz na vytvorenie testovacích používateľov (dev/test).
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

User = get_user_model()

DEFAULT_PASSWORD = "TestUser123!"

DEFAULT_USERS = [
    {
        "username": "martin.novak",
        "email": "martin.novak@svaply.test",
        "first_name": "Martin",
        "last_name": "Novák",
        "location": "Bratislava",
        "job_title": "Stolár",
    },
    {
        "username": "jana.horvathova",
        "email": "jana.horvathova@svaply.test",
        "first_name": "Jana",
        "last_name": "Horváthová",
        "location": "Košice",
        "job_title": "Grafická dizajnérka",
    },
    {
        "username": "peter.krajci",
        "email": "peter.krajci@svaply.test",
        "first_name": "Peter",
        "last_name": "Krajči",
        "location": "Žilina",
        "job_title": "Elektrikár",
    },
    {
        "username": "lucia.svobodova",
        "email": "lucia.svobodova@svaply.test",
        "first_name": "Lucia",
        "last_name": "Svobodová",
        "location": "Nitra",
        "job_title": "Účtovníčka",
    },
    {
        "username": "tomas.urban",
        "email": "tomas.urban@svaply.test",
        "first_name": "Tomáš",
        "last_name": "Urban",
        "location": "Trnava",
        "job_title": "Programátor",
    },
    {
        "username": "eva.miklosova",
        "email": "eva.miklosova@svaply.test",
        "first_name": "Eva",
        "last_name": "Miklošová",
        "location": "Banská Bystrica",
        "job_title": "Fotografka",
    },
    {
        "username": "filip.benes",
        "email": "filip.benes@svaply.test",
        "first_name": "Filip",
        "last_name": "Beneš",
        "location": "Prešov",
        "job_title": "Kuchár",
    },
    {
        "username": "katarina.polakova",
        "email": "katarina.polakova@svaply.test",
        "first_name": "Katarína",
        "last_name": "Poláková",
        "location": "Trenčín",
        "job_title": "Lekárka",
    },
]


class Command(BaseCommand):
    help = "Vytvorí testovacích používateľov s menami (dev/test)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=8,
            help="Počet používateľov na vytvorenie (default: 8)",
        )
        parser.add_argument(
            "--password",
            type=str,
            default=DEFAULT_PASSWORD,
            help=f"Heslo pre nových používateľov (default: {DEFAULT_PASSWORD})",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                "seed_test_users je dostupný len v DEBUG režime (dev/test)."
            )

        count = min(max(options["count"], 1), len(DEFAULT_USERS))
        password = options["password"]
        templates = DEFAULT_USERS[:count]

        created = 0
        skipped = 0

        with transaction.atomic():
            for template in templates:
                if User.objects.filter(username=template["username"]).exists():
                    skipped += 1
                    self.stdout.write(f"  ~ exists: {template['username']}")
                    continue

                user = User.objects.create_user(
                    username=template["username"],
                    email=template["email"],
                    password=password,
                    first_name=template["first_name"],
                    last_name=template["last_name"],
                    location=template.get("location", ""),
                    job_title=template.get("job_title", ""),
                    is_public=True,
                    is_verified=True,
                )
                created += 1
                self.stdout.write(
                    f"  + #{user.id} {user.first_name} {user.last_name} ({user.username})"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Hotovo: {created} novych, {skipped} uz existovalo. Heslo: {password}"
            )
        )
