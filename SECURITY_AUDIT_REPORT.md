# 🔒 BEZPEČNOSTNÝ AUDIT REPORT
## Swaply - Fintech/Banková úroveň bezpečnosti

**Dátum:** 2024  
**Auditor:** AI Security Architect  
**Metodika:** AGENT_SECURITY_RULES.md (Zero Trust, Defense in Depth, Least Privilege, Secure by Default)

---

## 📋 EXECUTIVE SUMMARY

Aplikácia má **dobrú základnú bezpečnostnú architektúru**, ale identifikované sú **kritické medzery** v transakčnom spracovaní, audit logovaní a niektorých bezpečnostných nastaveniach. **Odporúčané okamžité opatrenia** pre produkciu.

**Celkové hodnotenie:** 🟡 **STREDNÉ RIZIKO** (s potenciálom na vysoké riziko pri škálovaní)

---

## ✅ SPLNENÉ POŽIADAVKY

### 1. Autentifikácia ✅
- **JWT autentifikácia:** `SwaplyJWTAuthentication` s Redis blacklist fallback
- **Cookie podpora:** HttpOnly cookies pre access token
- **Token blacklisting:** Implementované s Redis fallback
- **Inactive user check:** Kontrola `is_active` pri autentifikácii

**Status:** ✅ **SPLNENÉ**

### 2. Autorizácia ✅
- **Django REST Framework:** `IsAuthenticated` permission classes
- **Default:** `DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]`
- **Explicitné dekorátory:** Všetky endpoints majú `@permission_classes`

**Status:** ✅ **SPLNENÉ**

### 3. Object-Level Kontrola (IDOR Protection) ✅
- **Skills:** `is_owner = skill.user_id == request.user.id` kontrola
- **Reviews:** `is_owner = review.reviewer_id == request.user.id` kontrola
- **Skill Requests:** `if request.user.id not in (obj.requester_id, obj.recipient_id)`
- **Profile:** Implicitne via `request.user` objekt

**Status:** ✅ **SPLNENÉ** (s poznámkami nižšie)

### 4. Validácia Vstupov ✅
- **SecurityValidator:** SQL injection a XSS pattern detection
- **Serializers:** Django REST Framework validácia
- **Email validácia:** `EmailValidator.validate_email()`
- **URL validácia:** `URLValidator.validate_url()`
- **HTML sanitizácia:** `HtmlSanitizer.sanitize_html()`

**Status:** ✅ **SPLNENÉ**

### 5. Ochrana proti Injection ✅
- **SQL Injection:** Django ORM (parametrizované dotazy)
- **XSS:** SecurityValidator pattern matching + HTML sanitizácia
- **Command Injection:** N/A (žiadne shell commands)

**Status:** ✅ **SPLNENÉ**

### 6. Rate Limiting ✅
- **Decorator:** `@rate_limit`, `@api_rate_limit`, `@login_rate_limit`, `@register_rate_limit`
- **Redis-based:** RateLimiter s Redis backend
- **IP + User tracking:** `identifier = f"user:{user.id}"` alebo `f"ip:{ip}"`
- **Configurable:** Rôzne limity pre DEBUG vs production

**Status:** ✅ **SPLNENÉ**

### 7. Security Headers ✅
- **SecurityMiddleware:** ✅ Zapnutý
- **SECURE_SSL_REDIRECT:** ✅ True (production)
- **SESSION_COOKIE_SECURE:** ✅ True (production)
- **CSRF_COOKIE_SECURE:** ✅ True (production)
- **SESSION_COOKIE_HTTPONLY:** ✅ True
- **CSRF_COOKIE_HTTPONLY:** ⚠️ False (intentional pre frontend auth flow)
- **SECURE_HSTS_SECONDS:** ✅ 31536000
- **SECURE_HSTS_INCLUDE_SUBDOMAINS:** ✅ True
- **SECURE_HSTS_PRELOAD:** ✅ True
- **X_FRAME_OPTIONS:** ✅ "DENY"
- **SECURE_CONTENT_TYPE_NOSNIFF:** ✅ True
- **SECURE_BROWSER_XSS_FILTER:** ⚠️ True (deprecated v Django 4.0+, ale neškodí)

