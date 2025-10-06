"""
Management command na inicializáciu databázy pre Railway
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection


class Command(BaseCommand):
    help = 'Inicializuje databázu - spustí migrácie a vytvorí potrebné tabuľky'

    def handle(self, *args, **options):
        self.stdout.write('Spúšťam migrácie...')
        
        try:
            # Spusti všetky migrácie
            call_command('migrate', verbosity=2, interactive=False)
            
            # Skontroluj, či existuje accounts_user tabuľka
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'accounts_user'
                    );
                """)
                exists = cursor.fetchone()[0]
                
                if exists:
                    self.stdout.write(
                        self.style.SUCCESS('✓ Tabuľka accounts_user existuje')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR('✗ Tabuľka accounts_user neexistuje')
                    )
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Chyba pri migráciách: {e}')
            )
            raise