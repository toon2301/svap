from django.core.management.base import BaseCommand
from django.conf import settings


def _tiny_png_bytes() -> bytes:
    # 1x1 red PNG (rovnaké ako v testoch)
    return (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
            b"\x00\x00\x00\x06PLTE\xff\x00\x00\x00\x00\x00\xa5\xd9\x9b\x9e\x00\x00\x00\x0cIDATx\x9cc``\xf8\x0f\x00\x01\x01\x01\x00\x18\xdd\x1d\x9b\x00\x00\x00\x00IEND\xaeB`\x82")


class Command(BaseCommand):
    help = "Check Google Vision SafeSearch connectivity and print raw scores"

    def add_arguments(self, parser):
        parser.add_argument('--image', type=str, help='Path to image file to test')

    def handle(self, *args, **options):
        try:
            from google.cloud import vision
            from swaply.image_moderation import _get_client

            client = _get_client()
            path = options.get('image')
            if path:
                with open(path, 'rb') as f:
                    content = f.read()
            else:
                content = _tiny_png_bytes()

            image = vision.Image(content=content)
            resp = client.safe_search_detection(image=image)
            if resp.error.message:
                self.stdout.write(self.style.ERROR(f"Vision API error: {resp.error.message}"))
                return

            ann = resp.safe_search_annotation
            self.stdout.write("SafeSearch raw values:")
            self.stdout.write(f"  adult={getattr(ann, 'adult', None)}")
            self.stdout.write(f"  violence={getattr(ann, 'violence', None)}")
            self.stdout.write(f"  racy={getattr(ann, 'racy', None)}")

            self.stdout.write("Thresholds in settings:")
            self.stdout.write(f"  SAFESEARCH_MIN_ADULT={getattr(settings, 'SAFESEARCH_MIN_ADULT', None)}")
            self.stdout.write(f"  SAFESEARCH_MIN_VIOLENCE={getattr(settings, 'SAFESEARCH_MIN_VIOLENCE', None)}")
            self.stdout.write(f"  SAFESEARCH_MIN_RACY={getattr(settings, 'SAFESEARCH_MIN_RACY', None)}")

            self.stdout.write(self.style.SUCCESS("Vision connectivity OK"))

        except Exception as e:
            # Vypíš základné info o konfigurácii pre ladenie (bez úniku tajomstiev)
            has_json = bool(getattr(settings, 'GCP_VISION_SERVICE_ACCOUNT_JSON', None))
            self.stdout.write(self.style.ERROR(f"Exception: {e}"))
            self.stdout.write(f"DEBUG has_json={has_json} STRICT_MODE={getattr(settings, 'SAFESEARCH_STRICT_MODE', False)}")
            path = getattr(settings, 'GOOGLE_APPLICATION_CREDENTIALS', None) or ''
            try:
                from pathlib import Path
                exists = bool(Path(path).exists()) if path else False
            except Exception:
                exists = False
            self.stdout.write(f"DEBUG GOOGLE_APPLICATION_CREDENTIALS set={bool(path)} exists={exists}")

