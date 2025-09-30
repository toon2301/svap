"""
Django management command pre nastavenie Google OAuth
"""
from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp
from django.conf import settings


class Command(BaseCommand):
    help = 'Nastaví Google OAuth SocialApp'

    def handle(self, *args, **options):
        # Získaj Google OAuth credentials
        client_id = getattr(settings, 'GOOGLE_OAUTH2_CLIENT_ID', '')
        client_secret = getattr(settings, 'GOOGLE_OAUTH2_SECRET', '')
        
        if not client_id or not client_secret:
            self.stdout.write(
                self.style.ERROR(
                    'Google OAuth credentials nie sú nastavené. '
                    'Nastav GOOGLE_OAUTH2_CLIENT_ID a GOOGLE_OAUTH2_SECRET v .env súbore.'
                )
            )
            return
        
        # Získaj alebo vytvor Site
        from django.conf import settings
        domain = getattr(settings, 'SITE_DOMAIN', 'localhost:8000')
        site, created = Site.objects.get_or_create(
            id=1,
            defaults={
                'domain': domain,
                'name': 'Swaply'
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Vytvorený Site: {site.domain}')
            )
        
        # Získaj alebo vytvor SocialApp pre Google
        social_app, created = SocialApp.objects.get_or_create(
            provider='google',
            defaults={
                'name': 'Google',
                'client_id': client_id,
                'secret': client_secret,
            }
        )
        
        if not created:
            # Aktualizuj credentials ak už existuje
            social_app.client_id = client_id
            social_app.secret = client_secret
            social_app.save()
            self.stdout.write(
                self.style.SUCCESS('Google SocialApp bol aktualizovaný')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('Google SocialApp bol vytvorený')
            )
        
        # Pridaj site do social_app
        social_app.sites.add(site)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Google OAuth je nakonfigurovaný!\n'
                f'Client ID: {client_id[:20]}...\n'
                f'Redirect URI: {getattr(settings, "BACKEND_CALLBACK_URL", "http://localhost:8000/api/oauth/google/callback/")}'
            )
        )
