"""
Centralizované validátory pre Swaply aplikáciu
"""
import re
import logging
import requests
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.conf import settings
import bleach

logger = logging.getLogger('swaply')

class EmailValidator:
    """Validátor pre email adresy"""
    
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    @classmethod
    def validate_email(cls, email):
        """Validuje email adresu"""
        if not email:
            raise ValidationError(_('Email je povinný'))
        
        if not cls.EMAIL_REGEX.match(email):
            raise ValidationError(_('Zadajte platnú emailovú adresu'))
        
        # Kontrola dĺžky
        if len(email) > 254:
            raise ValidationError(_('Email je príliš dlhý'))
        
        return email

class PasswordValidator:
    """Validátor pre heslá"""
    
    @classmethod
    def validate_password(cls, password):
        """Validuje heslo podľa bezpečnostných požiadaviek"""
        if not password:
            raise ValidationError(_('Heslo je povinné'))
        
        if len(password) < 8:
            raise ValidationError(_('Heslo musí mať aspoň 8 znakov'))
        
        if len(password) > 128:
            raise ValidationError(_('Heslo je príliš dlhé'))
        
        # Kontrola komplexity
        if not re.search(r'[A-Z]', password):
            raise ValidationError(_('Heslo musí obsahovať aspoň jedno veľké písmeno'))
        
        if not re.search(r'[a-z]', password):
            raise ValidationError(_('Heslo musí obsahovať aspoň jedno malé písmeno'))
        
        if not re.search(r'\d', password):
            raise ValidationError(_('Heslo musí obsahovať aspoň jedno číslo'))
        
        # Kontrola bežných hesiel
        common_passwords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ]
        
        if password.lower() in common_passwords:
            raise ValidationError(_('Heslo je príliš jednoduché'))
        
        return password

class NameValidator:
    """Validátor pre mená a priezviská"""
    
    @classmethod
    def validate_name(cls, name, field_name='Meno'):
        """Validuje meno alebo priezvisko"""
        if not name:
            raise ValidationError(_(f'{field_name} je povinné'))
        
        if len(name.strip()) < 2:
            raise ValidationError(_(f'{field_name} musí mať aspoň 2 znaky'))
        
        if len(name.strip()) > 50:
            raise ValidationError(_(f'{field_name} môže mať maximálne 50 znakov'))
        
        # Kontrola na neplatné znaky
        if not re.match(r'^[a-zA-ZáčďéěíĺľňóôŕšťúýžÁČĎÉĚÍĹĽŇÓÔŔŠŤÚÝŽ\s-]+$', name.strip()):
            raise ValidationError(_(f'{field_name} môže obsahovať len písmená, medzery a pomlčky'))
        
        return name.strip()

class PhoneValidator:
    """Validátor pre telefónne čísla"""
    
    PHONE_REGEX = re.compile(r'^[\+]?[0-9\s\-\(\)]{9,}$')
    
    @classmethod
    def validate_phone(cls, phone):
        """Validuje telefónne číslo"""
        if not phone:
            return None  # Telefón je voliteľný
        
        # Odstráň všetky medzery a pomlčky
        clean_phone = re.sub(r'[\s\-]', '', phone)
        
        if not cls.PHONE_REGEX.match(clean_phone):
            raise ValidationError(_('Zadajte platné telefónne číslo'))
        
        # Kontrola dĺžky
        if len(clean_phone) < 9 or len(clean_phone) > 15:
            raise ValidationError(_('Telefónne číslo má neplatnú dĺžku'))
        
        return phone

class URLValidator:
    """Validátor pre URL adresy"""
    
    @classmethod
    def validate_url(cls, url, field_name='URL'):
        """Validuje URL adresu"""
        if not url:
            return None  # URL je voliteľné
        
        if not url.startswith(('http://', 'https://')):
            raise ValidationError(_(f'{field_name} musí začínať s http:// alebo https://'))
        
        if len(url) > 200:
            raise ValidationError(_(f'{field_name} je príliš dlhá'))
        
        return url

