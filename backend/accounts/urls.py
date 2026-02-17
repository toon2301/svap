from django.urls import path
from . import views
from .views import profile, password_reset, google_oauth_simple

# from .views import oauth, google_oauth, allauth_views  # DOČASNE VYPNUTÉ

app_name = "accounts"

urlpatterns = [
    # Autentifikácia
    path("csrf-token/", views.get_csrf_token_view, name="get_csrf_token"),
    path("register/", views.register_view, name="register"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("me/", views.me_view, name="me"),
    path("verify-email/", views.verify_email_view, name="verify_email"),
    path(
        "resend-verification/",
        views.resend_verification_view,
        name="resend_verification",
    ),
    path(
        "check-email/<str:email>/",
        views.check_email_availability_view,
        name="check_email",
    ),
    # Password reset
    path(
        "password-reset/",
        password_reset.password_reset_request_view,
        name="password_reset_request",
    ),
    path(
        "password-reset/<str:uidb64>/<str:token>/",
        password_reset.password_reset_confirm_view,
        name="password_reset_confirm",
    ),
    path(
        "password-reset-verify/<str:uidb64>/<str:token>/",
        password_reset.password_reset_verify_token_view,
        name="password_reset_verify",
    ),
    # OAuth - Google OAuth bez allauth
    path(
        "oauth/google/login/",
        google_oauth_simple.google_login_view,
        name="google_login",
    ),
    path(
        "oauth/google/callback/",
        google_oauth_simple.google_callback_view,
        name="google_callback",
    ),
    # Allauth custom redirects - DOČASNE VYPNUTÉ
    # path('accounts/google/login/callback/', allauth_views.google_callback_redirect, name='google_callback_redirect'),
    # Debug OAuth - ODSTRÁNENÉ
    # path('debug/oauth/', debug_oauth.debug_google_oauth, name='debug_oauth'),
    # Profil
    path("profile/", views.update_profile_view, name="update_profile"),
    # Draft endpoints - pridáno bez narušenia existujúcich URL patterns
    path("draft/", profile.save_draft_view, name="save_draft"),
    path("draft/<str:draft_type>/", profile.get_draft_view, name="get_draft"),
    path("draft/<str:draft_type>/clear/", profile.clear_draft_view, name="clear_draft"),
    # Dashboard
    path("dashboard/home/", views.dashboard_home_view, name="dashboard_home"),
    path("dashboard/search/", views.dashboard_search_view, name="dashboard_search"),
    path(
        "dashboard/favorites/",
        views.dashboard_favorites_view,
        name="dashboard_favorites",
    ),
    path("dashboard/profile/", views.dashboard_profile_view, name="dashboard_profile"),
    path(
        "dashboard/users/<int:user_id>/profile/",
        views.dashboard_user_profile_detail_view,
        name="dashboard_user_profile_detail",
    ),
    path(
        "dashboard/users/<int:user_id>/skills/",
        views.dashboard_user_skills_view,
        name="dashboard_user_skills",
    ),
    # Slug-based profily (BC: nové endpointy, nemenia existujúce kontrakty)
    path(
        "dashboard/users/slug/<str:slug>/profile/",
        views.dashboard_user_profile_detail_by_slug_view,
        name="dashboard_user_profile_detail_by_slug",
    ),
    path(
        "dashboard/users/slug/<str:slug>/skills/",
        views.dashboard_user_skills_by_slug_view,
        name="dashboard_user_skills_by_slug",
    ),
    path(
        "dashboard/settings/", views.dashboard_settings_view, name="dashboard_settings"
    ),
    # Skills
    path("skills/", views.skills_list_view, name="skills_list"),
    # Recenzie - MUSIA byť PRED skills/<int:skill_id>/ lebo sú špecifickejšie
    path(
        "skills/<int:offer_id>/reviews/", views.reviews_list_view, name="reviews_list"
    ),
    path("skills/<int:skill_id>/", views.skills_detail_view, name="skills_detail"),
    path("skills/<int:skill_id>/images/", views.skill_images_view, name="skill_images"),
    path(
        "skills/<int:skill_id>/images/<int:image_id>/",
        views.skill_image_detail_view,
        name="skill_image_detail",
    ),
    # Recenzie detail
    path("reviews/<int:review_id>/", views.review_detail_view, name="review_detail"),
    # Žiadosti + notifikácie
    path("skill-requests/", views.skill_requests_view, name="skill_requests"),
    path(
        "skill-requests/status/",
        views.skill_requests_status_view,
        name="skill_requests_status",
    ),
    path(
        "skill-requests/<int:request_id>/",
        views.skill_request_detail_view,
        name="skill_request_detail",
    ),
    path("notifications/", views.notifications_list_view, name="notifications_list"),
    path(
        "notifications/unread-count/",
        views.notifications_unread_count_view,
        name="notifications_unread_count",
    ),
    path(
        "notifications/mark-all-read/",
        views.notifications_mark_all_read_view,
        name="notifications_mark_all_read",
    ),
]
