"""
Dashboard views pre Swaply.

Tento súbor je zámerne tenký "facade" pre spätnú kompatibilitu:
- `accounts/views/__init__.py` importuje dashboard view funkcie z `accounts.views.dashboard`
- `accounts/urls.py` ich používa cez `from . import views`

Skutočná implementácia je rozdelená v `accounts/views/dashboard_views/*`.
"""

from .dashboard_views.home import dashboard_home_view
from .dashboard_views.search import dashboard_search_view
from .dashboard_views.favorites import dashboard_favorites_view
from .dashboard_views.profile import dashboard_profile_view, dashboard_settings_view
from .dashboard_views.public_profiles import (
    dashboard_user_profile_detail_view,
    dashboard_user_profile_detail_by_slug_view,
    dashboard_user_skills_view,
    dashboard_user_skills_by_slug_view,
)
