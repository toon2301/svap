#!/usr/bin/env python
"""Quick script to clear rate limit cache"""
import os
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "swaply.settings")
django.setup()

from django.core.cache import cache

# Clear all cache
cache.clear()
print("SUCCESS: Rate limit cache cleared for all users!")
print("INFO: New limit: 1000 requests per 60 minutes")
