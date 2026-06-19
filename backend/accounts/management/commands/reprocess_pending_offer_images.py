from django.core.management.base import BaseCommand

from accounts.models import OfferedSkillImage


class Command(BaseCommand):
    help = (
        "Re-spustí spracovanie pre obrázky ponúk zaseknuté v stave PENDING "
        "(napr. nahrané kým nebežal Celery worker). Predvolene zaradí úlohy "
        "do Celery fronty; s --sync ich spracuje synchrónne."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--sync",
            action="store_true",
            help="Spracovať synchrónne v tomto procese namiesto zaradenia do Celery fronty.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Maximálny počet obrázkov na spracovanie (0 = bez limitu).",
        )

    def handle(self, *args, **options):
        from swaply.tasks.offer_images import process_offered_skill_image

        qs = (
            OfferedSkillImage.objects.filter(status=OfferedSkillImage.Status.PENDING)
            .exclude(pending_key="")
            .order_by("id")
        )
        if options["limit"]:
            qs = qs[: options["limit"]]

        ids = list(qs.values_list("id", flat=True))
        self.stdout.write(f"Našiel som {len(ids)} PENDING obrázkov ponúk.")
        if not ids:
            return

        sync = options["sync"]
        ok = 0
        failed = 0
        for img_id in ids:
            if sync:
                # .apply() spustí task lokálne (eager) a korektne ošetrí bind=True.
                result = process_offered_skill_image.apply(args=[img_id])
                if result.successful():
                    ok += 1
                    self.stdout.write(f"  ✓ spracované {img_id}")
                else:
                    failed += 1
                    self.stderr.write(f"  ✗ zlyhalo {img_id}: {result.result!r}")
            else:
                process_offered_skill_image.delay(img_id)
                ok += 1
                self.stdout.write(f"  → zaradené do fronty {img_id}")

        summary = f"Hotovo. OK={ok}"
        if sync:
            summary += f" zlyhalo={failed}"
        self.stdout.write(self.style.SUCCESS(summary))
