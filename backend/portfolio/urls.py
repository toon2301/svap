from django.urls import path

from . import views

urlpatterns = [
    path("portfolio/", views.my_portfolio_list_view, name="portfolio_list"),
    path(
        "portfolio/<int:item_id>/",
        views.portfolio_item_detail_view,
        name="portfolio_detail",
    ),
    path(
        "dashboard/users/<int:user_id>/portfolio/",
        views.user_portfolio_list_view,
        name="dashboard_user_portfolio",
    ),
    path(
        "dashboard/users/slug/<str:slug>/portfolio/",
        views.user_portfolio_list_by_slug_view,
        name="dashboard_user_portfolio_by_slug",
    ),
]