**Status:** ✅ **SPLNENÉ** (s poznámkami)

### 8. Audit Logging ✅
- **AuditLog class:** Implementovaná s JSON formátovaním
- **Log types:** user_action, security_event, api_access, data_change
- **Structured logging:** Extra fields pre IP, user_agent, timestamp
- **Security events:** `log_login_failed()`, `log_email_verification_failed()`

**Status:** ✅ **ČÁSTOČNE SPLNENÉ** (nie všade používané)

---

## 🔴 KRITICKÉ RIZIKÁ

### R1: Chýbajúce Transakcie v Write Operáciách
**Závažnosť:** 🔴 **VYSOKÁ**

**Problém:**
Nie všetky write operácie sú zabalené v `transaction.atomic()`. To môže viesť k:
- Nekonzistentnému stavu databázy pri chybách
- Race conditions pri súčasných requestoch
- Strate dát pri čiastočných zmenách

**Lokácie:**

```python
# ❌ CHÝBA TRANSACTION
# backend/accounts/views/skills.py:72
serializer.save(user=request.user)  # Vytvorenie skill bez transakcie

# ❌ CHÝBA TRANSACTION
# backend/accounts/views/skills.py:138
serializer.save()  # Update skill bez transakcie

# ❌ CHÝBA TRANSACTION
# backend/accounts/views/skills.py:144
skill.delete()  # Delete bez transakcie

# ❌ CHÝBA TRANSACTION
# backend/accounts/views/skills.py:210
img = OfferedSkillImage.objects.create(...)  # Create image bez transakcie

# ❌ CHÝBA TRANSACTION
# backend/accounts/views/profile.py:55
serializer.save()  # Profile update bez transakcie

# ❌ CHÝBA TRANSACTION
# backend/accounts/views/skill_requests.py:128
obj = SkillRequest.objects.create(...)  # Create request bez transakcie

# ❌ CHÝBA TRANSACTION
# backend/accounts/views/skill_requests.py:279-285
obj.save(update_fields=["status", "updated_at"])  # Status update bez transakcie

# ❌ CHÝBA TRANSACTION
# backend/accounts/views/reviews.py:82
review = serializer.save(...)  # Create review bez transakcie

# ❌ CHÝBA TRANSACTION
# backend/accounts/views/reviews.py:137
serializer.save()  # Update review bez transakcie

# ❌ CHÝBA TRANSACTION
# backend/accounts/views/reviews.py:143
review.delete()  # Delete review bez transakcie

# ❌ CHÝBA TRANSACTION
# backend/accounts/views/google_oauth_simple.py:221
user.save()  # OAuth user update bez transakcie

# ❌ CHÝBA TRANSACTION
# backend/accounts/views/google_oauth_simple.py:241
user = User.objects.create_user(...)  # OAuth user creation bez transakcie
```

**Riešenie:**
```python
from django.db import transaction

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skills_list_view(request):
    if request.method == "POST":
        serializer = OfferedSkillSerializer(...)
        if serializer.is_valid():
            with transaction.atomic():
                serializer.save(user=request.user)
                # Audit log
                AuditLog.log_data_change(...)
            return Response(...)
```

**Priorita:** 🔴 **OKAMŽITÁ** (pre produkciu)

---

### R2: Chýbajúce Audit Logging v Write Operáciách
**Závažnosť:** 🟡 **STREDNÁ**

**Problém:**
Nie všetky write operácie sú auditované. Bez audit trailu nie je možné:
- Sledovať zmeny dát
- Detegovať neoprávnené prístupy
- Vykonať forenznú analýzu pri incidentoch

**Lokácie:**

