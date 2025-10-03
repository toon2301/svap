"""
URL configuration for swaply project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
import os
from accounts.views import update_profile_view

def api_root(request):
    """Root API endpoint"""
    return JsonResponse({
        'message': 'Svaply API',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth/',
            'users': '/api/users/'}
    })

"""
Pre Railway a oddelený frontend už Django neservuje frontendové HTML.
"""

urlpatterns = [
    # API endpoints
    path('api/', api_root, name='api_root'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('accounts.urls')),
    # Priama route pre profil (vyžadované testami)
    path('api/profile/', update_profile_view, name='api_profile'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # Root môže vracať jednoduchý JSON/info, frontend bude žiť na inej doméne
    path('', api_root, name='root'),
    
    # Django allauth URLs - DOČASNE VYPNUTÉ
    # path('accounts/', include('allauth.urls')),
]

# Media files (len pre development)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
