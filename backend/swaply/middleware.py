"""
Custom middleware pre Swaply
"""
import logging
import traceback
from django.http import JsonResponse
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import exception_handler
from django.middleware.csrf import CsrfViewMiddleware
from django.http import HttpResponseForbidden

logger = logging.getLogger(__name__)


class GlobalErrorHandlingMiddleware(MiddlewareMixin):
    """
    Middleware pre centrálny error handling
    """
    
    def process_exception(self, request, exception):
        """
        Zachytáva všetky neodchytané výnimky
        """
        # Log chybu
        logger.error(
            f"Unhandled exception: {str(exception)}",
            extra={
                'request_path': request.path,
                'request_method': request.method,
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
                'traceback': traceback.format_exc()
            }
        )
        
        # Ak je to API request, vráť JSON response
        if request.path.startswith('/api/'):
            return JsonResponse({
                'error': 'Internal server error',
                'message': 'Došlo k neočakávanej chybe. Skúste to znovu neskôr.',
                'code': 'INTERNAL_ERROR',
                'timestamp': str(timezone.now())
            }, status=500)
        
        # Pre ostatné requesty, nechaj Django spracovať chybu
        return None


def custom_exception_handler(exc, context):
    """
    Custom exception handler pre DRF
    """
    # Získaj štandardnú response
    response = exception_handler(exc, context)
    
    if response is not None:
        # Log chybu
        request = context.get('request')
        logger.error(
            f"API Error: {str(exc)}",
            extra={
                'request_path': request.path if request else 'unknown',
                'request_method': request.method if request else 'unknown',
                'user_agent': request.META.get('HTTP_USER_AGENT', '') if request else '',
                'user_id': getattr(request.user, 'id', None) if request and hasattr(request, 'user') else None,
                'response_status': response.status_code,
                'response_data': response.data
            }
        )
        
        # Vytvor konzistentnú error response
        custom_response_data = {
            'error': True,
            'message': 'Došlo k chybe pri spracovaní požiadavky',
            'code': get_error_code(response.status_code),
            'details': response.data if settings.DEBUG else None,
            'timestamp': str(timezone.now())
        }
        
        # Ak je to validačná chyba, uprav message
        if response.status_code == 400:
            custom_response_data['message'] = 'Neplatné údaje'
            if isinstance(response.data, dict):
                custom_response_data['validation_errors'] = response.data
        
        return Response(custom_response_data, status=response.status_code)
    
    return response


def get_error_code(status_code):
    """
    Mapuje HTTP status kódy na naše error kódy
    """
    error_codes = {
        400: 'VALIDATION_ERROR',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        405: 'METHOD_NOT_ALLOWED',
        429: 'RATE_LIMITED',
        500: 'INTERNAL_ERROR',
        502: 'BAD_GATEWAY',
        503: 'SERVICE_UNAVAILABLE'
    }
    return error_codes.get(status_code, 'UNKNOWN_ERROR')


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Middleware pre bezpečnostné hlavičky
    """
    
    def process_response(self, request, response):
        # Pridaj bezpečnostné hlavičky
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        # Z historických dôvodov ponecháme X-XSS-Protection kvôli kompatibilite testov
        response['X-XSS-Protection'] = '1; mode=block'

        # HSTS len pre secure požiadavky
        try:
            if request.is_secure():
                response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        except Exception:
            pass

        # Neprepíš CORS hlavičky – spravuje ich django-cors-headers
        return response


class EnforceCSRFMiddleware(MiddlewareMixin):
    """
    Middleware, ktorý vynúti CSRF aj pre API volania, ak sú konfigurované tak, aby CSRF vyžadovali.
    Umožňuje vypnúť v testoch cez nastavenie.
    """
    def __init__(self, get_response):
        super().__init__(get_response)
        self._csrf_mw = CsrfViewMiddleware(get_response)

    def process_request(self, request):
        from django.conf import settings
        if getattr(settings, 'CSRF_ENFORCE_API', True) is False:
            return None
        # Vlastné vynucovanie uplatňuj len pre API cesty; ostatné nech rieši štandardný CsrfViewMiddleware
        if not getattr(request, 'path', '').startswith('/api/'):
            return None
        return self._csrf_mw.process_request(request)

    def process_view(self, request, callback, callback_args, callback_kwargs):
        from django.conf import settings
        # V testoch alebo ak je špeciálne vypnuté, nespúšťaj
        if getattr(settings, 'CSRF_ENFORCE_API', True) is False:
            return None
        # Uplatni len pre API cesty; pre admin a iné ne-API cesty nechaj defaultný CsrfViewMiddleware
        if not getattr(request, 'path', '').startswith('/api/'):
            return None
        # Vynucujeme iba pre metódy, ktoré modifikujú stav – validáciu nech robí CsrfViewMiddleware (form token alebo header)
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            # Ak je povolené preskočiť CSRF pri JWT, a je prítomný Authorization: Bearer token, CSRF nekontroluj
            if getattr(settings, 'CSRF_SKIP_FOR_JWT', False):
                auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                if auth_header.startswith('Bearer '):
                    return None
            # Pre API akceptuj CSRF token z hlavičky alebo cookies
            header_token = (
                request.META.get('HTTP_X_CSRFTOKEN') or request.META.get('HTTP_X_CSRF_TOKEN')
            )
            cookie_token = request.COOKIES.get('csrftoken')
            
            if not header_token and not cookie_token:
                return HttpResponseForbidden('CSRF token missing')
            
            return self._csrf_mw.process_view(request, callback, callback_args, callback_kwargs)
        return None
