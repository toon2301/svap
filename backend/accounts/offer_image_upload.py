"""Príprava fotky ponuky nahranej starým multipart endpointom (nález 282).

Fotka ponuky je verejná, preto sa v pôvodnej podobe neukladá: môže niesť polohu GPS a ďalšie EXIF metadáta a aj názov
súboru, ktorý zvolil používateľ (a ten sa stáva súčasťou verejnej adresy). Pipeline cez S3 (`process_offered_skill_image`)
to rieši tým, že obrázok prekóduje do WebP bez metadát; tento endpoint ju obchádza, takže sa metadáta odstraňujú tu.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.utils.translation import gettext_lazy as _

from swaply.image_metadata import strip_image_metadata
from swaply.image_signature import read_file_header, sniff_image_format


def prepare_offer_image_upload(image):
    """Očisti fotku ponuky od metadát a daj jej anonymný názov; čo sa očistiť nedá, odmietni.

    Vracia `ContentFile` pripravený na uloženie do `OfferedSkillImage.image`: JPEG, PNG a WebP sa prekódujú bez EXIF
    (orientácia sa pred tým zapečie do pixelov), HEIC a MPO vyjdú ako JPEG. GIF nemá EXIF a prekódovanie by zničilo
    animáciu, preto sa ponechá bajt po bajte, ale len keď prípona aj obsah súhlasia. Všetko ostatné (poškodený HEIC,
    súbor, ktorý sa nedá dekódovať) dostane `ValidationError`: verejná fotka sa nikdy neuloží v pôvodnej podobe, ak by sa
    z nej nepodarilo odstrániť polohu. Názov výsledku je náhodný, pôvodný sa nezachová. Prázdny vstup sa vráti nezmenený.
    """
    if not image:
        return image

    processed = strip_image_metadata(image, filename=uuid.uuid4().hex)
    if processed is not None:
        return processed

    detected_format = sniff_image_format(read_file_header(image) or b"")
    suffix = Path(getattr(image, "name", "") or "").suffix.lower()
    if suffix == ".gif" and detected_format == "gif":
        image.seek(0)
        return ContentFile(image.read(), name=f"{uuid.uuid4().hex}.gif")

    raise ValidationError(
        _("Súbor nie je platný obrázok (neznámy alebo poškodený formát).")
    )
