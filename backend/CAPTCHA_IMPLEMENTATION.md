# CAPTCHA implementácia pre registráciu používateľov

## Prehľad

Táto implementácia pridáva Google reCAPTCHA v2 do procesu registrácie používateľov v Django aplikácii Swaply.

## Funkcie

- ✅ Google reCAPTCHA v2 validácia
- ✅ Rate limiting pre registráciu
- ✅ Email verifikácia po registrácii
- ✅ Kompletné testy
- ✅ Konfigurovateľné nastavenia
- ✅ Testovací email backend

## Inštalácia

### 1. Nainštalujte závislosti

```bash
pip install -r requirements.txt
```

### 2. Nastavte environment premenné

Skopírujte `env_example.txt` do `.env` a upravte hodnoty:

```bash
cp env_example.txt .env
```

Kľúčové nastavenia pre CAPTCHA:
```env
CAPTCHA_ENABLED=True
CAPTCHA_SECRET_KEY=your-google-recaptcha-secret-key
CAPTCHA_SITE_KEY=your-google-recaptcha-site-key
CAPTCHA_SKIP_IN_TESTS=True
```

### 3. Vytvorte Google reCAPTCHA kľúče

1. Choďte na [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Vytvorte nový site s reCAPTCHA v2
3. Skopírujte Site Key a Secret Key do `.env` súboru

### 4. Spustite migrácie

```bash
python manage.py migrate
```

## Použitie

### Registrácia s CAPTCHA

```python
# POST /api/accounts/auth/register/
{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPassword123",
    "password_confirm": "TestPassword123",
    "user_type": "individual",
    "birth_day": "15",
    "birth_month": "6",
    "birth_year": "1990",
    "gender": "male",
    "captcha_token": "captcha_token_from_frontend"
}
```

### Email verifikácia

```python
# POST /api/accounts/auth/verify-email/
{
    "token": "verification_token_from_email"
}
```

## Testovanie

### Spustenie testov

```bash
# Všetky testy
pytest

# Len CAPTCHA testy
pytest accounts/test/test_captcha_registration.py

# S coverage reportom
pytest --cov=accounts --cov-report=html
```

### Testovacie scenáre

1. **Úspešná registrácia s platnou CAPTCHA**
2. **Neúspešná registrácia bez CAPTCHA**
3. **Neúspešná registrácia s neplatnou CAPTCHA**
4. **Email verifikácia flow**
5. **Prihlásenie len po email verifikácii**

## Konfigurácia

### CAPTCHA nastavenia

```python
# settings.py
CAPTCHA_ENABLED = True  # Zapnúť/vypnúť CAPTCHA
CAPTCHA_SECRET_KEY = 'your-secret-key'
CAPTCHA_SITE_KEY = 'your-site-key'
CAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'
CAPTCHA_SKIP_IN_TESTS = True  # Preskočiť CAPTCHA v testoch
```

### Rate limiting

```python
# Prednastavené limity
register_rate_limit = rate_limit(
    max_attempts=3, 
    window_minutes=15, 
    block_minutes=30, 
    action='register'
)
```

## Bezpečnosť

### Implementované ochrany

- ✅ CAPTCHA validácia cez Google API
- ✅ Rate limiting pre registráciu
- ✅ Email verifikácia povinná
- ✅ Input sanitization
- ✅ SQL injection ochrana
- ✅ XSS ochrana
- ✅ Audit logovanie

### Odporúčania pre produkciu

1. **Nastavte skutočné reCAPTCHA kľúče**
2. **Použite HTTPS**
3. **Nastavte správne CORS origins**
4. **Zapnite audit logovanie**
5. **Monitorujte rate limiting**

## Frontend integrácia

### HTML príklad

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://www.google.com/recaptcha/api.js" async defer></script>
</head>
<body>
    <form id="registration-form">
        <!-- Vaše registračné polia -->
        <div class="g-recaptcha" data-sitekey="YOUR_SITE_KEY"></div>
        <button type="submit">Registrovať</button>
    </form>

    <script>
        document.getElementById('registration-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const captchaResponse = grecaptcha.getResponse();
            if (!captchaResponse) {
                alert('Prosím vyplňte CAPTCHA');
                return;
            }
            
            // Pridajte captcha_token do vašich dát
            const formData = {
                // ... vaše údaje
                captcha_token: captchaResponse
            };
            
            // Pošlite na backend
            fetch('/api/accounts/auth/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.email_sent) {
                    alert('Registrácia úspešná! Skontrolujte si email.');
                }
            });
        });
    </script>
</body>
</html>
```

## Troubleshooting

### Časté problémy

1. **CAPTCHA validácia zlyháva**
   - Skontrolujte, či sú správne nastavené SECRET_KEY a SITE_KEY
   - Overte, či je CAPTCHA_ENABLED=True

2. **Testy zlyhávajú**
   - Nastavte CAPTCHA_SKIP_IN_TESTS=True
   - Skontrolujte, či sú nainštalované pytest závislosti

3. **Email sa neodosiela**
   - V DEBUG móde sa používa console backend
   - Pre produkciu nastavte správne SMTP nastavenia

### Debug režim

```python
# Pre debug CAPTCHA validácie
import logging
logging.getLogger('swaply').setLevel(logging.DEBUG)
```

## API dokumentácia

### Registračný endpoint

**GET** `/api/accounts/auth/register/`
- Vráti informácie o požadovaných poliach a CAPTCHA nastaveniach

**POST** `/api/accounts/auth/register/`
- Vytvorí nového používateľa s email verifikáciou
- Vyžaduje platný CAPTCHA token

### Email verifikačný endpoint

**POST** `/api/accounts/auth/verify-email/`
- Overí email adresu pomocou tokenu
- Vráti JWT tokeny pre automatické prihlásenie

## Licencia

Táto implementácia je súčasťou Swaply projektu.