```python
# ❌ CHÝBA AUDIT LOG
# backend/accounts/views/skills.py:72
serializer.save(user=request.user)  # Žiadny audit log

# ❌ CHÝBA AUDIT LOG
# backend/accounts/views/skills.py:144
skill.delete()  # Žiadny audit log

# ❌ CHÝBA AUDIT LOG
# backend/accounts/views/skill_requests.py:128
obj = SkillRequest.objects.create(...)  # Žiadny audit log

# ❌ CHÝBA AUDIT LOG
# backend/accounts/views/reviews.py:82
review = serializer.save(...)  # Žiadny audit log

# ❌ CHÝBA AUDIT LOG
# backend/accounts/views/reviews.py:143
review.delete()  # Žiadny audit log
```

**Riešenie:**
```python
from swaply.audit_logger import AuditLog

with transaction.atomic():
    skill = serializer.save(user=request.user)
    AuditLog.log_data_change(
        model_name="OfferedSkill",
        object_id=skill.id,
        action="create",
        user=request.user,
        changes=serializer.validated_data,
        ip_address=request.META.get("REMOTE_ADDR")
    )
```

**Priorita:** 🟡 **VYSOKÁ** (pre compliance)

---

### R3: Race Condition v Skill Creation Limit Check
**Závažnosť:** 🟡 **STREDNÁ**

**Problém:**
Kontrola limitu 3 karty sa vykonáva pred vytvorením, ale nie je v transakcii. Súčasné requesty môžu prekročiť limit.

**Lokácia:**
```python
# backend/accounts/views/skills.py:53-62
count_by_type = OfferedSkill.objects.filter(
    user=request.user, is_seeking=is_seeking
).count()

if count_by_type >= 3:
    return Response({"error": "..."})

# ⚠️ RACE CONDITION: Medzi count() a save() môže iný request vytvoriť kartu
serializer.save(user=request.user)
```

**Riešenie:**
```python
with transaction.atomic():
    # SELECT FOR UPDATE lock
    count_by_type = OfferedSkill.objects.select_for_update().filter(
        user=request.user, is_seeking=is_seeking
    ).count()
    
    if count_by_type >= 3:
        return Response({"error": "..."})
    
    serializer.save(user=request.user)
```

**Priorita:** 🟡 **VYSOKÁ**

---

### R4: SESSION_COOKIE_SAMESITE Nie Je Explicitne Nastavené
**Závažnosť:** 🟡 **STREDNÁ**

**Problém:**
`SESSION_COOKIE_SAMESITE` nie je explicitne nastavené v `settings_production.py`. Django default je "Lax", čo môže spôsobiť problémy pri cross-origin setup.

**Lokácia:**
```python
# backend/swaply/settings_split/cors_csrf.py:56
CSRF_COOKIE_SAMESITE = "None" if (not DEBUG and CSRF_COOKIE_SECURE) else "Lax"
# ✅ CSRF má explicitné nastavenie

# ❌ SESSION_COOKIE_SAMESITE chýba explicitné nastavenie
```

**Riešenie:**
```python
# backend/swaply/settings_production.py alebo cors_csrf.py
SESSION_COOKIE_SAMESITE = "None" if (not DEBUG and SESSION_COOKIE_SECURE) else "Lax"
```

**Priorita:** 🟡 **STREDNÁ**

---

### R5: OAuth User Creation Bez Transakcie
**Závažnosť:** 🟡 **STREDNÁ**

**Problém:**
Google OAuth vytvára používateľa bez transakcie. Ak zlyhá vytvorenie profilu alebo email verifikácie, zostane nekonzistentný stav.

**Lokácia:**
```python
# backend/accounts/views/google_oauth_simple.py:241
user = User.objects.create_user(...)  # Bez transakcie
# Potom sa vytvára UserProfile? EmailVerification?
```

**Riešenie:**
```python
with transaction.atomic():
    user = User.objects.create_user(...)
    UserProfile.objects.create(user=user)
    EmailVerification.objects.create(user=user)
    AuditLog.log_user_action(...)
```

**Priorita:** 🟡 **VYSOKÁ**

---

## 🟡 STREDNÉ RIZIKÁ

