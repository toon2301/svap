"""
Audit logging systém pre Swaply
"""
import logging
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import models
from django.conf import settings
import json

User = get_user_model()
audit_logger = logging.getLogger('audit')


class AuditLog:
    """
    Trieda pre audit logovanie
    """
    
    @staticmethod
    def log_user_action(user, action, details=None, ip_address=None, user_agent=None):
        """
        Loguje akcie používateľa
        """
        # Skontroluj, či je audit logging povolený
        if not getattr(settings, 'AUDIT_LOGGING_ENABLED', True):
            return
            
        audit_logger.info(
            f"User action: {action}",
            extra={
                'user_id': user.id if user and user.is_authenticated else None,
                'user_email': user.email if user and user.is_authenticated else None,
                'action': action,
                'details': details or {},
                'ip_address': ip_address,
                'user_agent': user_agent,
                'timestamp': timezone.now().isoformat(),
                'log_type': 'user_action'
            }
        )
    
    @staticmethod
    def log_security_event(event_type, details=None, ip_address=None, user_agent=None, user=None):
        """
        Loguje bezpečnostné udalosti
        """
        audit_logger.warning(
            f"Security event: {event_type}",
            extra={
                'user_id': user.id if user and user.is_authenticated else None,
                'user_email': user.email if user and user.is_authenticated else None,
                'event_type': event_type,
                'details': details or {},
                'ip_address': ip_address,
                'user_agent': user_agent,
                'timestamp': timezone.now().isoformat(),
                'log_type': 'security_event'
            }
        )
    
    @staticmethod
    def log_api_access(endpoint, method, user=None, ip_address=None, user_agent=None, status_code=None):
        """
        Loguje prístup k API endpointom
        """
        audit_logger.info(
            f"API access: {method} {endpoint}",
            extra={
                'user_id': user.id if user and user.is_authenticated else None,
                'user_email': user.email if user and user.is_authenticated else None,
                'endpoint': endpoint,
                'method': method,
                'status_code': status_code,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'timestamp': timezone.now().isoformat(),
                'log_type': 'api_access'
            }
        )
    
    @staticmethod
    def log_data_change(model_name, object_id, action, user=None, changes=None, ip_address=None):
        """
        Loguje zmeny dát
        """
        audit_logger.info(
            f"Data change: {action} {model_name}",
            extra={
                'user_id': user.id if user and user.is_authenticated else None,
                'user_email': user.email if user and user.is_authenticated else None,
                'model_name': model_name,
                'object_id': object_id,
                'action': action,
                'changes': changes or {},
                'ip_address': ip_address,
                'timestamp': timezone.now().isoformat(),
                'log_type': 'data_change'
            }
        )


def audit_user_action(action, details=None):
    """
    Decorator pre audit logovanie používateľských akcií
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            # Získaj informácie o requeste
            ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT')
            user = getattr(request, 'user', None)
            
            # Loguj akciu
            AuditLog.log_user_action(
                user=user,
                action=action,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def audit_api_access(endpoint_name=None):
    """
    Decorator pre audit logovanie API prístupov
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            # Získaj informácie o requeste
            ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT')
            user = getattr(request, 'user', None)
            endpoint = endpoint_name or request.path
            method = request.method
            
            # Loguj prístup
            AuditLog.log_api_access(
                endpoint=endpoint,
                method=method,
                user=user,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            response = view_func(request, *args, **kwargs)
            
            # Loguj status code
            if hasattr(response, 'status_code'):
                AuditLog.log_api_access(
                    endpoint=endpoint,
                    method=method,
                    user=user,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    status_code=response.status_code
                )
            
            return response
        return wrapper
    return decorator


# Prednastavené audit logy pre bežné akcie
def log_login_success(user, ip_address, user_agent):
    """Loguje úspešné prihlásenie"""
    AuditLog.log_user_action(
        user=user,
        action='login_success',
        details={'login_method': 'email_password'},
        ip_address=ip_address,
        user_agent=user_agent
    )


def log_login_failed(email, ip_address, user_agent, reason='invalid_credentials'):
    """Loguje neúspešné prihlásenie"""
    AuditLog.log_security_event(
        event_type='login_failed',
        details={'email': email, 'reason': reason},
        ip_address=ip_address,
        user_agent=user_agent
    )


def log_registration_success(user, ip_address, user_agent):
    """Loguje úspešnú registráciu"""
    AuditLog.log_user_action(
        user=user,
        action='registration_success',
        details={'user_type': user.user_type},
        ip_address=ip_address,
        user_agent=user_agent
    )


def log_email_verification_success(user, ip_address, user_agent):
    """Loguje úspešnú email verifikáciu"""
    AuditLog.log_user_action(
        user=user,
        action='email_verification_success',
        details={},
        ip_address=ip_address,
        user_agent=user_agent
    )


def log_email_verification_failed(token, ip_address, user_agent, reason='invalid_token'):
    """Loguje neúspešnú email verifikáciu"""
    AuditLog.log_security_event(
        event_type='email_verification_failed',
        details={'token': str(token)[:8] + '...', 'reason': reason},
        ip_address=ip_address,
        user_agent=user_agent
    )


def log_profile_update(user, changes, ip_address, user_agent):
    """Loguje aktualizáciu profilu"""
    AuditLog.log_data_change(
        model_name='UserProfile',
        object_id=user.id,
        action='update',
        user=user,
        changes=changes,
        ip_address=ip_address
    )
    AuditLog.log_user_action(
        user=user,
        action='profile_update',
        details={'changes': list(changes.keys())},
        ip_address=ip_address,
        user_agent=user_agent
    )
