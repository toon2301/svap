"""
WSGI config for swaply project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import sys

# Pridaj backend priečinok do Python path
sys.path.append('/home/AntonChudjak/svap/backend')

from django.core.wsgi import get_wsgi_application

# Použij production settings pre PythonAnywhere
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'swaply.settings_production')

application = get_wsgi_application()