class BioValidator:
    """Validátor pre bio text"""
    
    @classmethod
    def validate_bio(cls, bio):
        """Validuje bio text"""
        if not bio:
            return None  # Bio je voliteľné
        
        if len(bio.strip()) < 10:
            raise ValidationError(_('Bio musí mať aspoň 10 znakov'))
        
        if len(bio.strip()) > 500:
            raise ValidationError(_('Bio môže mať maximálne 500 znakov'))
        
        return bio.strip()


class HtmlSanitizer:
    """Sanitizácia HTML obsahu (odfiltrovanie nebezpečných tagov/atribútov)"""

    ALLOWED_TAGS = [
        'b', 'i', 'em', 'strong', 'u', 'p', 'ul', 'ol', 'li', 'br', 'span'
    ]
    ALLOWED_ATTRIBUTES = {
        'a': ['href', 'title', 'rel'],
        'span': ['class'],
    }

    @classmethod
    def sanitize_html(cls, html: str) -> str:
        if not isinstance(html, str) or not html:
            return html
        cleaned = bleach.clean(
            html,
            tags=cls.ALLOWED_TAGS,
            attributes=cls.ALLOWED_ATTRIBUTES,
            strip=True
        )
        return cleaned

class SecurityValidator:
    """Bezpečnostné validátory"""
    
    @classmethod
    def validate_input_safety(cls, input_data):
        """Validuje vstupné údaje na bezpečnostné hrozby"""
        if not isinstance(input_data, str):
            return input_data
        
        # Kontrola na SQL injection patterns
        sql_patterns = [
            r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)',
            r'(\b(OR|AND)\s+\d+\s*=\s*\d+)',
            r'(\'|\"|;|--|\/\*|\*\/)',
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, input_data, re.IGNORECASE):
                logger.warning(f"Potential SQL injection attempt detected: {input_data}")
                raise ValidationError(_('Neplatné znaky v vstupných údajoch'))
        
        # Kontrola na XSS patterns
        xss_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'on\w+\s*=',
            r'<iframe[^>]*>',
        ]
        
        # Najprv očistíme bežné skript tagy, ale nevyhadzujme 400 pre bežný obsah – sanitizácia prebehne v serializeri
        for pattern in xss_patterns:
            if re.search(pattern, input_data, re.IGNORECASE):
                logger.warning(f"Potential XSS attempt detected: {input_data}")
                # ponechaj validáciu na vyššej vrstve (sanitizér), tu už nevyhadzuj výnimku
                return input_data
        
        return input_data

class RateLimitValidator:
    """Validátor pre rate limiting"""
    
    @classmethod
    def validate_rate_limit(cls, request, action, limit_key):
        """Validuje rate limit pre danú akciu"""
        from .rate_limiting import get_client_ip
        
        ip_address = get_client_ip(request)
        
        # Tu by sa mohla pridať logika pre kontrolu rate limitu
        # Momentálne je to riešené cez dekorátory
        
        return True


