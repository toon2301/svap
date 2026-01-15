#!/usr/bin/env python
"""Skript na výpis všetkých používateľov"""
import os
import sys
import django

# Nastavenie Django prostredia
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'swaply.settings')
django.setup()

from accounts.models import User

users = User.objects.all().order_by('id')

print(f'\n{"="*80}')
print(f'Celkovy pocet pouzivatelov: {users.count()}')
print(f'{"="*80}\n')

if users.count() == 0:
    print('Ziadni pouzivatelia nie su registrovani.')
else:
    for u in users:
        user_type_display = 'Osoba' if u.user_type == 'individual' else 'Firma'
        name = f'{u.first_name or ""} {u.last_name or ""}'.strip() or '-'
        company = u.company_name or '-'
        print(f'ID: {u.id:3d} | Email: {u.email:30s} | Typ: {user_type_display:6s} | Meno: {name:20s} | Firma: {company}')

print(f'\n{"="*80}\n')

