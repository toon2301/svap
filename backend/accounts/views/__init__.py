"""
Views package pre accounts app
"""
from .auth import register_view, login_view, logout_view, me_view, verify_email_view, resend_verification_view, get_csrf_token_view
from .email_check import check_email_availability_view
from .profile import update_profile_view
from .skills import skills_list_view, skills_detail_view, skill_images_view, skill_image_detail_view
from .dashboard import (
    dashboard_home_view, 
    dashboard_search_view, 
    dashboard_favorites_view, 
    dashboard_profile_view, 
    dashboard_settings_view
)

__all__ = [
    'register_view', 'login_view', 'logout_view', 'me_view', 'verify_email_view', 'resend_verification_view', 'get_csrf_token_view',
    'check_email_availability_view',
    'update_profile_view',
    'skills_list_view', 'skills_detail_view', 'skill_images_view', 'skill_image_detail_view',
    'dashboard_home_view', 'dashboard_search_view', 'dashboard_favorites_view', 
    'dashboard_profile_view', 'dashboard_settings_view'
]
