import argparse

from django.core.management.base import BaseCommand

from accounts.models import OfferedSkillImage


def _non_negative_int(value):
    try:
        ivalue = int(value)
    except (TypeError, ValueError):
        raise argparse.ArgumentTypeError(f"--limit musí byť celé číslo (dostal som {value!r}).")
    if ivalue < 0:
        raise argparse.ArgumentTypeError(f"--limit nesmie byť záporné (dostal som {ivalue}).")
    return ivalue


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
            type=_non_negative_int,
            default=0,
            help="Maximálny počet obrázkov na spracovanie (0 = bez limitu).",
        )

    def handle(self, *args, **options):
        from swaply.tasks.offer_images import process_offered_skill_image

        qs = (
            OfferedSkillImage.objects.filter(status=OfferedSkillImage.Status.PENDING)
            .exclude(pending_key__isnull=True)
            .exclude(pending_key="")
            .order_by("id")
            .values_list("id", "pending_key")
        )
        # Whitespace-only kľúče vyfiltrujeme v Pythone (portabilné naprieč Postgres aj sqlite),
        # aby sme nezadávali úlohy, ktoré task zaručene odmietne s "pending_key missing".
        ids = [img_id for img_id, pending_key in qs if (pending_key or "").strip()]
        if options["limit"]:
            ids = ids[: options["limit"]]
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
                try:
                    process_offered_skill_image.delay(img_id)
                    ok += 1
                    self.stdout.write(f"  → zaradené do fronty {img_id}")
                except Exception as exc:
                    # Napr. nedostupný Celery broker / Redis — nezhadzuj celú dávku.
                    failed += 1
                    self.stderr.write(f"  ✗ nepodarilo sa zaradiť {img_id}: {exc!r}")

        summary = f"Hotovo. OK={ok}"
        if failed:
            summary += f" zlyhalo={failed}"
        self.stdout.write(self.style.SUCCESS(summary))