class CAPTCHAValidator:
    """Validátor pre Google reCAPTCHA"""
    
    @classmethod
    def validate_captcha(cls, captcha_token):
        """Validuje CAPTCHA token cez Google reCAPTCHA API"""
        # DEBUG: Log CAPTCHA settings
        logger.info(f"🔍 DEBUG CAPTCHA: Starting validation")
        logger.info(f"🔍 DEBUG CAPTCHA: CAPTCHA_ENABLED = {getattr(settings, 'CAPTCHA_ENABLED', True)}")
        logger.info(f"🔍 DEBUG CAPTCHA: CAPTCHA_VERIFY_URL = {getattr(settings, 'CAPTCHA_VERIFY_URL', 'NOT SET')}")
        
        secret_key = getattr(settings, 'CAPTCHA_SECRET_KEY', 'NOT SET')
        logger.info(f"🔍 DEBUG CAPTCHA: CAPTCHA_SECRET_KEY = {secret_key[:15]}... (first 15 chars)")
        
        # Skontroluj, či je CAPTCHA povolená
        if not getattr(settings, 'CAPTCHA_ENABLED', True):
            logger.info(f"🔍 DEBUG CAPTCHA: CAPTCHA is disabled, skipping validation")
            return True
        
        # V testoch preskoč validáciu ak je to povolené
        if getattr(settings, 'CAPTCHA_SKIP_IN_TESTS', True):
            import sys
            if 'pytest' in sys.modules or 'test' in sys.argv:
                logger.info(f"🔍 DEBUG CAPTCHA: Running in tests, skipping validation")
                return True
        
        if not captcha_token:
            logger.error(f"🔍 DEBUG CAPTCHA: Token is empty!")
            raise ValidationError(_('CAPTCHA je povinná'))
        
        logger.info(f"🔍 DEBUG CAPTCHA: Token received (length: {len(captcha_token)})")
        logger.info(f"🔍 DEBUG CAPTCHA: Token first 50 chars: {captcha_token[:50]}...")
        
        # Validuj token cez Google API
        try:
            verify_data = {
                'secret': settings.CAPTCHA_SECRET_KEY,
                'response': captcha_token
            }
            
            logger.info(f"🔍 DEBUG CAPTCHA: Sending verification request to Google API...")
            
            response = requests.post(
                settings.CAPTCHA_VERIFY_URL,
                data=verify_data,
                timeout=10
            )
            
            logger.info(f"🔍 DEBUG CAPTCHA: Google API response status: {response.status_code}")
            
            result = response.json()
            logger.info(f"🔍 DEBUG CAPTCHA: Google API response: {result}")
            
            if not result.get('success', False):
                error_codes = result.get('error-codes', [])
                logger.error(f"🔍 DEBUG CAPTCHA: Validation FAILED!")
                logger.error(f"🔍 DEBUG CAPTCHA: Error codes: {error_codes}")
                logger.error(f"🔍 DEBUG CAPTCHA: Full response: {result}")
                logger.warning(f"CAPTCHA validation failed: {result}")
                raise ValidationError(_('CAPTCHA validácia zlyhala'))
            
            # Kontrola skóre (pre reCAPTCHA v3)
            score = result.get('score', 1.0)
            logger.info(f"🔍 DEBUG CAPTCHA: Score: {score}")
            
            if score < 0.5:
                logger.error(f"🔍 DEBUG CAPTCHA: Score too low: {score}")
                logger.warning(f"CAPTCHA score too low: {score}")
                raise ValidationError(_('CAPTCHA skóre je príliš nízke'))
            
            logger.info(f"🔍 DEBUG CAPTCHA: Validation SUCCESS! ✅")
            return True
            
        except requests.RequestException as e:
            logger.error(f"🔍 DEBUG CAPTCHA: Request exception: {e}")
            logger.error(f"CAPTCHA API request failed: {e}")
            raise ValidationError(_('Chyba pri validácii CAPTCHA'))
        except Exception as e:
            logger.error(f"🔍 DEBUG CAPTCHA: General exception: {e}")
            logger.error(f"CAPTCHA validation error: {e}")
            raise ValidationError(_('Neplatná CAPTCHA'))


def validate_image_file(value):
    """Validátor pre obrázkové súbory"""
    import os
    from django.core.exceptions import ValidationError
    from .image_moderation import check_image_safety
    
    # Kontrola veľkosti súboru (max 5MB)
    if value.size > 5 * 1024 * 1024:
        raise ValidationError('Obrázok je príliš veľký. Maximálna veľkosť je 5MB.')
    
    # Kontrola typu súboru
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    ext = os.path.splitext(value.name)[1].lower()
    
    if ext not in allowed_extensions:
        raise ValidationError('Neplatný typ súboru. Povolené sú len JPG, PNG, GIF a WebP súbory.')
    
    # SafeSearch kontrola – len ak je povolená
    try:
        if getattr(settings, 'SAFESEARCH_ENABLED', True):
            # Uistime sa, že máme file-like objekt
            file_obj = getattr(value, 'file', None) or value
            check_image_safety(file_obj)
    except ValidationError:
        raise
    except Exception as e:
        # Ak by sa čokoľvek pokazilo, riadi sa to režimom FAIL_OPEN/FAIL_CLOSED v image_moderation
        logger.warning(f"SafeSearch wrapper error: {e}")
        if not getattr(settings, 'SAFESEARCH_FAIL_OPEN', True):
            raise ValidationError(_('Kontrola bezpečnosti obrázka zlyhala, skúste neskôr.'))

    return value