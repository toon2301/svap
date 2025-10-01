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
from django.http import JsonResponse, HttpResponse
from django.views.generic import TemplateView
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
import os

def api_root(request):
    """Root API endpoint"""
    return JsonResponse({
        'message': 'Svaply API',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth/',
            'users': '/api/users/'}
    })

def serve_frontend(request, path=''):
    """Serve frontend files"""
    frontend_root = getattr(settings, 'FRONTEND_ROOT', None)
    if not frontend_root:
        return HttpResponse('Frontend not configured', status=404)
    
    # Default to index.html for root and unknown paths
    if not path or path == '/':
        path = 'index.html'
    
    # Remove leading slash
    path = path.lstrip('/')
    
    # Build full file path
    file_path = os.path.join(frontend_root, path)
    
    # Check if file exists
    if os.path.exists(file_path) and os.path.isfile(file_path):
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Set appropriate content type
        if path.endswith('.html'):
            content_type = 'text/html'
        elif path.endswith('.js'):
            content_type = 'application/javascript'
        elif path.endswith('.css'):
            content_type = 'text/css'
        elif path.endswith('.json'):
            content_type = 'application/json'
        else:
            content_type = 'application/octet-stream'
        
        return HttpResponse(content, content_type=content_type)
    else:
        # For SPA, serve index.html for unknown routes
        index_path = os.path.join(frontend_root, 'index.html')
        if os.path.exists(index_path):
            with open(index_path, 'rb') as f:
                content = f.read()
            return HttpResponse(content, content_type='text/html')
        else:
            return HttpResponse('Frontend not found', status=404)

urlpatterns = [
    # API endpoints
    path('api/', api_root, name='api_root'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('accounts.urls')),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # Frontend - catch all for SPA
    path('', serve_frontend, name='frontend'),
    path('<path:path>', serve_frontend, name='frontend_catch_all'),
    
    # Django allauth URLs - DOČASNE VYPNUTÉ
    # path('accounts/', include('allauth.urls')),
]

# Media files (len pre development)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
