"""
Spracovanie nahraných obrázkov v messagingu – odstránenie EXIF/metadát.

GDPR: originálna fotka v správe môže obsahovať EXIF s GPS lokáciou odosielateľa.
`MessageImageView` servuje originál, preto metadáta odstraňujeme už pri uploade
(pred uložením do storage). Samotná implementácia žije v zdieľanom module
`swaply.image_metadata`, aby ju mohli použiť aj iné upload flow (napr. avatary).
"""

from __future__ import annotations

from swaply.image_metadata import strip_image_metadata

__all__ = ["strip_image_metadata"]