### R6: Chýbajúca Explicitná IDOR Ochrana v Niektorých Endpoints
**Závažnosť:** 🟡 **STREDNÁ**

**Poznámka:**
Väčšina endpoints má dobrú IDOR ochranu, ale treba skontrolovať:

```python
# ✅ DOBRÁ OCHRANA
# backend/accounts/views/skills.py:92
is_owner = skill.user_id == request.user.id
if not is_owner:
    return Response({"error": "..."}, status=404)

# ⚠️ POTREBNÁ KONTROLA
# backend/accounts/views/skill_requests.py:194
qs = SkillRequest.objects.filter(requester=request.user, offer_id__in=ids)
# ✅ Filter je správny, ale treba overiť, že offer_id patrí správnemu používateľovi
```

**Odporúčanie:**
Pridať explicitnú kontrolu vlastníctva pre všetky sensitive operácie.

**Priorita:** 🟡 **STREDNÁ**

---

### R7: Password Reset Bez Rate Limiting
**Závažnosť:** 🟡 **STREDNÁ**

**Problém:**
Password reset endpoint nemá explicitný rate limiting decorator.

**Lokácia:**
```python
# backend/accounts/views/password_reset.py:24
@api_view(["POST"])
@permission_classes([AllowAny])
# ❌ Chýba @rate_limit decorator
def password_reset_request_view(request):
```

**Riešenie:**
```python
@api_view(["POST"])
@permission_classes([AllowAny])
@rate_limit(max_attempts=5, window_minutes=15, block_minutes=60, action="password_reset")
def password_reset_request_view(request):
```

**Priorita:** 🟡 **STREDNÁ**

---

### R8: Email Verification Token Exposure v Logs
**Závažnosť:** 🟡 **NÍZKA** (len v DEBUG)

**Problém:**
V DEBUG móde sa loguje token (skrátený), ale stále môže byť riziko.

**Lokácia:**
```python
# backend/swaply/audit_logger.py:231
details={"token": str(token)[:8] + "...", "reason": reason}
```

**Status:** ✅ **OK** (len prvých 8 znakov), ale treba overiť, že v produkcii sa neloguje.

**Priorita:** 🟢 **NÍZKA**

---

## 🟢 NÍZKE RIZIKÁ / ZLEPŠENIA

### R9: CSRF_COOKIE_HTTPONLY = False
**Závažnosť:** 🟢 **NÍZKA** (intentional)

**Status:** ✅ **OK** - Intentional pre frontend auth flow. CSRF token musí byť dostupný cez JavaScript.

**Poznámka:** Toto je správne rozhodnutie pre cross-origin setup.

---

### R10: Chýbajúce Explicitné Error Handling v Niektorých Miestach
**Závažnosť:** 🟢 **NÍZKA**

**Odporúčanie:**
Pridať explicitné exception handling pre databázové operácie.

---

## 📊 SÚHRN RIZÍK

| ID | Riziko | Závažnosť | Priorita | Status |
|---|---|---|---|---|
| R1 | Chýbajúce transakcie | 🔴 VYSOKÁ | OKAMŽITÁ | ❌ Neriešené |
| R2 | Chýbajúce audit logging | 🟡 STREDNÁ | VYSOKÁ | ❌ Neriešené |
| R3 | Race condition v limite | 🟡 STREDNÁ | VYSOKÁ | ❌ Neriešené |
| R4 | SESSION_COOKIE_SAMESITE | 🟡 STREDNÁ | STREDNÁ | ❌ Neriešené |
| R5 | OAuth bez transakcie | 🟡 STREDNÁ | VYSOKÁ | ❌ Neriešené |
| R6 | IDOR kontrola | 🟡 STREDNÁ | STREDNÁ | ⚠️ Čiastočne |
| R7 | Password reset rate limit | 🟡 STREDNÁ | STREDNÁ | ❌ Neriešené |
| R8 | Token v logs | 🟡 NÍZKA | NÍZKA | ✅ OK |
| R9 | CSRF_COOKIE_HTTPONLY | 🟢 NÍZKA | N/A | ✅ Intentional |
| R10 | Error handling | 🟢 NÍZKA | NÍZKA | ⚠️ Čiastočne |

