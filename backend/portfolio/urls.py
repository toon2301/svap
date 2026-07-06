from django.urls import path

from . import image_views, local_upload_views, views

urlpatterns = [
    path("portfolio/", views.my_portfolio_list_view, name="portfolio_list"),
    path(
        "portfolio/reorder/",
        views.portfolio_items_reorder_view,
        name="portfolio_reorder",
    ),
    path(
        "portfolio/<int:item_id>/",
        views.portfolio_item_detail_view,
        name="portfolio_detail",
    ),
    path(
        "portfolio/<int:item_id>/images/upload-init/",
        image_views.portfolio_image_upload_init_view,
        name="portfolio_image_upload_init",
    ),
    path(
        "portfolio/<int:item_id>/images/upload-complete/",
        image_views.portfolio_image_upload_complete_view,
        name="portfolio_image_upload_complete",
    ),
    path(
        "portfolio/images/local-upload/",
        local_upload_views.portfolio_image_local_upload_view,
        name="portfolio_image_local_upload",
    ),
    path(
        "portfolio/<int:item_id>/images/<int:image_id>/",
        image_views.portfolio_image_detail_view,
        name="portfolio_image_detail",
    ),
    path(
        "portfolio/<int:item_id>/images/<int:image_id>/cover/",
        image_views.portfolio_image_cover_view,
        name="portfolio_image_cover",
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
