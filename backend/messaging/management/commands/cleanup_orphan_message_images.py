"""
Údržbový príkaz: garbage-collect osamotených (orphan) obrázkov správ na S3.

Obrázky správ žijú v privátnom S3 úložisku pod prefixom ``messages/`` (originály
``messages/{conversation_id}/{uuid}.ext`` aj náhľady
``messages/{conversation_id}/thumbnails/{uuid}.webp``). Upload prílohy je atomický
(obrázok sa ukladá v ``transaction.on_commit``), takže za bežných okolností orphan
nevznikne. Môže však vzniknúť pri:

* zlyhanej GDPR anonymizácii / post_delete signáli (fail-open – súbor ostane),
* prerušenom procese medzi uploadom na S3 a commitom DB transakcie,
* historických dátach z čias pred privátnym úložiskom.

Tento príkaz prejde všetky S3 objekty pod prefixom ``messages/`` a pre každý
skontroluje, či naň odkazuje nejaký ``Message`` (cez ``image`` alebo
``image_thumbnail``). Objekty bez DB referencie sú orphan a dajú sa zmazať.

Bezpečnosť:

* **Predvolene beží v dry-run** – iba vypíše, čo by zmazal. Nič nemaže.
* Skutočné mazanie vyžaduje SÚČASNE ``--execute`` aj ``--confirm`` (dvojitá poistka).
* ``--dry-run`` explicitne vynúti suchý beh aj keď je zadané ``--execute``.
* ``--min-age-hours`` (predvolene 24) preskočí čerstvé objekty, aby sa nezmazal
  súbor, ktorého DB transakcia ešte len prebieha (ochrana pred race condition).

Príkaz nemá DEBUG guard – je určený na spustenie v produkcii proti reálnemu S3.
V logoch sa objavujú len S3 kľúče (``messages/<id>/<uuid>.ext``), žiadne citlivé dáta.
"""

from __future__ import annotations

import argparse
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from django.utils import timezone

from messaging.models import Message
from messaging.storage import get_message_image_storage

MESSAGE_IMAGE_PREFIX = "messages/"
DEFAULT_MIN_AGE_HOURS = 24


def _non_negative_int(value):
    try:
        ivalue = int(value)
    except (TypeError, ValueError):
        raise argparse.ArgumentTypeError(
            f"--min-age-hours musí byť celé číslo (dostal som {value!r})."
        )
    if ivalue < 0:
        raise argparse.ArgumentTypeError(
            f"--min-age-hours nesmie byť záporné (dostal som {ivalue})."
        )
    return ivalue