---

## 🎯 ODORÚČANIA PODĽA PRIORITY

### 🔴 OKAMŽITÉ (Pre produkciu)

1. **Pridať `transaction.atomic()` do všetkých write operácií**
   - Skills (create, update, delete)
   - Skill Requests (create, update)
   - Reviews (create, update, delete)
   - Profile updates
   - OAuth user creation

2. **Opraviť race condition v skill limit check**
   - Použiť `select_for_update()` alebo database constraint

### 🟡 VYSOKÁ PRIORITA (Do 1 týždňa)

3. **Pridať audit logging do všetkých write operácií**
   - Použiť `AuditLog.log_data_change()` pre všetky CREATE/UPDATE/DELETE

4. **Opraviť OAuth user creation**
   - Zabaliť do transakcie s rollback mechanizmom

5. **Pridať explicitné `SESSION_COOKIE_SAMESITE` nastavenie**

### 🟡 STREDNÁ PRIORITA (Do 1 mesiaca)

6. **Pridať rate limiting na password reset**
7. **Skontrolovať a doplniť IDOR ochranu v edge cases**
8. **Pridať explicitné error handling**

---

## 🔍 ÚTOČNÍCKE SCENÁRE (Penetration Testing)

### Scenár 1: Race Condition Exploit
**Útočník:** Vysiela 10 súčasných requestov na vytvorenie skill karty  
**Očakávaný výsledok:** Max 3 karty  
**Skutočný výsledok:** ⚠️ Môže vytvoriť viac ako 3 karty (R3)

### Scenár 2: IDOR Attack
**Útočník:** Pokúša sa upraviť cudziu skill kartu cez `PATCH /api/auth/skills/123/`  
**Očakávaný výsledok:** 403/404 Forbidden  
**Skutočný výsledok:** ✅ 404 Not Found (dobrá ochrana)

### Scenár 3: Transaction Rollback Exploit
**Útočník:** Vysiela request, ktorý zlyhá v polovici (napr. email sending)  
**Očakávaný výsledok:** Všetky zmeny sa vrátia späť  
**Skutočný výsledok:** ⚠️ Môže zostať nekonzistentný stav (R1)

### Scenár 4: Audit Trail Bypass
**Útočník:** Vykonáva neoprávnené zmeny  
**Očakávaný výsledok:** Všetky zmeny sú auditované  
**Skutočný výsledok:** ⚠️ Nie všetky zmeny sú auditované (R2)

---

## ✅ POZITÍVNE ASPEKTY

1. **Výborná základná architektúra:** Zero Trust princípy sú implementované
2. **Dobrá IDOR ochrana:** Väčšina endpoints má explicitnú kontrolu vlastníctva
3. **Komplexná validácia:** SecurityValidator pokrýva SQL injection a XSS
4. **Rate limiting:** Dobré pokrytie kritických endpoints
5. **Security headers:** Všetky hlavné security headers sú nastavené
6. **Audit logging framework:** Dobrý základ, len treba používať konzistentne

---

## 📝 ZÁVER

Aplikácia má **solídnu bezpečnostnú základňu**, ale **kritické medzery v transakčnom spracovaní** môžu viesť k nekonzistentnému stavu dát a bezpečnostným rizikám. **Odporúčané okamžité opatrenia** pred nasadením do produkcie:

1. ✅ Pridať transakcie do všetkých write operácií
2. ✅ Opraviť race conditions
3. ✅ Pridať audit logging konzistentne
4. ✅ Explicitne nastaviť SESSION_COOKIE_SAMESITE

**Celkové hodnotenie:** 🟡 **STREDNÉ RIZIKO** → Po opravách: 🟢 **NÍZKE RIZIKO**

---

**Následný audit:** Po implementácii oprav odporúčaný re-audit.
