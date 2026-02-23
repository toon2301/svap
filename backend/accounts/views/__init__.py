"""
Views package pre accounts app
"""

from .auth import (
    register_view,
    login_view,
    logout_view,
    me_view,
    ping_view,
    verify_email_view,
    resend_verification_view,
    get_csrf_token_view,
)
from .email_check import check_email_availability_view
from .profile import update_profile_view
from .skills import (
    skills_list_view,
    skills_detail_view,
    skill_images_view,
    skill_image_detail_view,
)
from .skill_requests import (
    skill_requests_view,
    skill_requests_status_view,
    skill_request_detail_view,
    skill_request_request_completion_view,
    skill_request_confirm_completion_view,
)
from .reviews import reviews_list_view, review_detail_view, review_respond_view
from .notifications import (
    notifications_list_view,
    notifications_unread_count_view,
    notifications_mark_all_read_view,
)
from .dashboard import (
    dashboard_home_view,
    dashboard_search_view,
    dashboard_favorites_view,
    dashboard_profile_view,
    dashboard_user_profile_detail_view,
    dashboard_user_profile_detail_by_slug_view,
    dashboard_user_skills_view,
    dashboard_user_skills_by_slug_view,
    dashboard_settings_view,
)

__all__ = [
    "register_view",
    "login_view",
    "logout_view",
    "me_view",
    "ping_view",
    "verify_email_view",
    "resend_verification_view",
    "get_csrf_token_view",
    "check_email_availability_view",
    "update_profile_view",
    "skills_list_view",
    "skills_detail_view",
    "skill_images_view",
    "skill_image_detail_view",
    "skill_requests_view",
    "skill_requests_status_view",
    "skill_request_detail_view",
    "skill_request_request_completion_view",
    "skill_request_confirm_completion_view",
    "reviews_list_view",
    "review_detail_view",
    "review_respond_view",
    "notifications_list_view",
    "notifications_unread_count_view",
    "notifications_mark_all_read_view",
    "dashboard_home_view",
    "dashboard_search_view",
    "dashboard_favorites_view",
    "dashboard_profile_view",
    "dashboard_user_profile_detail_view",
    "dashboard_user_profile_detail_by_slug_view",
    "dashboard_user_skills_view",
    "dashboard_user_skills_by_slug_view",
    "dashboard_settings_view",
]