class Command(BaseCommand):
    help = (
        "Nájde a (voliteľne) zmaže osamotené obrázky správ na S3 pod prefixom "
        "'messages/', na ktoré už neodkazuje žiadny Message. Predvolene beží v "
        "dry-run (len výpis); skutočné mazanie vyžaduje --execute aj --confirm."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Skutočne zmazať orphan objekty (vyžaduje aj --confirm). Bez neho len dry-run.",
        )
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Povinné potvrdenie pre --execute (ochrana pred náhodným zmazaním).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Vynútiť dry-run (len výpis) aj keď je zadané --execute. Predvolené správanie je dry-run.",
        )
        parser.add_argument(
            "--min-age-hours",
            type=_non_negative_int,
            default=DEFAULT_MIN_AGE_HOURS,
            help=(
                "Preskočiť objekty mladšie ako N hodín (ochrana pred mazaním "
                f"práve nahrávaných súborov). Predvolene {DEFAULT_MIN_AGE_HOURS}."
            ),
        )

    def handle(self, *args, **options):
        dry_run = self._resolve_dry_run(options)
        min_age_hours = options["min_age_hours"]
        cutoff = timezone.now() - timedelta(hours=min_age_hours) if min_age_hours else None

        storage = get_message_image_storage()
        prefix = self._build_prefix(storage)

        mode = "DRY-RUN (nič sa nemaže)" if dry_run else "EXECUTE (orphany budú zmazané)"
        self.stdout.write(f"Režim: {mode}")
        self.stdout.write(f"Prefix: {prefix}")
        if cutoff is not None:
            self.stdout.write(
                f"Preskakujem objekty mladšie ako {min_age_hours} h "
                f"(novšie než {cutoff.isoformat()})."
            )

        scanned = 0
        skipped_recent = 0
        orphans_found = 0
        deleted = 0
        delete_failed = 0

        for page_objects in self._iter_object_pages(storage, prefix):
            # Predfiltruj: vynechaj „adresárové" markery a priveľmi čerstvé objekty.
            candidates = []  # zoznam (name, key)
            for obj in page_objects:
                key = obj.get("Key") or ""
                if not key or key.endswith("/"):
                    continue
                scanned += 1
                if cutoff is not None:
                    last_modified = obj.get("LastModified")
                    if last_modified is not None and last_modified > cutoff:
                        skipped_recent += 1
                        continue
                candidates.append((self._key_to_name(storage, key), key))

            if not candidates:
                continue

            names = [name for name, _key in candidates]
            referenced = self._referenced_names(names)

            for name, key in candidates:
                if name in referenced:
                    continue
                orphans_found += 1
                if dry_run:
                    self.stdout.write(f"  [orphan] {key}")
                    continue
                try:
                    storage.delete(name)
                    deleted += 1
                    self.stdout.write(f"  ✓ zmazané {key}")
                except Exception as exc:  # noqa: BLE001 – nezhadzuj celú dávku kvôli jednému kľúču
                    delete_failed += 1
                    self.stderr.write(f"  ✗ zlyhalo mazanie {key}: {exc!r}")

            self.stdout.write(
                f"… priebeh: naskenovaných={scanned}, orphanov={orphans_found}"
            )

        self._print_summary(
            dry_run=dry_run,
            scanned=scanned,
            skipped_recent=skipped_recent,
            orphans_found=orphans_found,
            deleted=deleted,
            delete_failed=delete_failed,
        )

    # --- pomocné metódy (oddelené kvôli čitateľnosti a testovateľnosti) ---

    def _resolve_dry_run(self, options) -> bool:
        """Vyhodnotí, či ide o suchý beh. Mazanie len pri --execute + --confirm."""
        if not options["execute"] or options["dry_run"]:
            return True
        if not options["confirm"]:
            raise CommandError(
                "--execute vyžaduje aj --confirm (ochrana pred náhodným zmazaním). "
                "Spustite znova s '--execute --confirm'."
            )
        return False

    def _build_prefix(self, storage) -> str:
        """Plný S3 prefix vrátane prípadného storage.location."""
        location = (getattr(storage, "location", "") or "").strip("/")
        if location:
            return f"{location}/{MESSAGE_IMAGE_PREFIX}"
        return MESSAGE_IMAGE_PREFIX

    def _key_to_name(self, storage, key: str) -> str:
        """Prevedie plný S3 kľúč na Django storage 'name' (bez location prefixu)."""
        location = (getattr(storage, "location", "") or "").strip("/")
        if location:
            prefix = f"{location}/"
            if key.startswith(prefix):
                return key[len(prefix):]
        return key

    def _referenced_names(self, names) -> set:
        """Vráti množinu kľúčov, na ktoré odkazuje aspoň jeden Message (1 dotaz/strana)."""
        referenced: set = set()
        rows = (
            Message.objects.filter(Q(image__in=names) | Q(image_thumbnail__in=names))
            .values_list("image", "image_thumbnail")
            .iterator()
        )
        for image, thumbnail in rows:
            if image:
                referenced.add(image)
            if thumbnail:
                referenced.add(thumbnail)
        return referenced

    def _iter_object_pages(self, storage, prefix):
        """Lazy generátor strán S3 objektov pod prefixom (boto3 list_objects_v2)."""
        connection = getattr(storage, "connection", None)
        client = getattr(getattr(connection, "meta", None), "client", None)
        bucket_name = getattr(storage, "bucket_name", None)
        if client is None or not bucket_name:
            raise CommandError(
                "Storage pre obrázky správ nie je nakonfigurované na S3 – tento "
                "údržbový príkaz je určený pre produkčné S3 úložisko."
            )
        paginator = client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket_name, Prefix=prefix):
            yield page.get("Contents", []) or []

    def _print_summary(
        self,
        *,
        dry_run: bool,
        scanned: int,
        skipped_recent: int,
        orphans_found: int,
        deleted: int,
        delete_failed: int,
    ) -> None:
        self.stdout.write("")
        self.stdout.write("Súhrn:")
        self.stdout.write(f"  naskenovaných objektov: {scanned}")
        self.stdout.write(f"  preskočených (čerstvé): {skipped_recent}")
        self.stdout.write(f"  nájdených orphanov:     {orphans_found}")
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"  DRY-RUN: nič sa nezmazalo. Spustite s '--execute --confirm' "
                    f"pre zmazanie {orphans_found} orphanov."
                )
            )
            return
        self.stdout.write(f"  zmazaných:              {deleted}")
        if delete_failed:
            self.stdout.write(self.style.ERROR(f"  zlyhalo mazanie:        {delete_failed}"))
        self.stdout.write(self.style.SUCCESS("Hotovo."))
