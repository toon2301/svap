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
                    self.stdout.write(self.style.WARNING('✗ Tabuľka accounts_user neexistuje – opravujem migrácie pre app accounts'))

                    # Ak migrácie hlásia "No migrations to apply" ale tabuľka chýba,
                    # odfakeujeme migrácie appky accounts na zero a následne ich re-aplikujeme.
                    call_command('migrate', 'accounts', 'zero', fake=True, verbosity=1, interactive=False)
                    call_command('migrate', 'accounts', verbosity=2, interactive=False)

                    # Re-check
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = 'accounts_user'
                        );
                    """)
                    exists_after = cursor.fetchone()[0]
                    if exists_after:
                        self.stdout.write(self.style.SUCCESS('✓ Tabuľka accounts_user bola vytvorená'))
                    else:
                        self.stdout.write(self.style.ERROR('✗ Nepodarilo sa vytvoriť tabuľku accounts_user'))
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Chyba pri migráciách: {e}')
            )
            raise