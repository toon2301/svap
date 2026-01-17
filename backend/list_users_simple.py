import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'swaply.settings')
django.setup()

from accounts.models import User

users = User.objects.all().order_by('id')

print(f'\n=== ZOZNAM POUZIVATELOV ===')
print(f'Celkovy pocet pouzivatelov: {users.count()}\n')

if users.count() == 0:
    print('Ziaden pouzivatel nie je vytvoreny.')
else:
    for i, u in enumerate(users, 1):
        user_type = 'Firma' if u.user_type == 'company' else 'Osoba'
        verified = 'Ano' if u.is_verified else 'Nie'
        display_name = u.company_name if u.user_type == 'company' else f'{u.first_name} {u.last_name}'.strip() or u.username
        
        print(f'{i}. ID: {u.id}')
        print(f'   Meno/Názov: {display_name}')
        print(f'   Username: {u.username}')
        print(f'   Email: {u.email}')
        print(f'   Typ: {user_type}')
        print(f'   Overený: {verified}')
        print(f'   Vytvorený: {u.date_joined.strftime("%Y-%m-%d %H:%M:%S")}')
        print()

