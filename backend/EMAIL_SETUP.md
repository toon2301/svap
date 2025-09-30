# Email konfigurácia pre Swaply

## 1. Nastavenie Gmail App Password

1. **Povoľ 2FA na svojom Gmail účte:**
   - Choď na https://myaccount.google.com/security
   - Zapni "2-Step Verification"

2. **Vytvor App Password:**
   - Choď na https://myaccount.google.com/apppasswords
   - Vyber "Mail" a "Other (Custom name)"
   - Zadaj názov: "Swaply Django"
   - Skopíruj vygenerované heslo (16 znakov)

## 2. Nastavenie environment premenných

Vytvor súbor `.env` v `backend/` priečinku:

```bash
# Email konfigurácia
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-16-character-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

## 3. Inštalácia python-dotenv

```bash
pip install python-dotenv
```

## 4. Aktualizácia settings.py

Pridaj na začiatok `settings.py`:

```python
from dotenv import load_dotenv
load_dotenv()
```

## 5. Testovanie

Spusti Django server a otestuj registráciu:

```bash
python manage.py runserver
```

## Alternatívne email poskytovatelia

### Outlook/Hotmail:
```python
EMAIL_HOST = 'smtp-mail.outlook.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
```

### SendGrid:
```python
EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'apikey'
EMAIL_HOST_PASSWORD = 'your-sendgrid-api-key'
```

### Mailgun:
```python
EMAIL_HOST = 'smtp.mailgun.org'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-mailgun-smtp-username'
EMAIL_HOST_PASSWORD = 'your-mailgun-smtp-password'
```
